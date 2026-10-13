import { avisarEquipeOS, avisarObraIniciada } from '@/lib/ordens';
import { totalItensOS } from '@/lib/ordensStatus';
import { LIMITE_FOTOS_OS, TAMANHO_MAX_FOTO, guardarArquivo, removerArquivo, novoToken } from '@/lib/ordensArquivos';

export const PODE_ENVIAR_FOTO = ['em_execucao', 'reprovada'];

// Grava uma foto da execução (antes/depois). origem: 'prestador' (portal) ou 'link' (app da rua).
export async function receberFoto(admin, os, form, origem) {
  if (!PODE_ENVIAR_FOTO.includes(os.status)) return { erro: 'Esta ordem não está aberta para envio de fotos.', status: 409 };
  const { count } = await admin.from('os_fotos').select('id', { count: 'exact', head: true }).eq('os_id', os.id);
  if ((count || 0) >= LIMITE_FOTOS_OS) return { erro: `Limite de ${LIMITE_FOTOS_OS} fotos por ordem.`, status: 409 };
  const t = form.get('tipo');
  const tipo = ['antes', 'durante'].includes(t) ? t : 'depois';
  const r = await guardarArquivo(os.id, 'fotos', form, { max: TAMANHO_MAX_FOTO });
  if (r.erro) return r;
  const legenda = String(form.get('legenda') || '').replace(/\s+/g, ' ').trim().slice(0, 300) || null;
  const { data, error } = await admin.from('os_fotos').insert({ os_id: os.id, tipo, rodada: os.rodada || 0, path: r.path, legenda, origem }).select('id').single();
  if (error) { await removerArquivo(r.path); return { erro: error.message, status: 400 }; }
  if (tipo === 'antes') await marcarObraIniciada(admin, os);
  return { ok: true, id: data.id };
}

// Prestador (ou o link da rua) conclui o serviço: exige ao menos uma foto "depois" desta rodada.
export async function concluirOS(admin, os, obs, quem) {
  if (!PODE_ENVIAR_FOTO.includes(os.status)) return { erro: 'Esta ordem não pode ser concluída agora.', status: 409 };
  const { count } = await admin.from('os_fotos').select('id', { count: 'exact', head: true }).eq('os_id', os.id).eq('tipo', 'depois').eq('rodada', os.rodada || 0);
  if (!count) return { erro: 'Envie pelo menos uma foto do serviço pronto ("depois") antes de concluir.', status: 400 };
  const agora = new Date().toISOString();
  const { error } = await admin.from('ordens_servico').update({ status: 'conclusao_pendente', concluido_em: agora, conclusao_obs: String(obs || '').trim().slice(0, 1000) || null, atualizado_em: agora }).eq('id', os.id).in('status', PODE_ENVIAR_FOTO);
  if (error) return { erro: error.message, status: 400 };
  try { await admin.from('auditoria').insert({ acao: 'Prestador concluiu o serviço', detalhe: `${os.numero} · ${os.endereco} · ${quem}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_nome: quem, autor_role: 'prestador' }); } catch (e) {}
  await avisarEquipeOS(os, 'concluida');
  return { ok: true };
}

// Recalcula o pagamento da ordem: quando está aprovada e quitada vira "paga"; mantém o orçamento ligado em dia.
export async function recalcularPagamentoOS(admin, osId) {
  const { data: os } = await admin.from('ordens_servico').select('id, status, orcamento_id, os_itens(mo, ma)').eq('id', osId).maybeSingle();
  if (!os) return null;
  const { data: pags } = await admin.from('pagamentos_prestador').select('valor').eq('os_id', osId).eq('status', 'confirmado');
  const pago = Math.round((pags || []).reduce((s, p) => s + Number(p.valor), 0) * 100) / 100;
  const total = Math.round(totalItensOS(os.os_itens) * 100) / 100;
  const quitada = total > 0 && pago >= total - 0.005;
  let status = os.status;
  if (os.status === 'aprovada' && quitada) {
    status = 'paga';
    await admin.from('ordens_servico').update({ status, atualizado_em: new Date().toISOString() }).eq('id', osId);
  }
  if (os.orcamento_id) {
    const { data: orc } = await admin.from('orcamentos').select('valor_combinado_prestador').eq('id', os.orcamento_id).maybeSingle();
    if (orc && Number(orc.valor_combinado_prestador) > 0) {
      const comb = Number(orc.valor_combinado_prestador);
      const st = pago >= comb - 0.005 ? 'pago_total' : pago > 0 ? 'entrada_paga' : 'aguardando';
      await admin.from('orcamentos').update({ pagamento_prestador_status: st, valor_entrada_prestador: Math.min(pago, comb) }).eq('id', os.orcamento_id);
    }
  }
  return { pago, total, quitada, status };
}

// Primeira foto de Início: marca a obra como iniciada, liga o link de acompanhamento e avisa imobiliária e FixIn (uma única vez).
async function marcarObraIniciada(admin, os) {
  try {
    const { data: p } = await admin.from('prestadores').select('nome').eq('id', os.prestador_id).maybeSingle();
    const quem = (p?.nome || 'Prestador').toUpperCase();
    const agora = new Date().toISOString();
    const token = os.token_acompanhamento || novoToken();
    const { data: marcada } = await admin.from('ordens_servico').update({ iniciada_em: agora, iniciada_por: quem, token_acompanhamento: token, acompanhamento_ativo: true, atualizado_em: agora }).eq('id', os.id).is('iniciada_em', null).select('id');
    if (!marcada || !marcada.length) return;
    try { await admin.from('auditoria').insert({ acao: 'Obra iniciada', detalhe: `${os.numero} · ${os.endereco} · ${quem}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_nome: quem, autor_role: 'prestador' }); } catch (e) {}
    await avisarObraIniciada(os, quem);
  } catch (e) {}
}
