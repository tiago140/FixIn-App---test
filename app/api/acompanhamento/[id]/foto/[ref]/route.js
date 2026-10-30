import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET_OS } from '@/lib/ordensArquivos';
import { caminhoDaFoto, UUID } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';

// Foto para a equipe e para a imobiliária logada (a regra de acesso da imobiliária é a do banco: só os orçamentos dela).
export async function GET(_req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || !UUID.test(params.id)) return new NextResponse('não encontrado', { status: 404 });
  const equipe = profile?.role === 'master';
  const { data: a } = await supabase.from('acompanhamentos').select('id, orcamento_id, etapa').eq('id', params.id).maybeSingle();
  if (!a) return new NextResponse('não encontrado', { status: 404 });
  const admin = createAdminClient();
  const path = await caminhoDaFoto(a, params.ref, { equipe }, admin);
  if (!path) return new NextResponse('não encontrado', { status: 404 });
  const { data } = await admin.storage.from(BUCKET_OS).createSignedUrl(path, 300);
  if (!data?.signedUrl) return new NextResponse('não encontrado', { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
