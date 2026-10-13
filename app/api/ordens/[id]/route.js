import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { avisarPrestadorOS } from '@/lib/ordens';
import { totalItensOS } from '@/lib/ordensStatus';

// Ações da equipe FixIn sobre uma ordem: cancelar, devolver para o prestador corrigir, aplicar os valores ao orçamento.
export async function PATCH(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const { acao, cliente_id } = await req.json();
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*, os_itens(*)').eq('id', params.id).maybeSingle();
  if (!os) return NextResponse.json({ error: 'ordem não encontrada' }, { status: 404 });
  const agora = new Date().toISOString();
  const auditar = async (a, d) => { try { await admin.from('auditoria').insert({ acao: a, detalhe: `${os.numero} · ${d}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {} };

  if (acao === 'cancelar') {
    if (['paga', 'cancelada'].includes(os.status)) return NextResponse.json({ error: 'esta ordem não pode mais ser cancelada' }, { status: 400 });
    await admin.from('ordens_servico').update({ status: 'cancelada', atualizado_em: agora }).eq('id', os.id);
    await auditar('Cancelou ordem de serviço', 'cancelada');
    await avisarPrestadorOS(os, 'cancelada');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'devolver') {
    if (os.status !== 'orcada') return NextResponse.json({ error: 'só dá para devolver ordens com valores enviados' }, { status: 400 });
    await admin.from('ordens_servico').update({ status: 'aceita', atualizado_em: agora }).eq('id', os.id);
    await auditar('Devolveu valores ao prestador', 'para ajuste');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'aplicar_orcamento') {
    if (os.status !== 'orcada') return NextResponse.json({ error: 'o prestador ainda não enviou os valores' }, { status: 400 });
    const itens = (os.os_itens || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    if (!itens.length) return NextResponse.json({ error: 'a ordem não tem itens' }, { status: 400 });

    let orcId = os.orcamento_id;
    if (orcId) {
      const { data: o } = await admin.from('orcamentos').select('status, numero').eq('id', orcId).maybeSingle();
      if (!o) return NextResponse.json({ error: 'orçamento ligado não encontrado' }, { status: 400 });
      if (!['pendente', 'em_preparacao'].includes(o.status)) {
        return NextResponse.json({ error: `O orçamento ${o.numero} já foi enviado ou aprovado. Edite os itens nele manualmente.` }, { status: 409 });
      }
      await admin.from('orcamento_itens').delete().eq('orcamento_id', orcId);
    } else {
      const cli = cliente_id || os.cliente_id;
      if (!cli) return NextResponse.json({ error: 'escolha a imobiliária para criar o orçamento' }, { status: 400 });
      const { data: novo, error: eNovo } = await admin.from('orcamentos').insert({
        cliente_id: cli, endereco: os.endereco, tipo: os.origem === 'chamado' ? 'manutencao' : 'rescisao', status: 'pendente', criado_por: user.id,
      }).select('id').single();
      if (eNovo) return NextResponse.json({ error: eNovo.message }, { status: 400 });
      orcId = novo.id;
    }
    const { error: eItens } = await admin.from('orcamento_itens').insert(itens.map((i, n) => ({ orcamento_id: orcId, ambiente: i.ambiente || '', servico: i.servico, descricao: i.descricao || null, mo: i.mo, ma: i.ma, ordem: n })));
    if (eItens) return NextResponse.json({ error: eItens.message }, { status: 400 });
    await admin.from('orcamentos').update({ prestador_id: os.prestador_id, valor_combinado_prestador: totalItensOS(itens), atualizado_em: agora }).eq('id', orcId);
    await admin.from('ordens_servico').update({ status: 'aplicada', orcamento_id: orcId, atualizado_em: agora }).eq('id', os.id);
    await auditar('Aplicou valores do prestador ao orçamento', 'orçamento atualizado');
    return NextResponse.json({ ok: true, orcamento_id: orcId });
  }

  return NextResponse.json({ error: 'ação inválida' }, { status: 400 });
}
