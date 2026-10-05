import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { gerarPdfOrcamento } from '@/lib/gerarPdfOrcamento';
import { enviarEmailOrcamentoPronto } from '@/lib/email';
import { destinatariosDoOrcamento } from '@/lib/destinatarios';

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

  const caminhoArquivo = `${id}/${orcamento.numero}.pdf`;
  const { error: erroUpload } = await supabase.storage
    .from('orcamentos-pdfs')
    .upload(caminhoArquivo, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (erroUpload) {
    return NextResponse.json({ error: 'erro ao salvar PDF: ' + erroUpload.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('orcamentos-pdfs').getPublicUrl(caminhoArquivo);
  const pdfUrl = urlData.publicUrl;

  await supabase.from('orcamentos').update({ pdf_url: pdfUrl, atualizado_em: new Date().toISOString() }).eq('id', id);

  // Quem recebe: o administrador da imobiliária (todos os orçamentos) + quem solicitou este orçamento.
  const destino = await destinatariosDoOrcamento(supabase, id);
  const resultadoEmail = await enviarEmailOrcamentoPronto({
    paraEmail: destino.emails,
    nomeImobiliaria: orcamento.clientes?.nome_empresa,
    numero: orcamento.numero,
    endereco: orcamento.endereco,
    linkPdf: pdfUrl,
    pdfBuffer,
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
