// Aparência de cada situação do orçamento. Mantém as cores já usadas no sistema (marinho, verde e tons de status).
export const ETAPAS_LINHA = ['Solicitado', 'Enviado', 'Aprovado', 'Em execução', 'Finalizado'];

// Em que ponto da linha do tempo o orçamento está (0 a 4). Recusado fica fora da linha (-1).
export function etapaAtual(status) {
  switch (status) {
    case 'pendente':
    case 'em_preparacao': return 0;
    case 'enviado': return 1;
    case 'aprovado': return 2;
    case 'em_execucao': return 3;
    case 'finalizado': return 4;
    default: return -1;
  }
}

// rotulo = como aparece para o dono; rotuloImob = como aparece para a imobiliária.
export const SITUACAO = {
  pendente:      { icone: 'Clock',         cor: '#B8862E', rotulo: 'Pendente',       rotuloImob: 'Em análise pela FixIn' },
  em_preparacao: { icone: 'PencilRuler',   cor: '#B8862E', rotulo: 'Em preparação',  rotuloImob: 'Em análise pela FixIn' },
  enviado:       { icone: 'Send',          cor: '#3B6B8C', rotulo: 'Enviado',        rotuloImob: 'Aguardando você' },
  aprovado:      { icone: 'CheckCircle2',  cor: '#3F7A5E', rotulo: 'Aprovado',       rotuloImob: 'Aprovado' },
  em_execucao:   { icone: 'Wrench',        cor: '#2C5570', rotulo: 'Em execução',    rotuloImob: 'Em execução' },
  finalizado:    { icone: 'BadgeCheck',    cor: '#5A6459', rotulo: 'Finalizado',     rotuloImob: 'Finalizado' },
  rejeitado:     { icone: 'XCircle',       cor: '#A63A2D', rotulo: 'Recusado',       rotuloImob: 'Recusado' },
};

export const COR_ATRASO = '#C0392B';

export const PAGAMENTO_TEXTO = {
  aguardando: 'Aguardando pagamento',
  entrada_paga: 'Entrada paga',
  pago_total: 'Pago integral',
};
