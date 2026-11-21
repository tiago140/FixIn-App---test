// Dá baixa numa cobrança paga (uma única vez, mesmo que o aviso chegue repetido) e atualiza lançamento e orçamento.
export async function darBaixaCobranca(admin, cob, { novoStatus, origem }) {
  const agora = new Date().toISOString();
  const { data: reivindicada } = await admin.from('cobrancas').update({ status: novoStatus, pago_em: cob.pago_em || agora, atualizado_em: agora }).eq('id', cob.id).in('status', ['pendente', 'vencida', 'cancelada']).select('id');
  if (!(reivindicada || []).length) return false;
  const { data: l } = await admin.from('lancamentos').select('*').eq('id', cob.lancamento_id).single();
  const pago = Math.min(Number(l.valor), Math.round((Number(l.valor_pago || 0) + Number(cob.valor)) * 100) / 100);
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  await admin.from('lancamentos').update({ valor_pago: pago, status: pago >= Number(l.valor) ? 'pago' : l.status, data_pagamento: hoje, atualizado_em: agora }).eq('id', l.id);
  if (l.orcamento_id) await admin.from('orcamentos').update({ valor_pago: pago, pagamento_cliente_status: pago >= Number(l.valor) ? 'pago_total' : 'entrada_paga', pagamento_verificado_em: agora, atualizado_em: agora }).eq('id', l.orcamento_id);
  try { await admin.from('auditoria').insert({ acao: `Pagamento recebido (${origem})`, detalhe: `${l.descricao} · R$ ${Number(cob.valor).toFixed(2)}`, alvo_tipo: 'lancamento', alvo_id: l.id, autor_nome: origem, autor_role: 'sistema' }); } catch (e) {}
  return true;
}
