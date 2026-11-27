import { avisarPrestadorOS } from '@/lib/ordens';

// Dá baixa numa cobrança paga (uma única vez, mesmo que o aviso chegue repetido) e atualiza lançamento e orçamento.
export async function darBaixaCobranca(admin, cob, { novoStatus, origem }) {
  const agora = new Date().toISOString();
  const { data: reivindicada } = await admin.from('cobrancas').update({ status: novoStatus, pago_em: cob.pago_em || agora, atualizado_em: agora }).eq('id', cob.id).in('status', ['pendente', 'vencida', 'cancelada']).select('id');
  if (!(reivindicada || []).length) return false;
  const { data: l } = await admin.from('lancamentos').select('*').eq('id', cob.lancamento_id).single();
  // Pagamento duplicado (o cliente pagou por dois caminhos): não soma de novo, só registra para o dono devolver.
  if (l.status === 'pago' || Number(l.valor_pago || 0) >= Number(l.valor) - 0.005) {
    try { await admin.from('auditoria').insert({ acao: 'ATENÇÃO: pagamento em duplicidade', detalhe: `${l.descricao} · R$ ${Number(cob.valor).toFixed(2)} (${cob.provedor || origem}) · ${cob.observacao || ''} — devolver ao cliente`, alvo_tipo: 'lancamento', alvo_id: l.id, autor_nome: origem, autor_role: 'sistema' }); } catch (e) {}
    return true;
  }
  const pago = Math.min(Number(l.valor), Math.round((Number(l.valor_pago || 0) + Number(cob.valor)) * 100) / 100);
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  await admin.from('lancamentos').update({ valor_pago: pago, status: pago >= Number(l.valor) ? 'pago' : l.status, data_pagamento: hoje, atualizado_em: agora }).eq('id', l.id);
  if (l.orcamento_id) await admin.from('orcamentos').update({ valor_pago: pago, pagamento_cliente_status: pago >= Number(l.valor) ? 'pago_total' : 'entrada_paga', pagamento_verificado_em: agora, atualizado_em: agora }).eq('id', l.orcamento_id);
  // Quitou: cancela as outras cobranças em aberto desta conta (ex.: boleto TikPag se pagou na InfinitePay).
  if (pago >= Number(l.valor) - 0.005) {
    try {
      const { data: outras } = await admin.from('cobrancas').select('id, provedor, externo_id').eq('lancamento_id', l.id).eq('status', 'pendente').neq('id', cob.id);
      for (const o of outras || []) {
        if (o.provedor === 'asaas') { try { const { asaas } = await import('@/lib/asaas'); await asaas(`/payments/${o.externo_id}`, { method: 'DELETE' }); } catch (e) {} }
        await admin.from('cobrancas').update({ status: 'cancelada', atualizado_em: agora }).eq('id', o.id);
      }
    } catch (e) {}
  }
  // Amarra à conta a receber: a referência do comprovante (nº do orçamento | endereço | id) vai para a observação do lançamento.
  const ref = cob.observacao || null;
  if (ref) {
    const nota = `${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · recebido R$ ${Number(cob.valor).toFixed(2)} (${cob.provedor || origem}) · ${ref}`;
    await admin.from('lancamentos').update({ observacao: [l.observacao, nota].filter(Boolean).join('\n').slice(-2000) }).eq('id', l.id);
  }
  // Avisa o prestador da obra (mensagem no app + e-mail + push) com a mesma referência.
  if (l.orcamento_id) {
    try {
      const { data: ordens } = await admin.from('ordens_servico').select('*').eq('orcamento_id', l.orcamento_id).not('status', 'in', '("cancelada","recusada")');
      const quitado = pago >= Number(l.valor);
      const texto = `Pagamento do cliente ${quitado ? 'quitado' : 'recebido'}: R$ ${Number(cob.valor).toFixed(2).replace('.', ',')}. Ref.: ${ref || l.descricao}`;
      for (const os of ordens || []) {
        await admin.from('os_mensagens').insert({ os_id: os.id, lado: 'equipe', autor_nome: 'FixIn (automático)', texto });
        await avisarPrestadorOS(os, 'mensagem', texto);
      }
    } catch (e) {}
  }
  try { await admin.from('auditoria').insert({ acao: `Pagamento recebido (${origem})`, detalhe: `${l.descricao} · R$ ${Number(cob.valor).toFixed(2)}`, alvo_tipo: 'lancamento', alvo_id: l.id, autor_nome: origem, autor_role: 'sistema' }); } catch (e) {}
  return true;
}
