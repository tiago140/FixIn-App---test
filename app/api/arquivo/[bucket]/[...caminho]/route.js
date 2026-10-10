import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKETS_PRIVADOS } from '@/lib/arquivos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Abre um arquivo privado de um orçamento. Quem pode: o dono (tudo) e a imobiliária dona do orçamento.
// O "Orçamento 2" (outra empresa, +30%) é só do dono.
export async function GET(req, { params }) {
  const { bucket } = params;
  const caminho = (params.caminho || []).map((p) => decodeURIComponent(p)).join('/');
  if (!BUCKETS_PRIVADOS.includes(bucket) || !caminho || caminho.includes('..')) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  const { user, profile, supabase } = await getProfile();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const orcamentoId = caminho.split('/')[0];
  if (!UUID.test(orcamentoId)) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  if (profile.role !== 'master') {
    if (profile.role !== 'imobiliaria') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
    if (bucket === 'orcamentos-pdfs' && /orcamento[ _-]?2/i.test(caminho)) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
    const { data: visivel } = await supabase.from('orcamentos_cliente').select('id').eq('id', orcamentoId).maybeSingle();
    if (!visivel) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const admin = createAdminClient();
  // PDFs de orçamento são entregues direto (a tela precisa baixar o arquivo para imprimir); o resto vai por link temporário.
  if (bucket === 'orcamentos-pdfs') {
    const { data: arq, error: erroDown } = await admin.storage.from(bucket).download(caminho);
    if (erroDown || !arq) return NextResponse.json({ error: 'arquivo não encontrado' }, { status: 404 });
    const nome = caminho.split('/').pop().normalize('NFD').replace(/[^\x20-\x7E]/g, '-');
    return new NextResponse(Buffer.from(await arq.arrayBuffer()), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nome}"`, 'Cache-Control': 'private, no-store' } });
  }
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(caminho, 120);
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'arquivo não encontrado' }, { status: 404 });
  const r = NextResponse.redirect(data.signedUrl, 302);
  r.headers.set('Cache-Control', 'no-store');
  return r;
}
