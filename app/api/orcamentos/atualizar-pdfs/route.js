import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { gerarPdfOrcamento } from '@/lib/gerarPdfOrcamento';
import { urlArquivo } from '@/lib/arquivos';
import { nomeArquivoPdf, nomeSeguroStorage } from '@/lib/nomeArquivo';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Refaz os PDFs guardados antes do QR de pagamento (marca "pg=3" na URL). Só o dono. Lotes pequenos: o botão repete até acabar.
export async function POST() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const admin = createAdminClient();
  const base = () => admin.from('orcamentos').select('id', { count: 'exact', head: true }).in('status', ['enviado', 'aprovado', 'em_execucao', 'finalizado']).not('pdf_url', 'is', null).not('pagar_token', 'is', null).not('pdf_url', 'like', '%pg=3%');
  const { data: lote } = await admin.from('orcamentos').select('id').in('status', ['enviado', 'aprovado', 'em_execucao', 'finalizado']).not('pdf_url', 'is', null).not('pagar_token', 'is', null).not('pdf_url', 'like', '%pg=3%').limit(6);
  let feitos = 0, erros = 0;
  for (const { id } of lote || []) {
    try {
      const { data: o } = await admin.from('orcamentos').select('*, clientes(nome_empresa, email, pagamento_provedor)').eq('id', id).single();
      const { data: itens } = await admin.from('orcamento_itens').select('*').eq('orcamento_id', id).order('ordem');
      const buf = await gerarPdfOrcamento(o, o.clientes, itens || []);
      const nome = nomeArquivoPdf({ imobiliaria: o.clientes?.nome_empresa, endereco: o.endereco, numero: o.numero });
      const caminho = `${id}/${nomeSeguroStorage(nome)}`;
      const { error } = await admin.storage.from('orcamentos-pdfs').upload(caminho, buf, { contentType: 'application/pdf', upsert: true, cacheControl: '0' });
      if (error) throw error;
      await admin.from('orcamentos').update({ pdf_url: `${urlArquivo('orcamentos-pdfs', caminho)}?v=${Date.now()}&pg=3` }).eq('id', id);
      feitos++;
    } catch (e) { erros++; }
  }
  const { count } = await base();
  // se só sobraram erros, o botão para (evita repetir para sempre)
  return NextResponse.json({ ok: true, feitos, erros, restam: count || 0 });
}
