import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { gerarPdfOrcamento } from '@/lib/gerarPdfOrcamento';
import { enviarEmailOrcamentoPronto } from '@/lib/email';

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

  const resultadoEmail = await enviarEmailOrcamentoPronto({
    paraEmail: orcamento.clientes?.email,
    nomeImobiliaria: orcamento.clientes?.nome_empresa,
    numero: orcamento.numero,
    endereco: orcamento.endereco,
    linkPdf: pdfUrl,
  });

  return NextResponse.json({ ok: true, pdf_url: pdfUrl, email: resultadoEmail });
}
