import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { ETAPAS, UUID, linkObra } from '@/lib/acompanhamento';
import { novoToken } from '@/lib/ordensArquivos';

export const dynamic = 'force-dynamic';

// Equipe: muda etapa / percentual (com anotação opcional) e liga ou desliga o link externo do locador.
export async function PATCH(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (!UUID.test(params.id)) return NextResponse.json({ error: 'inválido' }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: a } = await admin.from('acompanhamentos').select('*').eq('id', params.id).maybeSingle();
  if (!a) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  if (typeof b.link_ativo === 'boolean') {
    const upd = { link_ativo: b.link_ativo, atualizado_em: new Date().toISOString() };
    if (b.link_ativo && !a.token) upd.token = novoToken();
    if (b.novo_token) upd.token = novoToken();
    const { data } = await admin.from('acompanhamentos').update(upd).eq('id', a.id).select('token, link_ativo').single();
    return NextResponse.json({ ok: true, link: data.link_ativo && data.token ? linkObra(data.token) : null });
  }

  const etapa = ETAPAS.find((e) => e.id === b.etapa);
  if (!etapa) return NextResponse.json({ error: 'Escolha a etapa.' }, { status: 400 });
  let pct = b.percentual === '' || b.percentual == null ? null : Math.round(Number(b.percentual));
  if (pct != null && !(pct >= 0 && pct <= 100)) return NextResponse.json({ error: 'O percentual vai de 0 a 100.' }, { status: 400 });
  if (etapa.id === 'concluida') pct = 100;
  else if (pct == null) pct = etapa.pct != null && etapa.pct > a.percentual ? etapa.pct : a.percentual;
  const agora = new Date().toISOString();
  const upd = { etapa: etapa.id, percentual: pct, atualizado_em: agora };
  if (etapa.id !== 'aprovado' && !a.iniciado_em) upd.iniciado_em = agora;
  upd.concluido_em = etapa.id === 'concluida' ? agora : null;
  const { error } = await admin.from('acompanhamentos').update(upd).eq('id', a.id);
  if (error) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 });
  await admin.from('acompanhamento_eventos').insert({
    acompanhamento_id: a.id, tipo: 'etapa', etapa: etapa.id, percentual: pct,
    texto: String(b.texto || '').trim().slice(0, 1500) || null, autor_nome: profile.nome_completo || null, autor_tipo: 'equipe',
  });
  return NextResponse.json({ ok: true });
}
