import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { enviarEmailTeste, statusEnvioEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Só o dono/equipe FixIn. Manda um e-mail de teste para o PRÓPRIO e-mail de quem clicou, para conferir a configuração.
export async function POST() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const para = profile.email || user.email;
  const r = await enviarEmailTeste({ para });
  return NextResponse.json({ ...r, configuracao: statusEnvioEmail() });
}
