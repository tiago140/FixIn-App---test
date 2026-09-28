import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const { nome, rg, cpf, telefone } = await req.json();
  if (!nome) return NextResponse.json({ error: 'informe o nome' }, { status: 400 });
  const { error } = await supabase.from('prestadores').insert({ nome, rg, cpf, telefone });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
