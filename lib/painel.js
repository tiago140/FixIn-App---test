import { estaAtrasado } from './format';

// Mesmas 6 etapas e cores do protótipo.
export const CORES_ETAPAS = ['#C0392B', '#B8862E', '#3B6B8C', '#3F7A5E', '#5A6459', '#A63A2D'];

export const ROTULOS_ETAPAS = {
  master: ['Em atraso', 'Em preparação', 'Aguardando imobiliária', 'Aprovado/Em execução', 'Finalizado', 'Rejeitado'],
  imobiliaria: ['Em atraso', 'Em análise pela FixIn', 'Aguardando sua aprovação', 'Aprovado/Em execução', 'Finalizado', 'Rejeitado'],
};

// Recebe a lista de orçamentos JÁ com o campo `total` calculado.
// As etapas são exclusivas: um orçamento em atraso não é contado de novo em outra etapa.
export function agruparPorEtapa(lista) {
  const atrasados = lista.filter(estaAtrasado);
  const livres = lista.filter((o) => !estaAtrasado(o));
  return {
    atrasados,
    internos: livres.filter((o) => ['pendente', 'em_preparacao'].includes(o.status)),
    aguardando: livres.filter((o) => o.status === 'enviado'),
    andamento: livres.filter((o) => ['aprovado', 'em_execucao'].includes(o.status)),
    finalizados: livres.filter((o) => o.status === 'finalizado'),
    rejeitados: livres.filter((o) => o.status === 'rejeitado'),
  };
}

export const CHAVES_ETAPAS = ['atrasados', 'internos', 'aguardando', 'andamento', 'finalizados', 'rejeitados'];

const soma = (lista) => lista.reduce((a, o) => a + (o.total || 0), 0);

export function resumoPorEtapa(grupos) {
  return CHAVES_ETAPAS.map((k) => ({ chave: k, qtd: grupos[k].length, valor: soma(grupos[k]) }));
}

// Últimos 6 meses (o atual incluído): quantos orçamentos foram criados e quanto valem.
export function serieUltimosMeses(lista, agora = new Date(), quantidade = 6) {
  const meses = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    const ref = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    meses.push({
      ano: ref.getFullYear(),
      mes: ref.getMonth(),
      rotulo: ref.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    });
  }
  return meses.map((m) => {
    const doMes = lista.filter((o) => {
      const d = new Date(o.criado_em);
      return d.getFullYear() === m.ano && d.getMonth() === m.mes;
    });
    return { rotulo: m.rotulo, qtd: doMes.length, valor: soma(doMes) };
  });
}

export const ESTAGIOS_APROVADO = ['aprovado', 'em_execucao', 'finalizado'];

// Há pagamento pendente? A visão da imobiliária já traz isso como sim/não (sem revelar valor);
// para o dono calculamos pelos valores.
export function temPendencia(o) {
  if (typeof o.pendente_pagamento === 'boolean') return o.pendente_pagamento;
  return ESTAGIOS_APROVADO.includes(o.status) && (Number(o.valor_pago) || 0) < (Number(o.total) || 0);
}

// Funil: criados ⊇ aprovados ⊇ em execução. Só quantidades.
export function contagensFunil(lista) {
  return {
    criados: lista.length,
    aprovados: lista.filter((o) => ESTAGIOS_APROVADO.includes(o.status)).length,
    emExecucao: lista.filter((o) => o.status === 'em_execucao').length,
    pendencias: lista.filter(temPendencia).length,
    aguardando: lista.filter((o) => o.status === 'enviado').length,
    atrasados: lista.filter(estaAtrasado).length,
  };
}
