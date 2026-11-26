import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';

// O app Android do prestador registra (ou remove) o token do Firebase.
export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const token = String(b.token || '');
  if (token.length < 50 || token.length > 400) return NextResponse.json({ error: 'token inválido' }, { status: 400 });
  const { error } = await createAdminClient().from('push_dispositivos').upsert({ token, user_id: user.id, prestador_id: profile.prestador_id, plataforma: 'android', atualizado_em: new Date().toISOString() }, { onConflict: 'token' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
