// Pagamento do orçamento pelo link/QR do PDF. O PDF guarda só um endereço fixo (/pagar/<token>);
// a cobrança do Asaas é criada aqui, na hora de abrir, para nunca ficar vencida nem duplicada.
import { asaas, asaasConfigurado } from '@/lib/asaas';
import { hojeSP, somarDias } from '@/lib/lancamentos';

export const SITE = 'https://app.fixinreformas.com';
export const MAX_PARCELAS_TIKPAG = 21;
export const urlPagamento = (token) => `${SITE}/pagar/${token}`;
export const urlTikpagDoOrcamento = (token) => `${SITE}/pagar/${token}/tikpag`;

// Endereço do checkout da TikPag (ex.: https://fixin.tikpag.com.br). Fica em TIKPAG_CHECKOUT_URL.
export function tikpagCheckoutBase() {
  const u = String(process.env.TIKPAG_CHECKOUT_URL || '').trim().replace(/\/+$/, '');
  return /^https:\/\/[a-z0-9.-]+\.tikpag\.com\.br$/i.test(u) ? u : null;
}
// Monta o link do checkout TikPag com o boleto (PDF) e o Pix copia e cola.
export function linkTikpag(dados) {
  const base = tikpagCheckoutBase();
  if (!base || !dados) return null;
  const q = [];
  if (dados.boletoUrl) q.push('b=' + encodeURIComponent(dados.boletoUrl));
  if (dados.pix) q.push('pix=' + encodeURIComponent(dados.pix));
  if (!q.length && dados.linhaDigitavel) return `${base}/checkout/b/${String(dados.linhaDigitavel).replace(/\D/g, '')}`;
  return q.length ? `${base}/checkout/?${q.join('&')}` : null;
}

// Devolve { estado, ... }. estado: 'indisponivel' | 'aguardando_aprovacao' | 'pago' | 'ok'
export async function dadosPagamento(admin, token) {
  const { data: o } = await admin.from('orcamentos').select('id, numero, endereco, status, cliente_id, parcelado_negociado').eq('pagar_token', token).maybeSingle();
  if (!o) return { estado: 'indisponivel' };
  const base = { numero: o.numero, endereco: o.endereco };
  if (!asaasConfigurado()) return { ...base, estado: 'indisponivel' };
  const { data: l } = await admin.from('lancamentos').select('*').eq('orcamento_id', o.id).eq('tipo', 'receber').eq('origem', 'orcamento').neq('status', 'cancelado').maybeSingle();
  if (!l) return { ...base, estado: 'aguardando_aprovacao' };
  const restante = Math.round((Number(l.valor) - Number(l.valor_pago || 0)) * 100) / 100;
  if (l.status === 'pago' || restante <= 0) return { ...base, estado: 'pago', valor: Number(l.valor) };
  if (!l.cliente_id) return { ...base, estado: 'indisponivel' };
  // Padrão: paga tudo à vista. Só se o dono negociou 50% + 50%, o link cobra a entrada e depois o saldo.
  const entrada = o.parcelado_negociado && Number(l.valor_pago || 0) === 0;
  const alvo = entrada ? Math.round((Number(l.valor) / 2) * 100) / 100 : restante;
  const parcela = entrada ? 'entrada' : (Number(l.valor_pago || 0) > 0 ? 'saldo' : 'total');
  const faltaDepois = entrada ? Math.round((Number(l.valor) - alvo) * 100) / 100 : 0;

  const hoje = hojeSP();
  const { data: abertas } = await admin.from('cobrancas').select('*').eq('lancamento_id', l.id).eq('provedor', 'asaas').eq('status', 'pendente');
  let cob = (abertas || []).find((c) => c.vencimento >= hoje && Math.abs(Number(c.valor) - alvo) < 0.005);
  try {
    if (!cob) {
      for (const c of abertas || []) { // vencida ou com valor antigo: cancela para não cobrar duas vezes
        try { await asaas(`/payments/${c.externo_id}`, { method: 'DELETE' }); } catch (e) {}
        await admin.from('cobrancas').update({ status: 'cancelada', atualizado_em: new Date().toISOString() }).eq('id', c.id);
      }
      const { data: cliente } = await admin.from('clientes').select('id, nome, nome_empresa, email, cnpj, asaas_customer_id').eq('id', l.cliente_id).single();
      const { garantirClienteAsaas } = await import('@/lib/asaas');
      const customer = await garantirClienteAsaas(admin, cliente);
      const vencimento = somarDias(hoje, 3);
      const novo = await asaas('/payments', { method: 'POST', body: { customer, billingType: 'BOLETO', value: alvo, dueDate: vencimento, description: `${l.descricao}${entrada ? ' (entrada 50%)' : parcela === 'saldo' ? ' (saldo)' : ''}`.slice(0, 500), externalReference: l.id } });
      const { data: ins, error } = await admin.from('cobrancas').insert({ lancamento_id: l.id, provedor: 'asaas', parcela, valor: alvo, externo_id: novo.id, url: novo.invoiceUrl, tipo_cobranca: 'BOLETO', vencimento }).select('*').single();
      if (error) { try { await asaas(`/payments/${novo.id}`, { method: 'DELETE' }); } catch (e) {} throw new Error('não salvou'); }
      cob = ins;
    }
    const [pix, linha, pg] = await Promise.all([
      asaas(`/payments/${cob.externo_id}/pixQrCode`).catch(() => null),
      asaas(`/payments/${cob.externo_id}/identificationField`).catch(() => null),
      asaas(`/payments/${cob.externo_id}`).catch(() => null),
    ]);
    return { ...base, estado: 'ok', valor: alvo, parcela, faltaDepois, saldoVence: l.vencimento, valorTotal: Number(l.valor), vencimento: cob.vencimento, faturaUrl: cob.url, pix: pix?.payload || null, pixImagem: pix?.encodedImage || null, linhaDigitavel: linha?.identificationField || null, boletoUrl: pg?.bankSlipUrl || null };
  } catch (e) {
    return { ...base, estado: 'indisponivel' };
  }
}
