import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const body = await req.json();
  const { nome, email, cnpj, nome_empresa } = body;

  if (!nome_empresa) {
    return NextResponse.json({ error: 'nome da empresa é obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({ nome, email, cnpj, nome_empresa, criado_por: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cliente: data });
}
