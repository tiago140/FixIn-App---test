import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { avisarPrestadorOS } from '@/lib/ordens';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const texto = String((await req.json().catch(() => ({}))).texto || '').trim().slice(0, 1000);
  if (!texto) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*').eq('id', params.id).maybeSingle();
  if (!os) return NextResponse.json({ error: 'ordem não encontrada' }, { status: 404 });
  const { error } = await admin.from('os_mensagens').insert({ os_id: os.id, lado: 'equipe', autor_nome: profile.nome_completo, texto });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await avisarPrestadorOS(os, 'mensagem', texto);
  return NextResponse.json({ ok: true });
}
