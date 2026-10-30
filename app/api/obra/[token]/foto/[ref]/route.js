import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET_OS } from '@/lib/ordensArquivos';
import { caminhoDaFoto } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';

// Foto do link externo do locador: confere o link e só libera o que é público.
export async function GET(_req, { params }) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(params.token || ''))) return new NextResponse('não encontrado', { status: 404 });
  const admin = createAdminClient();
  const { data: a } = await admin.from('acompanhamentos').select('id, orcamento_id, etapa').eq('token', params.token).eq('link_ativo', true).maybeSingle();
  if (!a) return new NextResponse('não encontrado', { status: 404 });
  const path = await caminhoDaFoto(a, params.ref, { equipe: false }, admin);
  if (!path) return new NextResponse('não encontrado', { status: 404 });
  const { data } = await admin.storage.from(BUCKET_OS).createSignedUrl(path, 300);
  if (!data?.signedUrl) return new NextResponse('não encontrado', { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
