// Livro de lançamentos (contas a receber e a pagar). Textos e regras que valem na tela e no servidor.

export const TIPOS = { receber: 'A receber', pagar: 'A pagar' };

export const STATUS_LANC = {
  previsto: 'Previsto',
  aprovado: 'Aprovado para pagar',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

export const CATEGORIAS_RECEBER = ['Serviços', 'Reembolso', 'Outras receitas'];
export const CATEGORIAS_PAGAR = ['Prestadores', 'Material', 'Impostos e taxas', 'Software e sistemas', 'Pessoal', 'Outras despesas'];

export const VALOR_MAXIMO = 10000000;

// Data de hoje no horário de Brasília (AAAA-MM-DD), igual no servidor e no navegador.
export function hojeSP() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function dataValida(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T12:00:00Z').getTime());
}

export function emAberto(l) {
  return (l.status === 'previsto' || l.status === 'aprovado');
}

export function saldoAberto(l) {
  return emAberto(l) ? Math.max(0, Number(l.valor) - Number(l.valor_pago || 0)) : 0;
}

export function vencido(l, hoje) {
  return emAberto(l) && l.vencimento < hoje;
}

export function somarDias(isoData, dias) {
  const d = new Date(isoData + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
