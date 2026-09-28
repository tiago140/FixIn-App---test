export function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

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
  if (o.atrasado === true) return true;
  if (!['aprovado', 'em_execucao', 'finalizado'].includes(o.status)) return false;
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

export function calcularTotalComMargem(itens, margemPercentual) {
  const base = calcularTotalItens(itens);
  return base * (1 + (Number(margemPercentual) || 0) / 100);
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
