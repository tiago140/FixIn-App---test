import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { gerarPdfOrcamento2 } from '@/lib/gerarPdfOrcamento2';
import { reescreverTextosItens } from '@/lib/reescreverItensIA';
import { nomeArquivoPdf, nomeSeguroStorage } from '@/lib/nomeArquivo';

export const runtime = 'nodejs';
export const maxDuration = 60;

// "Gerar segundo orçamento": só o dono, só quando clica. Não muda status, não manda e-mail e não aparece para a imobiliária.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const id = params.id;

  const { data: orcamento } = await supabase.from('orcamentos').select('*, clientes(nome_empresa, email)').eq('id', id).single();
  if (!orcamento) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });
  const { data: itensBanco } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id).order('ordem');
  if (!itensBanco || itensBanco.length === 0) return NextResponse.json({ error: 'O orçamento não tem itens.' }, { status: 400 });

  const { itens, ia } = await reescreverTextosItens(itensBanco);

  let pdf;
  try { pdf = await gerarPdfOrcamento2(orcamento, orcamento.clientes, itens); }
  catch (e) { return NextResponse.json({ error: 'erro ao gerar PDF: ' + e.message }, { status: 500 }); }

  const nome = nomeArquivoPdf({ imobiliaria: orcamento.clientes?.nome_empresa, endereco: orcamento.endereco, numero: orcamento.numero, sufixo: 'Orcamento 2' });
  const caminho = `${id}/${nomeSeguroStorage(nome)}`;
  const { error: erroUp } = await supabase.storage.from('orcamentos-pdfs').upload(caminho, pdf, { contentType: 'application/pdf', upsert: true, cacheControl: '0' });
  if (erroUp) return NextResponse.json({ error: 'erro ao salvar PDF: ' + erroUp.message }, { status: 500 });
  const { data: u } = supabase.storage.from('orcamentos-pdfs').getPublicUrl(caminho);
  const pdfUrl = `${u.publicUrl}?v=${Date.now()}`;
  await supabase.from('orcamentos').update({ pdf2_url: pdfUrl }).eq('id', id);

  try {
    await supabase.from('auditoria').insert({
      acao: 'Gerou Orçamento 2 (PDF)', detalhe: `${orcamento.numero} — +30% sobre o valor final (empresa 2)${ia ? ', textos reescritos pela IA' : ', textos originais (IA indisponível)'}`,
      alvo_tipo: 'orcamento', alvo_id: id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
    });
  } catch (e) {}
  return NextResponse.json({ ok: true, pdf_url: pdfUrl, ia, nome_arquivo: nome });
}
