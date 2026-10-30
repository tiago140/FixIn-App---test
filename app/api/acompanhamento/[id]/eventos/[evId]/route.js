import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { removerArquivo } from '@/lib/ordensArquivos';
import { UUID } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';

// Equipe: apaga um lançamento (foto ou anotação) ou muda a legenda/visibilidade. Registros de etapa ficam no histórico.
export async function DELETE(_req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (!UUID.test(params.id) || !UUID.test(params.evId)) return NextResponse.json({ error: 'inválido' }, { status: 400 });
  const admin = createAdminClient();
  const { data: e } = await admin.from('acompanhamento_eventos').select('id, tipo, path').eq('id', params.evId).eq('acompanhamento_id', params.id).maybeSingle();
  if (!e) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  if (e.tipo === 'etapa') return NextResponse.json({ error: 'Mudanças de etapa ficam no histórico.' }, { status: 400 });
  await admin.from('acompanhamento_eventos').delete().eq('id', e.id);
  if (e.path) await removerArquivo(e.path);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (!UUID.test(params.id) || !UUID.test(params.evId)) return NextResponse.json({ error: 'inválido' }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const upd = {};
  if (typeof b.publico === 'boolean') upd.publico = b.publico;
  if (typeof b.legenda === 'string') upd.legenda = b.legenda.trim().slice(0, 200) || null;
  if (!Object.keys(upd).length) return NextResponse.json({ error: 'nada para mudar' }, { status: 400 });
  await createAdminClient().from('acompanhamento_eventos').update(upd).eq('id', params.evId).eq('acompanhamento_id', params.id);
  return NextResponse.json({ ok: true });
}
