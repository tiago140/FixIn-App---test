import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { avisarEquipeOS } from '@/lib/ordens';
import { concluirOS } from '@/lib/ordensExec';

const num = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; };

// O prestador responde a ordem: aceitar, recusar ou enviar os valores por item.
export async function POST(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { acao, motivo, itens, obs } = await req.json();
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*').eq('id', params.id).eq('prestador_id', profile.prestador_id).maybeSingle();
  if (!os) return NextResponse.json({ error: 'ordem não encontrada' }, { status: 404 });
  const agora = new Date().toISOString();
  const auditar = async (a) => { try { await admin.from('auditoria').insert({ acao: a, detalhe: `${os.numero} · ${os.endereco}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: 'prestador' }); } catch (e) {} };

  if (acao === 'aceitar') {
    if (os.status !== 'enviada') return NextResponse.json({ error: 'esta ordem não está aguardando aceite' }, { status: 400 });
    await admin.from('ordens_servico').update({ status: 'aceita', aceito_em: agora, atualizado_em: agora }).eq('id', os.id);
    await auditar('Prestador aceitou a ordem');
    await avisarEquipeOS(os, 'aceita');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'recusar') {
    if (!['enviada', 'aceita'].includes(os.status)) return NextResponse.json({ error: 'esta ordem não pode mais ser recusada' }, { status: 400 });
    const m = String(motivo || '').trim().slice(0, 500);
    if (!m) return NextResponse.json({ error: 'informe o motivo da recusa' }, { status: 400 });
    await admin.from('ordens_servico').update({ status: 'recusada', recusa_motivo: m, atualizado_em: agora }).eq('id', os.id);
    await auditar('Prestador recusou a ordem');
    await avisarEquipeOS(os, 'recusada', m);
    return NextResponse.json({ ok: true });
  }

  if (acao === 'enviar_valores') {
    if (!['aceita', 'orcada'].includes(os.status)) return NextResponse.json({ error: 'aceite a ordem antes de enviar os valores' }, { status: 400 });
    const lista = (Array.isArray(itens) ? itens : []).slice(0, 200).map((i, n) => ({
      os_id: os.id, ordem: n,
      ambiente: String(i.ambiente ?? '').trim().slice(0, 120),
      servico: String(i.servico ?? '').trim().slice(0, 200),
      descricao: String(i.descricao ?? '').trim().slice(0, 1000) || null,
      mo: num(i.mo), ma: num(i.ma),
    }));
    if (!lista.length) return NextResponse.json({ error: 'adicione pelo menos um item' }, { status: 400 });
    if (lista.some((i) => !i.servico)) return NextResponse.json({ error: 'todo item precisa do nome do serviço' }, { status: 400 });
    if (lista.some((i) => i.mo === null || i.ma === null)) return NextResponse.json({ error: 'valores inválidos: use números iguais ou maiores que zero' }, { status: 400 });
    await admin.from('os_itens').delete().eq('os_id', os.id);
    const { error } = await admin.from('os_itens').insert(lista);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from('ordens_servico').update({ status: 'orcada', orcado_em: agora, atualizado_em: agora }).eq('id', os.id);
    await auditar('Prestador enviou valores da ordem');
    await avisarEquipeOS(os, 'orcada');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'concluir') {
    const r = await concluirOS(admin, os, obs, profile.nome_completo);
    if (r.erro) return NextResponse.json({ error: r.erro }, { status: r.status || 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'ação inválida' }, { status: 400 });
}
