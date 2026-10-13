import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';

// O aparelho do prestador se inscreve (ou sai) das notificações.
async function quem() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return null;
  return { user, profile };
}

export async function POST(req) {
  const q = await quem();
  if (!q) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const s = b.subscription;
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth || !/^https:\/\//.test(s.endpoint)) return NextResponse.json({ error: 'inscrição inválida' }, { status: 400 });
  const { error } = await createAdminClient().from('push_subscriptions').upsert({
    user_id: q.user.id, prestador_id: q.profile.prestador_id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 200),
  }, { onConflict: 'endpoint' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const q = await quem();
  if (!q) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (b.endpoint) await createAdminClient().from('push_subscriptions').delete().eq('endpoint', b.endpoint).eq('prestador_id', q.profile.prestador_id);
  return NextResponse.json({ ok: true });
}
