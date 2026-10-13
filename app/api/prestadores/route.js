import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { limparCadastro } from '@/lib/prestadores';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const dados = limparCadastro(await req.json());
  if (!dados.nome) return NextResponse.json({ error: 'informe o nome' }, { status: 400 });
  const { data, error } = await supabase.from('prestadores').insert(dados).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
