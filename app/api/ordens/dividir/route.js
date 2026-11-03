import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { avisarPrestadorOS } from '@/lib/ordens';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const txt = (v, n) => String(v ?? '').trim().slice(0, n);

// Divide os itens de um orçamento entre vários prestadores: uma ordem de serviço separada para cada um,
// só com os itens que ele vai executar. Cada item vai para no máximo UM prestador.
// Corpo: { orcamento_id, divisao: [{ prestador_id, item_ids: [...], descricao }] }
export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!UUID.test(String(b.orcamento_id || ''))) return NextResponse.json({ error: 'orçamento inválido' }, { status: 400 });
  const grupos = Array.isArray(b.divisao) ? b.divisao : [];
  if (!grupos.length) return NextResponse.json({ error: 'Escolha pelo menos um prestador com itens.' }, { status: 400 });
  if (grupos.length > 8) return NextResponse.json({ error: 'No máximo 8 prestadores por divisão.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: o } = await admin.from('orcamentos').select('id, cliente_id, endereco, status, orcamento_itens(id, ambiente, servico, descricao, mo, ma, ordem)').eq('id', b.orcamento_id).maybeSingle();
  if (!o) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });
  const itens = new Map((o.orcamento_itens || []).map((i) => [i.id, i]));

  // valida tudo ANTES de criar qualquer ordem
  const usados = new Set(); const prestadoresUsados = new Set(); const plano = [];
  for (const g of grupos) {
    if (!UUID.test(String(g?.prestador_id || ''))) return NextResponse.json({ error: 'Prestador inválido.' }, { status: 400 });
    if (prestadoresUsados.has(g.prestador_id)) return NextResponse.json({ error: 'O mesmo prestador aparece duas vezes: junte os itens dele num grupo só.' }, { status: 400 });
    prestadoresUsados.add(g.prestador_id);
    const ids = [...new Set(Array.isArray(g.item_ids) ? g.item_ids : [])];
    if (!ids.length) return NextResponse.json({ error: 'Todo prestador precisa de pelo menos um item.' }, { status: 400 });
    for (const id of ids) {
      if (!itens.has(id)) return NextResponse.json({ error: 'Há item que não pertence a este orçamento.' }, { status: 400 });
      if (usados.has(id)) return NextResponse.json({ error: 'Um item não pode ir para dois prestadores.' }, { status: 400 });
      usados.add(id);
    }
    const { data: p } = await admin.from('prestadores').select('id, nome, ativo').eq('id', g.prestador_id).maybeSingle();
    if (!p || p.ativo === false) return NextResponse.json({ error: 'Prestador não encontrado ou inativo.' }, { status: 400 });
    plano.push({ p, ids, descricao: txt(g.descricao, 3000) });
  }

  const emExecucao = ['aprovado', 'em_execucao', 'finalizado'].includes(o.status);
  const statusInicial = emExecucao ? 'em_execucao' : 'aplicada';
  const criadas = [];
  for (const { p, ids, descricao } of plano) {
    const { data: os, error } = await admin.from('ordens_servico').insert({
      prestador_id: p.id, origem: 'orcamento', orcamento_id: o.id, cliente_id: o.cliente_id, endereco: o.endereco,
      descricao: descricao || null, status: statusInicial, criado_por: user.id,
      liberado_em: emExecucao ? new Date().toISOString() : null,
    }).select().single();
    if (error) return NextResponse.json({ error: `Criei ${criadas.length} ordem(ns) e parei em ${p.nome}: ${error.message}`, criadas }, { status: 400 });
    const lista = ids.map((id) => itens.get(id)).sort((x, y) => (x.ordem || 0) - (y.ordem || 0));
    await admin.from('os_itens').insert(lista.map((i, n) => ({ os_id: os.id, ambiente: i.ambiente || '', servico: i.servico, descricao: i.descricao || null, mo: i.mo || 0, ma: i.ma || 0, ordem: n })));
    try {
      await admin.from('auditoria').insert({ acao: 'Criou ordem de serviço', detalhe: `${os.numero} · ${p.nome} · ${o.endereco} · ${ids.length} item(ns) (divisão do orçamento)`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role });
    } catch (e) {}
    await avisarPrestadorOS(os, emExecucao ? 'liberada' : 'nova');
    criadas.push({ id: os.id, numero: os.numero, prestador: p.nome, itens: ids.length });
  }
  return NextResponse.json({ ok: true, criadas });
}
