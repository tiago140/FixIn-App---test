import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { gerarPdfOrcamento } from '@/lib/gerarPdfOrcamento';
import { enviarEmailOrcamentoPronto } from '@/lib/email';
import { destinatariosDoOrcamento } from '@/lib/destinatarios';
import { nomeArquivoPdf, nomeSeguroStorage } from '@/lib/nomeArquivo';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const id = params.id;

  const { data: orcamento, error: erroOrc } = await supabase
    .from('orcamentos')
    .select('*, clientes(nome_empresa, email)')
    .eq('id', id)
    .single();

  if (erroOrc || !orcamento) {
    return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });
  }

  const { data: itens } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id).order('ordem');

  let pdfBuffer;
  try {
    pdfBuffer = await gerarPdfOrcamento(orcamento, orcamento.clientes, itens || []);
  } catch (e) {
    return NextResponse.json({ error: 'erro ao gerar PDF: ' + e.message }, { status: 500 });
  }

  // Nome do arquivo: Imobiliária - Endereço completo - ORC-0000.pdf (o de e-mail leva acentos; o do armazenamento é só ASCII)
  const nomeArquivo = nomeArquivoPdf({ imobiliaria: orcamento.clientes?.nome_empresa, endereco: orcamento.endereco, numero: orcamento.numero });
  const caminhoArquivo = `${id}/${nomeSeguroStorage(nomeArquivo)}`;
  const caminhoAntigo = `${id}/${orcamento.numero}.pdf`;
  const { error: erroUpload } = await supabase.storage
    .from('orcamentos-pdfs')
    .upload(caminhoArquivo, pdfBuffer, { contentType: 'application/pdf', upsert: true, cacheControl: '0' });

  if (erroUpload) {
    return NextResponse.json({ error: 'erro ao salvar PDF: ' + erroUpload.message }, { status: 500 });
  }

  // tira a versão antiga (nome só com o número) para não ficar PDF duplicado
  if (caminhoAntigo !== caminhoArquivo) { try { await supabase.storage.from('orcamentos-pdfs').remove([caminhoAntigo]); } catch (e) {} }
  const { data: urlData } = supabase.storage.from('orcamentos-pdfs').getPublicUrl(caminhoArquivo);
  // ?v= evita o navegador/CDN mostrar uma versão ANTIGA do PDF (o nome do arquivo é sempre o mesmo para o mesmo orçamento)
  const pdfUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  await supabase.from('orcamentos').update({ pdf_url: pdfUrl, atualizado_em: new Date().toISOString() }).eq('id', id);

  // "Gerar PDF" (?enviar=0): salva o PDF e passa o orçamento para "Enviado", que é quando ele aparece para a imobiliária
  // aprovar ou recusar. NÃO manda e-mail: o e-mail é um passo separado ("Enviar por e-mail").
  // Só sai de Pendente/Em preparação; orçamento que já está adiante (ex.: Aprovado) mantém a etapa.
  let soGerar = false;
  try { soGerar = new URL(req.url).searchParams.get('enviar') === '0'; } catch (e) {}
  if (soGerar) {
    let statusNovo = null;
    // ?manter=1 (usado ao CRIAR o orçamento): gera o PDF mas deixa a etapa como está — ainda pode faltar preencher valores
    const manter = new URL(req.url).searchParams.get('manter') === '1';
    if (!manter && ['pendente', 'em_preparacao'].includes(orcamento.status)) {
      const { error: erroStatus } = await supabase.from('orcamentos').update({ status: 'enviado', atualizado_em: new Date().toISOString() }).eq('id', id);
      if (!erroStatus) statusNovo = 'enviado';
    }
    try {
      await supabase.from('auditoria').insert({
        acao: 'Gerou PDF do orçamento (sem e-mail)', detalhe: `${orcamento.numero}${statusNovo ? ' — passou para Enviado (liberado para a imobiliária aprovar)' : ''}`, alvo_tipo: 'orcamento', alvo_id: id,
        autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
      });
    } catch (e) {}
    return NextResponse.json({ ok: true, pdf_url: pdfUrl, email: null, status_novo: statusNovo, so_pdf: true, nome_arquivo: nomeArquivo });
  }

  // Quem recebe: o administrador da imobiliária (todos os orçamentos) + quem solicitou este orçamento.
  const destino = await destinatariosDoOrcamento(supabase, id);
  const resultadoEmail = await enviarEmailOrcamentoPronto({
    paraEmail: destino.emails,
    nomeImobiliaria: orcamento.clientes?.nome_empresa,
    numero: orcamento.numero,
    endereco: orcamento.endereco,
    linkPdf: pdfUrl,
    pdfBuffer,
    nomeArquivo,
  });

  // Enviar = o orçamento passa para "Enviado" sozinho (Kanban, Controle e painel da imobiliária acompanham o status),
  // mesmo que o e-mail falhe: o PDF e o valor já ficam visíveis para a imobiliária no sistema.
  let statusNovo = null;
  if (['pendente', 'em_preparacao'].includes(orcamento.status)) {
    const { error: erroStatus } = await supabase.from('orcamentos').update({ status: 'enviado', atualizado_em: new Date().toISOString() }).eq('id', id);
    if (!erroStatus) statusNovo = 'enviado';
  }

  try {
    await supabase.from('auditoria').insert({
      acao: 'Enviou orçamento (PDF e e-mail)',
      detalhe: `${orcamento.numero}: ${resultadoEmail.enviado ? `e-mail enviado para ${resultadoEmail.para.join(', ')}` : `PDF gerado, e-mail NÃO enviado (${resultadoEmail.motivo})`}${statusNovo ? ' — passou para Enviado' : ''}`,
      alvo_tipo: 'orcamento', alvo_id: id,
      autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
    });
  } catch (e) {}

  return NextResponse.json({ ok: true, pdf_url: pdfUrl, email: resultadoEmail, status_novo: statusNovo });
}
