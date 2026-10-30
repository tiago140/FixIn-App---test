import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { garantirAcompanhamento, UUID } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';

// A equipe abre o acompanhamento de um orçamento (a obra começou).
export async function POST(_req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (!UUID.test(params.orcamentoId)) return NextResponse.json({ error: 'orçamento inválido' }, { status: 400 });
  const { data: o } = await supabase.from('orcamentos').select('id').eq('id', params.orcamentoId).maybeSingle();
  if (!o) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });
  const a = await garantirAcompanhamento(o.id);
  if (!a) return NextResponse.json({ error: 'Não foi possível abrir o acompanhamento.' }, { status: 500 });
  return NextResponse.json({ ok: true, id: a.id });
}
