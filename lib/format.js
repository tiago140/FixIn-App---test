export function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtDate(iso) {
  if (!iso) return '—';
  // Data simples do banco (coluna "date", ex.: 2026-10-04) é um dia do calendário, não um instante:
  // passar por new Date() trataria como meia-noite UTC e, no Brasil, mostraria o dia anterior.
  const simples = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (simples) return `${simples[3]}/${simples[2]}/${simples[1]}`;
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

export const PAGAMENTO_CLIENTE_LABEL = {
  aguardando: 'Aguardando pagamento',
  entrada_paga: 'Entrada paga (50%)',
  pago_total: 'Pago integral',
};

export const STATUS_LABEL = {
  pendente: 'Pendente',
  em_preparacao: 'Em preparação',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  em_execucao: 'Em execução',
  finalizado: 'Finalizado',
};

export const KANBAN_COLS = ['pendente', 'em_preparacao', 'enviado', 'aprovado', 'em_execucao', 'finalizado', 'rejeitado'];

export const PRAZO_PAGAMENTO_DIAS = 7;

export function diasDesde(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function estaAtrasado(o) {
  // Visão da imobiliária: o banco já diz se está em atraso, sem expor valores para quem não pode vê-los.
  if (typeof o.em_atraso === 'boolean') return o.em_atraso;
  // Pagamento só pode estar atrasado DEPOIS de aprovado (um orçamento recusado ou ainda em análise nunca está "em atraso").
  if (!['aprovado', 'em_execucao', 'finalizado'].includes(o.status)) return false;
  if (o.atrasado === true) return true;
  if (!o.aprovado_em) return false;
  const total = calcularTotalComMargem(o.orcamento_itens || o.itens, o.margem_percentual);
  const pago = Number(o.valor_pago) || 0;
  return pago < total && diasDesde(o.aprovado_em) > PRAZO_PAGAMENTO_DIAS;
}

export function fmtDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function calcularTotalItens(itens) {
  return (itens || []).reduce((acc, it) => acc + (Number(it.mo) || 0) + (Number(it.ma) || 0), 0);
}

// Regra FixIn: todo valor de orçamento é arredondado PARA CIMA, em reais inteiros (nunca R$ 1.650,55).
// Arredonda cada linha (mão de obra e material, já com a margem) para que o PDF, as telas e o total sempre batam.
export function arredondarParaCima(v) {
  return Math.ceil(Math.round((Number(v) || 0) * 100) / 100);
}

export function calcularTotalComMargem(itens, margemPercentual) {
  const fator = 1 + (Number(margemPercentual) || 0) / 100;
  return (itens || []).reduce(
    (acc, it) => acc + arredondarParaCima((Number(it.mo) || 0) * fator) + arredondarParaCima((Number(it.ma) || 0) * fator),
    0
  );
}

export function calcularProximoStatusAutomatico(o, gatilho) {
  if (o.status === 'rejeitado' || o.status === 'finalizado') return null;
  if (gatilho === 'pdf' && (o.status === 'pendente' || o.status === 'em_preparacao')) return 'enviado';
  if (gatilho === 'prestador' && o.status === 'aprovado' && o.prestador_id) return 'em_execucao';
  if (gatilho === 'pagamento' && ['aprovado', 'em_execucao'].includes(o.status)) {
    const total = calcularTotalComMargem(o.orcamento_itens || o.itens, o.margem_percentual);
    const pago = Number(o.valor_pago) || 0;
    if (total > 0 && pago >= total) return 'finalizado';
  }
  return null;
}
