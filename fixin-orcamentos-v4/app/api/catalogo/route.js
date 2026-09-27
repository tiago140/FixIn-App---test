import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const { ambiente, servico, mo_padrao, ma_padrao } = await req.json();
  if (!ambiente || !servico) {
    return NextResponse.json({ error: 'preencha ambiente e serviço' }, { status: 400 });
  }
  const { error } = await supabase.from('catalogo_itens').insert({
    ambiente,
    servico,
    mo_padrao: Number(mo_padrao) || 0,
    ma_padrao: Number(ma_padrao) || 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
