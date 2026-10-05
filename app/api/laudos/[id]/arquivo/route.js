import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET } from '@/lib/laudos';

// Entrega foto ou PDF do laudo por LINK TEMPORÁRIO (5 min). A permissão é conferida pelo banco:
// o dono vê todos; a imobiliária só os laudos PUBLICADOS dela. Fora disso: 404, sem revelar que existe.
export async function GET(req, { params }) {
  const { user, supabase } = await getProfile();
  if (!user) return NextResponse.json({ error: 'sem permissão' }, { status: 401 });
  const { data: laudo } = await supabase.from('laudos').select('id, fotos, pdf_path').eq('id', params.id).maybeSingle();
  if (!laudo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  const url = new URL(req.url);
  const caminho = url.searchParams.get('tipo') === 'pdf' ? laudo.pdf_path : (laudo.fotos || []).find((f) => f.id === url.searchParams.get('foto'))?.path;
  if (!caminho) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrl(caminho, 300);
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  const resposta = NextResponse.redirect(data.signedUrl, 302);
  resposta.headers.set('Cache-Control', 'private, max-age=240');
  return resposta;
}
