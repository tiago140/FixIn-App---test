import { avisarSolicitante } from '@/lib/chamadosEmail';
import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { acessoChamado, STATUS_CHAMADO, PRIORIDADES, BUCKET_CHAMADOS } from '@/lib/chamados';

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
    await avisarSolicitante(admin, a.chamado, 'status', { status: campos.status });
  }
  return NextResponse.json({ ok: true });
}

// Excluir: só o dono (login master com a marca "dono"). Apaga mensagens, fotos e o chamado.
export async function DELETE(req, { params }) {
  const a = await acessoChamado(getProfile, params.id);
  if (a.erro) return NextResponse.json({ error: a.erro }, { status: a.status });
  if (a.profile.role !== 'master' || !a.profile.dono) return NextResponse.json({ error: 'Só o dono pode excluir chamados.' }, { status: 403 });
  const admin = createAdminClient();
  const { data: msgs } = await admin.from('chamado_mensagens').select('anexo_path').eq('chamado_id', a.chamado.id);
  const caminhos = (msgs || []).map((m) => m.anexo_path).filter(Boolean);
  if (caminhos.length) await admin.storage.from(BUCKET_CHAMADOS).remove(caminhos);
  await admin.from('chamado_mensagens').delete().eq('chamado_id', a.chamado.id);
  const { error } = await admin.from('chamados').delete().eq('id', a.chamado.id);
  if (error) return NextResponse.json({ error: 'Não foi possível excluir (' + error.message + ').' }, { status: 500 });
  try { await admin.from('auditoria').insert({ acao: 'Chamado excluído', detalhe: `Chamado ${a.chamado.numero || a.chamado.id}`, alvo_tipo: 'chamado', autor_nome: a.profile.nome_completo || 'Dono', autor_role: 'master' }); } catch (e) {}
  return NextResponse.json({ ok: true });
}
