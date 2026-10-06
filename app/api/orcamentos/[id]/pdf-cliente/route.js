import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { gerarPdfOrcamento } from '@/lib/gerarPdfOrcamento';
import { nomeArquivoPdf, nomeSeguroStorage } from '@/lib/nomeArquivo';
import { veValores } from '@/lib/permissoes';

export const runtime = 'nodejs';

// A imobiliária precisa do PDF para imprimir e repassar ao locador/locatário.
// Se o orçamento já foi liberado (Enviado em diante) mas ainda não tem PDF, este endpoint gera na hora.
// Não muda status, não manda e-mail. Só quem enxerga os valores deste orçamento pode usar.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || !profile || profile.role === 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  // autorização pela visão protegida (RLS: só orçamentos da própria imobiliária)
  const { data: visivel } = await supabase.from('orcamentos_cliente').select('id, status, total, pdf_url').eq('id', params.id).single();
  if (!visivel) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });
  if (!veValores(profile) && visivel.total == null) return NextResponse.json({ error: 'sem permissão para ver valores deste orçamento' }, { status: 403 });
  if (!['enviado', 'aprovado', 'em_execucao', 'finalizado', 'rejeitado'].includes(visivel.status)) {
    return NextResponse.json({ error: 'orçamento ainda em preparação' }, { status: 409 });
  }
  if (visivel.pdf_url) return NextResponse.json({ ok: true, pdf_url: visivel.pdf_url });

  const admin = createAdminClient();
  const { data: orcamento } = await admin.from('orcamentos').select('*, clientes(nome_empresa, email)').eq('id', params.id).single();
  if (!orcamento) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });
  const { data: itens } = await admin.from('orcamento_itens').select('*').eq('orcamento_id', params.id).order('ordem');

  let buf;
  try { buf = await gerarPdfOrcamento(orcamento, orcamento.clientes, itens || []); }
  catch (e) { return NextResponse.json({ error: 'erro ao gerar PDF: ' + e.message }, { status: 500 }); }

  const nome = nomeArquivoPdf({ imobiliaria: orcamento.clientes?.nome_empresa, endereco: orcamento.endereco, numero: orcamento.numero });
  const caminho = `${params.id}/${nomeSeguroStorage(nome)}`;
  const { error: erroUp } = await admin.storage.from('orcamentos-pdfs').upload(caminho, buf, { contentType: 'application/pdf', upsert: true, cacheControl: '0' });
  if (erroUp) return NextResponse.json({ error: 'erro ao salvar PDF: ' + erroUp.message }, { status: 500 });
  const { data: u } = admin.storage.from('orcamentos-pdfs').getPublicUrl(caminho);
  const pdfUrl = `${u.publicUrl}?v=${Date.now()}`;
  await admin.from('orcamentos').update({ pdf_url: pdfUrl }).eq('id', params.id);
  return NextResponse.json({ ok: true, pdf_url: pdfUrl, nome_arquivo: nome });
}
