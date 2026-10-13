import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET_OS } from '@/lib/ordensArquivos';

export const dynamic = 'force-dynamic';

// Foto da linha do tempo pública: confere o link e só libera fotos de início/execução (e final, depois de aprovado).
export async function GET(_req, { params }) {
  const { token, id } = params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(token || ''))) return new NextResponse('não encontrado', { status: 404 });
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('id, status').eq('token_acompanhamento', token).eq('acompanhamento_ativo', true).maybeSingle();
  if (!os) return new NextResponse('não encontrado', { status: 404 });
  const { data: f } = await admin.from('os_fotos').select('path, tipo').eq('id', id).eq('os_id', os.id).maybeSingle();
  if (!f || f.tipo === 'reprovacao') return new NextResponse('não encontrado', { status: 404 });
  if (f.tipo === 'depois' && !['aprovada', 'paga'].includes(os.status)) return new NextResponse('não encontrado', { status: 404 });
  const { data } = await admin.storage.from(BUCKET_OS).createSignedUrl(f.path, 300);
  if (!data?.signedUrl) return new NextResponse('não encontrado', { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
