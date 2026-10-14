import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { classificarPendencias, contarPorAcao } from '@/lib/classificarPendencia';
import { lerVistoriaComIA, lerVistoriaPdfComIA } from '@/lib/lerVistoriaIA';
import { ehLaudoMov, parseVistoriaTexto, extrairEnderecoVistoria, itensParaConferir, resumoLeituraVistoria } from '@/lib/parseVistoria';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Lê cada página juntando os pedaços de texto COM espaço e quebrando a linha quando a posição vertical muda.
// (o leitor padrão do pdf-parse cola as colunas de uma tabela: "ParedesPintura nova…")
function renderPage(pageData) {
  return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false }).then((content) => {
    const linhas = [];
    let ultimaY = null;
    let atual = '';
    content.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      if (ultimaY !== null && Math.abs(y - ultimaY) > 2) {
        linhas.push(atual.trim());
        atual = '';
      }
      atual += item.str + ' ';
      ultimaY = y;
    });
    if (atual.trim()) linhas.push(atual.trim());
    return linhas.join('\n');
  });
}

// Variante para laudos do Word/MOV: os pedaços de texto do PDF vêm quebrados no meio das palavras ("pintado s").
// Aqui só coloca espaço quando existe um vão de verdade entre um pedaço e o seguinte.
function renderPageColado(pageData) {
  return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false }).then((content) => {
    const linhas = [];
    let ultimaY = null;
    let fimX = null;
    let atual = '';
    content.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (ultimaY !== null && Math.abs(y - ultimaY) > 2) {
        linhas.push(atual.trim());
        atual = '';
        fimX = null;
      }
      const tam = Math.abs(item.transform[0]) || 10;
      const vao = fimX === null ? 99 : x - fimX;
      if (atual && vao > tam * 0.18 && !/\s$/.test(atual) && !/^\s/.test(item.str)) atual += ' ';
      atual += item.str;
      fimX = x + (item.width || 0);
      ultimaY = y;
    });
    if (atual.trim()) linhas.push(atual.trim());
    return linhas.join('\n');
  });
}

export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || (profile?.role !== 'master' && profile?.role !== 'imobiliaria')) {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('arquivo');
  if (!file) {
    return NextResponse.json({ error: 'nenhum arquivo enviado' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let texto = '';
  try {
    // import dinâmico evita o pdf-parse tentar rodar seu modo de teste no import estático
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const resultado = await pdfParse(buffer, { pagerender: renderPage });
    texto = resultado.text || '';
    if (ehLaudoMov(texto)) {
      const colado = await pdfParse(buffer, { pagerender: renderPageColado });
      if (colado.text && ehLaudoMov(colado.text)) texto = colado.text;
    }
  } catch (e) {
    return NextResponse.json({ error: 'não foi possível ler este PDF: ' + e.message }, { status: 400 });
  }

  let lidos = parseVistoriaTexto(texto);
  let endereco = extrairEnderecoVistoria(texto);

  const admin = createAdminClient();
  const clienteId = String(formData.get('cliente_id') || profile.cliente_id || '') || null;
  const eLaudoMov = ehLaudoMov(texto);

  // Regras de classificação aprendidas (banco). Se a tabela ainda não existe, vale o conjunto padrão do código.
  let regras = null;
  try {
    const { data, error } = await admin.from('vistoria_regras').select('prioridade, padrao, acao, cliente_id, ativo').eq('ativo', true);
    if (!error && data && data.length) regras = data;
  } catch (e) { /* usa as regras padrão */ }

  // Leitura autônoma: os leitores de formato conhecido são o caminho rápido. Quando o arquivo é de um formato
  // que eles não conhecem (ou a leitura veio fraca), a IA lê a INFORMAÇÃO do documento, qualquer que seja o jeito dele.
  const diag0 = lidos.diagnostico || {};
  const naoLidas0 = (diag0.naoLidas || []).length;
  const semTexto = texto.replace(/\s+/g, '').length < 150;
  const fraco = !eLaudoMov && (lidos.length === 0 || !diag0.formato || naoLidas0 > Math.max(3, lidos.length * 0.2));
  const forcarIA = String(formData.get('modo') || '') === 'ia';
  let leituraIA = null;
  let avisoIA = '';
  if ((fraco || semTexto || forcarIA) && process.env.ANTHROPIC_API_KEY) {
    try {
      const r = semTexto ? await lerVistoriaPdfComIA({ buffer, regras }) : await lerVistoriaComIA({ texto, regras });
      if (r.itens.length > 0) leituraIA = r;
      else avisoIA = 'A IA também não encontrou pendências neste documento.';
    } catch (e) {
      avisoIA = 'Não consegui usar a leitura automática por IA agora: ' + (e?.message || 'erro desconhecido');
    }
  } else if (fraco || semTexto) {
    avisoIA = 'Este formato não é conhecido e a leitura por IA não está configurada (ANTHROPIC_API_KEY).';
  }

  let porAcao = null;
  if (leituraIA) {
    const diag = {
      formato: 'Leitura automática (IA) — confira os itens', naoLidas: [], lacunas: [],
      avisos: leituraIA.avisos || [], descartados: [], alteracoes: leituraIA.alteracoes || [], origem: 'ia',
    };
    lidos = leituraIA.itens;
    lidos.diagnostico = diag;
    if (!endereco && leituraIA.endereco) endereco = leituraIA.endereco;
    porAcao = contarPorAcao(lidos);
    lidos.diagnostico.porAcao = porAcao;
  } else if (eLaudoMov) {
    const diag = lidos.diagnostico;
    lidos = classificarPendencias(lidos, regras, clienteId);
    lidos.diagnostico = diag;
    porAcao = contarPorAcao(lidos);
    lidos.diagnostico.porAcao = porAcao;
  }
  if (avisoIA && lidos.diagnostico) lidos.diagnostico.avisos = [...(lidos.diagnostico.avisos || []), avisoIA];
  // o que o leitor não conseguiu encaixar NÃO some: volta como item "A CONFERIR"
  const itens = [...lidos, ...itensParaConferir(lidos)];

  // histórico de TODA importação (base para ajustar as regras); não impede a leitura se a tabela ainda não existir
  let importacao_id = null;
  try {
    const d = lidos.diagnostico || {};
    const { data: imp } = await admin.from('vistoria_importacoes').insert({
      cliente_id: clienteId, arquivo_nome: String(file.name || '').slice(0, 200), formato: d.formato || null,
      total_itens: lidos.length, total_a_conferir: (d.naoLidas || []).length, total_alteracoes: (d.alteracoes || []).length,
      por_acao: porAcao || {}, alteracoes_aprovacao: d.alteracoes || [], a_conferir: d.naoLidas || [], criado_por: user.id,
    }).select('id').single();
    importacao_id = imp?.id || null;
  } catch (e) { /* sem histórico, segue */ }

  return NextResponse.json({
    importacao_id,
    itens,
    endereco,
    resumo: resumoLeituraVistoria(lidos) + (lidos.diagnostico?.origem === 'ia' ? '\nℹ Formato não conhecido: li pelo conteúdo, não pelo layout. Revise antes de enviar.' : '') + (avisoIA && !leituraIA && !lidos.length ? '\n' + avisoIA : ''),
    diagnostico: lidos.diagnostico,
    texto_bruto: texto,
    total_itens_encontrados: lidos.length,
  });
}

