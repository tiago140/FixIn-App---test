// InfinitePay (Checkout Integrado): só a AE Patrimônio usa. A API tem apenas "criar link" e "consultar pagamento":
// saldo, transferência e estorno são feitos no app da InfinitePay.
const BASE = 'https://api.checkout.infinitepay.io';
export const MAX_PARCELAS_INFINITEPAY = 12;

export const handleInfinitePay = () => String(process.env.INFINITEPAY_HANDLE || 'fixin-gestao-de-301').replace(/^\$/, '').trim();
export const infinitePayConfigurado = () => !!handleInfinitePay();

async function chamar(caminho, corpo) {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.INFINITEPAY_API_KEY) headers['X-Api-Key'] = process.env.INFINITEPAY_API_KEY;
  const r = await fetch(BASE + caminho, { method: 'POST', headers, body: JSON.stringify(corpo), cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`InfinitePay ${r.status}: ${String(j?.message || '').slice(0, 200)}`);
  return j;
}

// Cria o link de pagamento. O valor vai SEM acréscimo: a taxa do parcelamento é repassada ao cliente pela própria InfinitePay
// (assured_installments 0 = cliente paga a taxa em todas as parcelas; precisa da chave da API; sem ela vale o ajuste da conta).
export async function criarLink({ orderNsu, valor, descricao, redirectUrl, webhookUrl }) {
  const corpo = {
    handle: handleInfinitePay(), order_nsu: orderNsu, redirect_url: redirectUrl, webhook_url: webhookUrl,
    items: [{ quantity: 1, price: Math.round(valor * 100), description: String(descricao || 'Serviços').slice(0, 200) }],
  };
  if (process.env.INFINITEPAY_API_KEY) corpo.options = { assured_installments: 0, payment_methods_enabled: ['credit_card', 'pix'] };
  const j = await chamar('/links', corpo);
  const url = j.url || j.checkout_url || j.link || j.data?.url;
  if (!url) throw new Error('InfinitePay não devolveu o link');
  return url;
}

// Confirma o pagamento direto na InfinitePay (o aviso por webhook não tem assinatura).
export async function conferirPagamento({ orderNsu, transactionNsu, slug }) {
  return chamar('/payment_check', { handle: handleInfinitePay(), order_nsu: orderNsu, transaction_nsu: transactionNsu, slug });
}

// Taxas do cartão no Link de Pagamento (Visa, Mastercard e Elo), de 1x a 12x, em %. Conferir no app quando a InfinitePay mudar.
export const TAXAS_CARTAO = {
  nitro: [5.99, 11.39, 12.49, 13.09, 13.79, 14.49, 15.49, 16.09, 16.69, 17.39, 18.39, 18.79], // recebe na hora
  um_dia_util: [4.20, 6.09, 7.01, 7.91, 8.80, 9.67, 12.59, 13.42, 14.25, 15.06, 15.87, 16.66], // plano padrão
};
export const planoInfinitePay = () => (String(process.env.INFINITEPAY_PLANO || 'nitro').toLowerCase() === 'um_dia_util' ? 'um_dia_util' : 'nitro');

// Estimativa do que o cliente paga com a taxa repassada: valor / (1 - taxa). O valor exato aparece no checkout da InfinitePay.
export function simularParcelas(valor, plano = planoInfinitePay()) {
  return TAXAS_CARTAO[plano].map((t, i) => {
    const total = Math.round((valor / (1 - t / 100)) * 100) / 100;
    return { n: i + 1, taxa: t, total, parcela: Math.round((total / (i + 1)) * 100) / 100 };
  });
}
