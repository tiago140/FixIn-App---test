import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { pendenciasLaudo } from '@/lib/laudoObrigatorio';

export const dynamic = 'force-dynamic';

// O que pede atenção do prestador agora: ordens novas, ajustes pedidos, obra liberada e mensagens da equipe.
export async function GET() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return NextResponse.json({ itens: [] });
  const admin = createAdminClient();
  const { data: ordens } = await admin.from('ordens_servico').select('id, numero, endereco, status, origem, liberado_em, atualizado_em').eq('prestador_id', profile.prestador_id).in('status', ['enviada', 'reprovada', 'em_execucao']).order('atualizado_em', { ascending: false }).limit(30);
  const itens = [];
  for (const o of ordens || []) {
    if (o.status === 'enviada') itens.push({ chave: `${o.id}:enviada`, titulo: o.origem === 'orcamento' ? 'Orçamento para você' : 'Novo chamado', texto: `${o.endereco}. Aceite ou recuse.`, href: `/prestador/ordens/${o.id}`, cor: 'verde' });
    else if (o.status === 'reprovada') itens.push({ chave: `${o.id}:reprovada:${o.atualizado_em}`, titulo: 'A FixIn pediu ajustes', texto: o.endereco, href: `/prestador/ordens/${o.id}`, cor: 'erro' });
    else if (o.status === 'em_execucao' && o.liberado_em && Date.now() - new Date(o.liberado_em).getTime() < 3 * 86400000) itens.push({ chave: `${o.id}:liberada`, titulo: 'Obra liberada', texto: `${o.endereco}. Pode iniciar. Registre as fotos de início.`, href: `/prestador/ordens/${o.id}`, cor: 'verde' });
  }
  for (const o of await pendenciasLaudo(admin, profile.prestador_id)) itens.unshift({ chave: `${o.id}:laudo:${o.rodada || 0}`, titulo: 'Assine o laudo de finalização', texto: `${o.numero} · ${o.endereco}. É obrigatório para concluir, receber o pagamento final e pegar novos chamados.`, href: `/prestador/ordens/${o.id}`, cor: 'erro' });
  const ids = (ordens || []).map((o) => o.id);
  if (ids.length) {
    const { data: ms } = await admin.from('os_mensagens').select('id, os_id, texto, criado_em').eq('lado', 'equipe').in('os_id', ids).gte('criado_em', new Date(Date.now() - 2 * 86400000).toISOString()).order('criado_em', { ascending: false }).limit(10);
    for (const m of ms || []) { const o = ordens.find((x) => x.id === m.os_id); itens.push({ chave: `msg:${m.id}`, titulo: 'Mensagem da FixIn', texto: `${o?.numero}: ${String(m.texto).slice(0, 120)}`, href: `/prestador/ordens/${m.os_id}`, cor: 'marinho' }); }
  }
  return NextResponse.json({ itens });
}
