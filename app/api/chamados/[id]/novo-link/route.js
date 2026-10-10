import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { acessoChamado, novoToken, hashToken } from '@/lib/chamados';

// Gera um link novo para o solicitante (o antigo deixa de funcionar). Só aparece uma vez.
export async function POST(req, { params }) {
  const a = await acessoChamado(getProfile, params.id);
  if (a.erro) return NextResponse.json({ error: a.erro }, { status: a.status });
  const token = novoToken();
  const { error } = await createAdminClient().from('chamados').update({ token_hash: hashToken(token) }).eq('id', a.chamado.id);
  if (error) return NextResponse.json({ error: 'Não foi possível gerar o link.' }, { status: 500 });
  return NextResponse.json({ ok: true, token });
}
