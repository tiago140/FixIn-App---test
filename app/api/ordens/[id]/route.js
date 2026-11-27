import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { avisarPrestadorOS } from '@/lib/ordens';
import { totalItensOS } from '@/lib/ordensStatus';
import { novoToken } from '@/lib/ordensArquivos';
import { recalcularPagamentoOS } from '@/lib/ordensExec';
import { urlSite } from '@/lib/chamados';
import { laudoAssinado, exigeLaudo } from '@/lib/laudoObrigatorio';

// Ações da equipe FixIn sobre uma ordem: cancelar, devolver para o prestador corrigir, aplicar os valores ao orçamento.
export async function PATCH(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  const body = await req.json();
  const { acao, cliente_id, motivo } = body;
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*, os_itens(*)').eq('id', params.id).maybeSingle();
  if (!os) return NextResponse.json({ error: 'ordem não encontrada' }, { status: 404 });
  const agora = new Date().toISOString();
  const auditar = async (a, d) => { try { await admin.from('auditoria').insert({ acao: a, detalhe: `${os.numero} · ${d}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {} };

  if (acao === 'editar_valores') {
    if (['paga', 'cancelada', 'recusada'].includes(os.status)) return NextResponse.json({ error: 'esta ordem não aceita mais alteração de valores' }, { status: 400 });
    const novos = new Map((Array.isArray(body.itens) ? body.itens : []).map((i) => [String(i.id), i]));
    let mudou = false;
    for (const it of os.os_itens || []) {
      const n = novos.get(String(it.id));
      if (!n) continue;
      const mo = Number(n.mo), ma = Number(n.ma);
      if (!Number.isFinite(mo) || !Number.isFinite(ma) || mo < 0 || ma < 0) return NextResponse.json({ error: 'valores inválidos' }, { status: 400 });
      if (mo !== Number(it.mo || 0) || ma !== Number(it.ma || 0)) { await admin.from('os_itens').update({ mo, ma }).eq('id', it.id); mudou = true; }
    }
    if (!mudou) return NextResponse.json({ ok: true });
    const { data: itensNovos } = await admin.from('os_itens').select('mo, ma').eq('os_id', os.id);
    const tMO = (itensNovos || []).reduce((s, i) => s + Number(i.mo || 0), 0), tMA = (itensNovos || []).reduce((s, i) => s + Number(i.ma || 0), 0);
    const f = (v) => v.toFixed(2).replace('.', ',');
    const texto = `A FixIn ajustou os valores da ordem: mão de obra R$ ${f(tMO)}, material R$ ${f(tMA)}, total R$ ${f(tMO + tMA)}.`;
    await admin.from('os_mensagens').insert({ os_id: os.id, lado: 'equipe', autor_nome: 'FixIn (automático)', texto });
    try { await avisarPrestadorOS(os, 'mensagem', texto); } catch (e) {}
    try { await recalcularPagamentoOS(admin, os.id); } catch (e) {}
    await auditar('Editou valores do repasse', `MO ${f(tMO)} · MA ${f(tMA)} · total ${f(tMO + tMA)}`);
    return NextResponse.json({ ok: true });
  }

  if (acao === 'chaves') {
    const c = String(body.chaves || '').replace(/\s+/g, ' ').trim().slice(0, 300) || null;
    await admin.from('ordens_servico').update({ chaves: c, atualizado_em: agora }).eq('id', os.id);
    await auditar('Atualizou onde pegar as chaves', c || 'removido');
    return NextResponse.json({ ok: true });
  }

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

  if (acao === 'gerar_link') {
    if (['enviada', 'recusada', 'cancelada'].includes(os.status)) return NextResponse.json({ error: 'O link de fotos só existe depois que o prestador aceita a ordem.' }, { status: 400 });
    const token = novoToken();
    await admin.from('ordens_servico').update({ token_fotos: token, token_expira: new Date(Date.now() + 90 * 86400000).toISOString(), atualizado_em: agora }).eq('id', os.id);
    await auditar('Gerou link de fotos', 'link novo (o anterior deixa de valer)');
    return NextResponse.json({ ok: true, url: `${urlSite()}/foto/${token}` });
  }

  if (acao === 'definir_prazo') {
    const d = String(body.prazo || '');
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    await admin.from('ordens_servico').update({ prazo_em: d || null, atualizado_em: agora }).eq('id', os.id);
    await auditar('Definiu o prazo da ordem', d || 'sem prazo');
    return NextResponse.json({ ok: true });
  }
  if (acao === 'gerar_acompanhamento') {
    if (['enviada', 'recusada', 'cancelada'].includes(os.status)) return NextResponse.json({ error: 'O acompanhamento só existe depois que o prestador aceita a ordem.' }, { status: 400 });
    const token = os.token_acompanhamento || novoToken();
    await admin.from('ordens_servico').update({ token_acompanhamento: token, acompanhamento_ativo: true, atualizado_em: agora }).eq('id', os.id);
    await auditar('Ativou o link de acompanhamento da obra', 'ativo');
    return NextResponse.json({ ok: true, url: `${urlSite()}/acompanhar/${token}` });
  }
  if (acao === 'desativar_acompanhamento') {
    await admin.from('ordens_servico').update({ acompanhamento_ativo: false, atualizado_em: agora }).eq('id', os.id);
    await auditar('Desativou o link de acompanhamento da obra', 'desativado');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'aprovar_conclusao') {
    if (os.status !== 'conclusao_pendente') return NextResponse.json({ error: 'não há conclusão em análise' }, { status: 400 });
    if (exigeLaudo(os) && !(await laudoAssinado(admin, os))) return NextResponse.json({ error: 'O prestador ainda não assinou o laudo de finalização. Sem o laudo, a conclusão não pode ser aprovada.' }, { status: 409 });
    await admin.from('ordens_servico').update({ status: 'aprovada', revisado_em: agora, revisado_por: user.id, reprovacao_motivo: null, atualizado_em: agora }).eq('id', os.id);
    await auditar('Aprovou a conclusão do serviço', 'aprovada');
    const r = await recalcularPagamentoOS(admin, os.id);
    await avisarPrestadorOS({ ...os, status: r?.status || 'aprovada' }, 'aprovada');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'reprovar_conclusao') {
    if (os.status !== 'conclusao_pendente') return NextResponse.json({ error: 'não há conclusão em análise' }, { status: 400 });
    const m = String(motivo || '').trim().slice(0, 1000);
    if (!m) return NextResponse.json({ error: 'descreva o que precisa ser ajustado' }, { status: 400 });
    await admin.from('ordens_servico').update({ status: 'reprovada', rodada: (os.rodada || 0) + 1, reprovacao_motivo: m, revisado_em: agora, revisado_por: user.id, atualizado_em: agora }).eq('id', os.id);
    await auditar('Reprovou a conclusão do serviço', m.slice(0, 120));
    await avisarPrestadorOS({ ...os, reprovacao_motivo: m }, 'reprovada');
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
