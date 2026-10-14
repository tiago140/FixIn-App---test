import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { ehLaudoMov, parseVistoriaTexto, extrairEnderecoVistoria, itensParaConferir, resumoLeituraVistoria } from '@/lib/parseVistoria';

export const runtime = 'nodejs';

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

  const lidos = parseVistoriaTexto(texto);
  const endereco = extrairEnderecoVistoria(texto);
  // o que o leitor não conseguiu encaixar NÃO some: volta como item "A CONFERIR"
  const itens = [...lidos, ...itensParaConferir(lidos)];

  return NextResponse.json({
    itens,
    endereco,
    resumo: resumoLeituraVistoria(lidos),
    diagnostico: lidos.diagnostico,
    texto_bruto: texto,
    total_itens_encontrados: lidos.length,
  });
}

