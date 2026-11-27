// Pagamento do orçamento pelo link/QR do PDF. O PDF guarda só um endereço fixo (/pagar/<token>);
// a cobrança do Asaas é criada aqui, na hora de abrir, para nunca ficar vencida nem duplicada.
import { asaas, asaasConfigurado } from '@/lib/asaas';
import { hojeSP, somarDias } from '@/lib/lancamentos';
import { criarLink, infinitePayConfigurado } from '@/lib/infinitepay';
import { randomUUID } from 'crypto';

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

// Texto que aparece no comprovante do cartão (item do link) e fica salvo em cobrancas.observacao:
// nº do orçamento + endereço + id do orçamento, para achar a venda no extrato e no banco.
export function textoComprovante(o, sufixo = '') {
  const fixo = ` | ${o.id}`;
  const corpo = `Orçamento nº ${o.numero} | ${o.endereco || ''}${sufixo ? ' |' + sufixo : ''}`;
  return corpo.slice(0, Math.max(20, 200 - fixo.length)) + fixo;
}

export const MAX_PARTES = 2;
export const MIN_PARTE = 100;
// Quanto este link/QR deve cobrar agora (tudo, ou 50% se o dono negociou entrada).
export function calcularAlvo(o, l) {
  const restante = Math.round((Number(l.valor) - Number(l.valor_pago || 0)) * 100) / 100;
  const entrada = !!o.parcelado_negociado && Number(l.valor_pago || 0) === 0;
  const alvo = entrada ? Math.round((Number(l.valor) / 2) * 100) / 100 : restante;
  const parcela = entrada ? 'entrada' : (Number(l.valor_pago || 0) > 0 ? 'saldo' : 'total');
  return { restante, entrada, alvo, parcela };
}

// Devolve { estado, ... }. estado: 'indisponivel' | 'aguardando_aprovacao' | 'pago' | 'ok'
export async function dadosPagamento(admin, token, { forcarAsaas = false } = {}) {
  const { data: o } = await admin.from('orcamentos').select('id, numero, endereco, status, cliente_id, parcelado_negociado').eq('pagar_token', token).maybeSingle();
  if (!o) return { estado: 'indisponivel' };
  const base = { numero: o.numero, endereco: o.endereco };
  const { data: cli } = o.cliente_id ? await admin.from('clientes').select('pagamento_provedor, tikpag_habilitado').eq('id', o.cliente_id).maybeSingle() : { data: null };
  const infinite = cli?.pagamento_provedor === 'infinitepay' && !forcarAsaas;
  const tikpagOk = cli?.tikpag_habilitado !== false;
  if (infinite ? !infinitePayConfigurado() : !asaasConfigurado()) return { ...base, estado: 'indisponivel' };
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
  if (infinite) {
    // InfinitePay: um link por cobrança (Pix ou cartão até 12x); a taxa do parcelamento é repassada ao cliente pela InfinitePay.
    try {
      const { data: abertasI } = await admin.from('cobrancas').select('*').eq('lancamento_id', l.id).eq('provedor', 'infinitepay').eq('status', 'pendente');
      // Pagamento dividido escolhido pelo cliente: várias partes abertas que somam o que falta
      const vivas = (abertasI || []).filter((x) => x.vencimento >= hoje).sort((a, b) => a.criado_em > b.criado_em ? 1 : -1);
      const somaVivas = Math.round(vivas.reduce((t, x) => t + Number(x.valor), 0) * 100) / 100;
      if (vivas.length > 1 && Math.abs(somaVivas - restante) < 0.02) {
        return { ...base, estado: 'ok', provedor: 'infinitepay', tikpagOk, valor: restante, parcela, faltaDepois: 0, valorTotal: Number(l.valor), vencimento: vivas[0].vencimento, alvoTotal: alvo, partes: vivas.map((x) => ({ valor: Number(x.valor), url: x.url })) };
      }
      let c = (abertasI || []).find((x) => x.vencimento >= hoje && Math.abs(Number(x.valor) - alvo) < 0.005);
      if (!c) {
        for (const x of abertasI || []) await admin.from('cobrancas').update({ status: 'cancelada', atualizado_em: new Date().toISOString() }).eq('id', x.id);
        const orderNsu = randomUUID();
        const url = await criarLink({ orderNsu, valor: alvo, descricao: textoComprovante(o, entrada ? ' entrada 50%' : parcela === 'saldo' ? ' saldo' : ''), redirectUrl: urlPagamento(token), webhookUrl: `${SITE}/api/webhooks/infinitepay` });
        const vencimento = somarDias(hoje, 3);
        const { data: ins, error } = await admin.from('cobrancas').insert({ lancamento_id: l.id, provedor: 'infinitepay', parcela, valor: alvo, externo_id: orderNsu, url, tipo_cobranca: 'LINK', vencimento, observacao: textoComprovante(o, entrada ? ' entrada 50%' : parcela === 'saldo' ? ' saldo' : '') }).select('*').single();
        if (error) throw new Error('não salvou');
        c = ins;
      }
      return { ...base, estado: 'ok', provedor: 'infinitepay', tikpagOk, valor: alvo, parcela, faltaDepois, saldoVence: l.vencimento, valorTotal: Number(l.valor), vencimento: c.vencimento, linkPagamento: c.url, alvoTotal: alvo };
    } catch (e) { return { ...base, estado: 'indisponivel' }; }
  }
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
      const { data: ins, error } = await admin.from('cobrancas').insert({ lancamento_id: l.id, provedor: 'asaas', parcela, valor: alvo, externo_id: novo.id, url: novo.invoiceUrl, tipo_cobranca: 'BOLETO', vencimento, observacao: textoComprovante(o) }).select('*').single();
      if (error) { try { await asaas(`/payments/${novo.id}`, { method: 'DELETE' }); } catch (e) {} throw new Error('não salvou'); }
      cob = ins;
    }
    const [pix, linha, pg] = await Promise.all([
      asaas(`/payments/${cob.externo_id}/pixQrCode`).catch(() => null),
      asaas(`/payments/${cob.externo_id}/identificationField`).catch(() => null),
      asaas(`/payments/${cob.externo_id}`).catch(() => null),
    ]);
    return { ...base, estado: 'ok', tikpagOk, valor: alvo, parcela, faltaDepois, saldoVence: l.vencimento, valorTotal: Number(l.valor), vencimento: cob.vencimento, faturaUrl: cob.url, pix: pix?.payload || null, pixImagem: pix?.encodedImage || null, linhaDigitavel: linha?.identificationField || null, boletoUrl: pg?.bankSlipUrl || null };
  } catch (e) {
    return { ...base, estado: 'indisponivel' };
  }
}
