import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { acessoChamado, STATUS_CHAMADO, PRIORIDADES } from '@/lib/chamados';

export async function PATCH(req, { params }) {
  const a = await acessoChamado(getProfile, params.id);
  if (a.erro) return NextResponse.json({ error: a.erro }, { status: a.status });
  const body = await req.json().catch(() => ({}));
  const campos = { atualizado_em: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!STATUS_CHAMADO[body.status]) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    campos.status = body.status;
  }
  if (body.prioridade !== undefined) {
    if (!PRIORIDADES[body.prioridade]) return NextResponse.json({ error: 'Prioridade inválida.' }, { status: 400 });
    campos.prioridade = body.prioridade;
  }
  const admin = createAdminClient();
  const { error } = await admin.from('chamados').update(campos).eq('id', a.chamado.id);
  if (error) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 });
  if (campos.status && campos.status !== a.chamado.status) {
    await admin.from('chamado_mensagens').insert({ chamado_id: a.chamado.id, autor_tipo: 'sistema', autor_nome: 'Sistema', texto: `Status alterado para "${STATUS_CHAMADO[campos.status]}".` });
  }
  return NextResponse.json({ ok: true });
}
