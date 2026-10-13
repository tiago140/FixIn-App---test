import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { avisarPrestadorOS } from '@/lib/ordens';

const txt = (v, n) => String(v ?? '').trim().slice(0, n);

// Equipe FixIn cria uma ordem de serviço para um prestador, a partir de visita, chamado, orçamento ou avulsa.
export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const b = await req.json();
  const admin = createAdminClient();
  const origem = ['visita', 'chamado', 'orcamento', 'avulsa'].includes(b.origem) ? b.origem : 'avulsa';
  if (!b.prestador_id) return NextResponse.json({ error: 'escolha o prestador' }, { status: 400 });
  const { data: prest } = await admin.from('prestadores').select('id, nome, ativo').eq('id', b.prestador_id).maybeSingle();
  if (!prest || prest.ativo === false) return NextResponse.json({ error: 'prestador não encontrado ou inativo' }, { status: 400 });

  let cliente_id = b.cliente_id || null;
  let endereco = txt(b.endereco, 250);
  let descricao = txt(b.descricao, 3000);
  const ref = { visita_id: null, chamado_id: null, orcamento_id: null };
  let itensOrc = [];
  let statusInicial = 'enviada';

  if (origem === 'visita') {
    const { data: v } = await admin.from('visitas').select('id, cliente_id, endereco, observacoes').eq('id', b.visita_id).maybeSingle();
    if (!v) return NextResponse.json({ error: 'visita não encontrada' }, { status: 400 });
    ref.visita_id = v.id; cliente_id = cliente_id || v.cliente_id; endereco = endereco || v.endereco; descricao = descricao || v.observacoes || '';
  } else if (origem === 'chamado') {
    const { data: c } = await admin.from('chamados').select('id, cliente_id, endereco, titulo, descricao').eq('id', b.chamado_id).maybeSingle();
    if (!c) return NextResponse.json({ error: 'chamado não encontrado' }, { status: 400 });
    ref.chamado_id = c.id; cliente_id = cliente_id || c.cliente_id; endereco = endereco || c.endereco; descricao = descricao || `${c.titulo}\n${c.descricao || ''}`.trim();
  } else if (origem === 'orcamento') {
    const { data: o } = await admin.from('orcamentos').select('id, cliente_id, endereco, status, prestador_id, valor_combinado_prestador, orcamento_itens(ambiente, servico, descricao, mo, ma, ordem)').eq('id', b.orcamento_id).maybeSingle();
    if (!o) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 400 });
    ref.orcamento_id = o.id; cliente_id = cliente_id || o.cliente_id; endereco = endereco || o.endereco;
    itensOrc = (o.orcamento_itens || []).sort((x, y) => (x.ordem || 0) - (y.ordem || 0));
    statusInicial = ['aprovado', 'em_execucao', 'finalizado'].includes(o.status) ? 'em_execucao' : 'aplicada';
    const soma = itensOrc.reduce((s, i) => s + (Number(i.mo) || 0) + (Number(i.ma) || 0), 0);
    const ajuste = {};
    if (!o.prestador_id) ajuste.prestador_id = prest.id;
    if (!(Number(o.valor_combinado_prestador) > 0) && soma > 0) ajuste.valor_combinado_prestador = soma;
    if (Object.keys(ajuste).length) await admin.from('orcamentos').update(ajuste).eq('id', o.id);
  }
  if (!endereco) return NextResponse.json({ error: 'informe o endereço' }, { status: 400 });

  const { data: os, error } = await admin.from('ordens_servico').insert({
    prestador_id: prest.id, origem, ...ref, cliente_id, endereco, descricao: descricao || null,
    status: statusInicial, criado_por: user.id,
    liberado_em: statusInicial === 'em_execucao' ? new Date().toISOString() : null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (itensOrc.length) {
    await admin.from('os_itens').insert(itensOrc.map((i, n) => ({ os_id: os.id, ambiente: i.ambiente || '', servico: i.servico, descricao: i.descricao || null, mo: i.mo || 0, ma: i.ma || 0, ordem: n })));
  }
  try {
    await admin.from('auditoria').insert({ acao: 'Criou ordem de serviço', detalhe: `${os.numero} · ${prest.nome} · ${endereco}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role });
  } catch (e) {}
  await avisarPrestadorOS(os, statusInicial === 'em_execucao' ? 'liberada' : 'nova');
  return NextResponse.json({ ok: true, id: os.id, numero: os.numero });
}
