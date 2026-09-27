import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { status, prestador_id } = await req.json();
  const id = params.id;

  if (profile.role === 'master') {
    const patch = { atualizado_em: new Date().toISOString() };
    if (status) patch.status = status;
    if (prestador_id !== undefined) patch.prestador_id = prestador_id || null;
    const { error } = await supabase.from('visitas').update(patch).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // imobiliária só pode cancelar a própria visita, e só se ainda estiver pendente
  if (status !== 'cancelada') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const { error } = await supabase.rpc('cancelar_visita_propria', { p_visita_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
