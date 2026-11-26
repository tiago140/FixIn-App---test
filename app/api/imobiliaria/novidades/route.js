import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Avisos para o portal da imobiliária: o prestador iniciou ou finalizou uma obra dela (últimos 7 dias).
export async function GET() {
  const { user, profile } = await getProfile();
  if (!user || !profile?.cliente_id || ['master', 'prestador'].includes(profile.role)) return NextResponse.json({ itens: [] });
  const admin = createAdminClient();
  const { data: orcs } = await admin.from('orcamentos').select('id').eq('cliente_id', profile.cliente_id).limit(2000);
  const ids = (orcs || []).map((o) => o.id);
  let q = admin.from('ordens_servico').select('id, numero, endereco, status, orcamento_id, iniciada_em, concluido_em, rodada, prestadores(nome)').not('status', 'in', '(cancelada,recusada)').limit(60);
  q = ids.length ? q.or(`cliente_id.eq.${profile.cliente_id},orcamento_id.in.(${ids.join(',')})`) : q.eq('cliente_id', profile.cliente_id);
  const { data: ordens } = await q;
  const desde = Date.now() - 7 * 86400000;
  const lista = (ordens || []).filter((o) => (o.iniciada_em && new Date(o.iniciada_em) > desde) || (o.concluido_em && new Date(o.concluido_em) > desde));
  const { data: laudos } = lista.length ? await admin.from('os_laudos_finalizacao').select('os_id, rodada').in('os_id', lista.map((o) => o.id)) : { data: [] };
  const itens = [];
  for (const o of lista) {
    const href = o.orcamento_id ? `/imobiliaria/orcamentos/${o.orcamento_id}` : '/imobiliaria/acompanhamento';
    const quem = o.prestadores?.nome ? ` por ${o.prestadores.nome}` : '';
    const finalizada = o.concluido_em && (laudos || []).some((l) => l.os_id === o.id && (l.rodada || 0) === (o.rodada || 0));
    if (finalizada && new Date(o.concluido_em) > desde) itens.push({ chave: `${o.id}:fim:${o.rodada || 0}`, titulo: 'Obra finalizada', texto: `${o.endereco}${quem}. Laudo de finalização assinado.`, href, cor: 'verde' });
    else if (o.iniciada_em && new Date(o.iniciada_em) > desde) itens.push({ chave: `${o.id}:ini`, titulo: 'Obra iniciada', texto: `${o.endereco}${quem}.`, href, cor: 'marinho' });
  }
  return NextResponse.json({ itens });
}
