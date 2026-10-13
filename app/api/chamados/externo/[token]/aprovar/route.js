import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/chamados';
import { avisarImobiliariaChamado } from '@/lib/chamadosEmail';
import { liberarOrdensDoOrcamento } from '@/lib/ordens';

export const runtime = 'nodejs';

// O solicitante aprova ou recusa o orçamento ligado ao chamado, pelo link único.
export async function POST(req, { params }) {
  const { decisao } = await req.json().catch(() => ({}));
  if (!['aprovado', 'rejeitado'].includes(decisao)) return NextResponse.json({ error: 'Decisão inválida.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: ch } = await admin.from('chamados').select('*').eq('token_hash', hashToken(params.token)).maybeSingle();
  if (!ch || !ch.orcamento_id) return NextResponse.json({ error: 'Não há orçamento para responder.' }, { status: 404 });
  if (ch.aprovado_externo_em) return NextResponse.json({ error: 'Este orçamento já foi respondido.' }, { status: 409 });

  const { data: o } = await admin.from('orcamentos').select('id, numero, status').eq('id', ch.orcamento_id).single();
  if (!o || o.status !== 'enviado') return NextResponse.json({ error: 'Este orçamento não está aguardando resposta.' }, { status: 409 });

  const agora = new Date().toISOString();
  const quem = `${ch.solicitante_nome} (${ch.solicitante_tipo === 'locador' ? 'locador' : 'locatário'}, pelo chamado ${ch.numero})`;
  const campos = { status: decisao, atualizado_em: agora };
  if (decisao === 'aprovado') { campos.aprovado_em = agora; campos.aprovado_por_nome = quem; }
  const { error } = await admin.from('orcamentos').update(campos).eq('id', o.id).eq('status', 'enviado');
  if (error) return NextResponse.json({ error: 'Não foi possível registrar agora.' }, { status: 500 });

  await admin.from('chamados').update({ status: decisao === 'aprovado' ? 'aprovado' : 'em_analise', aprovado_externo_nome: ch.solicitante_nome, aprovado_externo_em: agora, atualizado_em: agora }).eq('id', ch.id);
  await admin.from('chamado_mensagens').insert({ chamado_id: ch.id, autor_tipo: 'externo', autor_nome: ch.solicitante_nome, texto: decisao === 'aprovado' ? `✔ Aprovei o orçamento ${o.numero}.` : `✖ Recusei o orçamento ${o.numero}.` });
  try { await admin.from('auditoria').insert({ acao: decisao === 'aprovado' ? 'Orçamento aprovado pelo solicitante (chamado)' : 'Orçamento recusado pelo solicitante (chamado)', detalhe: `${o.numero} · ${quem}`, alvo_tipo: 'orcamento', alvo_id: o.id, autor_nome: ch.solicitante_nome, autor_role: 'externo' }); } catch (e) {}
  // aprovado pelo link: libera a ordem para o prestador, igual à aprovação dentro do sistema
  if (decisao === 'aprovado') await liberarOrdensDoOrcamento(o.id);
  await avisarImobiliariaChamado(admin, ch, decisao === 'aprovado' ? 'aprovado' : 'recusado');
  return NextResponse.json({ ok: true });
}
