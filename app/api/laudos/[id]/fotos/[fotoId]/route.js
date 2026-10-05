import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET } from '@/lib/laudos';

const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function DELETE(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return erro('sem permissão', 403);
  const { data: laudo } = await supabase.from('laudos').select('id, fotos').eq('id', params.id).maybeSingle();
  if (!laudo) return erro('laudo não encontrado', 404);
  const foto = (laudo.fotos || []).find((f) => f.id === params.fotoId);
  if (!foto) return erro('foto não encontrada', 404);
  const { error } = await supabase.from('laudos').update({ fotos: laudo.fotos.filter((f) => f.id !== foto.id), atualizado_em: new Date().toISOString() }).eq('id', laudo.id);
  if (error) return erro(error.message);
  await createAdminClient().storage.from(BUCKET).remove([foto.path]);
  return NextResponse.json({ ok: true });
}
