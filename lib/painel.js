import { estaAtrasado } from './format';

// Mesmas 6 etapas e cores do protótipo.
export const CORES_ETAPAS = ['#C0392B', '#D9A441', '#B8862E', '#3B6B8C', '#3F7A5E', '#5A6459', '#A63A2D'];

export const ROTULOS_ETAPAS = {
  master: ['Em atraso', 'Novas solicitações', 'Em análise (FixIn)', 'Aguardando imobiliária', 'Aprovado/Em execução', 'Finalizado', 'Rejeitado'],
  imobiliaria: ['Em atraso', 'Solicitados (a FixIn vai orçar)', 'Em análise pela FixIn', 'Aguardando sua aprovação', 'Aprovado/Em execução', 'Finalizado', 'Rejeitado'],
};

// Recebe a lista de orçamentos JÁ com o campo `total` calculado.
// As etapas são exclusivas: um orçamento em atraso não é contado de novo em outra etapa.
export function agruparPorEtapa(lista) {
  const atrasados = lista.filter(estaAtrasado);
  const livres = lista.filter((o) => !estaAtrasado(o));
  return {
    atrasados,
    solicitados: livres.filter((o) => o.status === 'pendente'),
    emAnalise: livres.filter((o) => o.status === 'em_preparacao'),
    aguardando: livres.filter((o) => o.status === 'enviado'),
    andamento: livres.filter((o) => ['aprovado', 'em_execucao'].includes(o.status)),
    finalizados: livres.filter((o) => o.status === 'finalizado'),
    rejeitados: livres.filter((o) => o.status === 'rejeitado'),
  };
}

export const CHAVES_ETAPAS = ['atrasados', 'solicitados', 'emAnalise', 'aguardando', 'andamento', 'finalizados', 'rejeitados'];

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

// ================= O TODO: onde está o dinheiro =================
// Aqui as situações são por STATUS (um orçamento aprovado com pagamento atrasado continua contado como aprovado;
// o atraso aparece à parte). Assim a soma das situações é sempre o total.
export const SITUACOES = [
  { chave: 'pendente', cor: '#D9A441', rotulo: { master: 'Novas solicitações', imobiliaria: 'Solicitados (a FixIn vai orçar)' } },
  { chave: 'em_preparacao', cor: '#B8862E', rotulo: { master: 'Em análise pela FixIn', imobiliaria: 'Em análise pela FixIn' } },
  { chave: 'enviado', cor: '#3B6B8C', rotulo: { master: 'Aguardando aprovação da imobiliária', imobiliaria: 'Aguardando a sua aprovação' } },
  { chave: 'aprovado', cor: '#3F7A5E', rotulo: { master: 'Aprovados (a iniciar)', imobiliaria: 'Aprovados (a iniciar)' } },
  { chave: 'em_execucao', cor: '#2C5570', rotulo: { master: 'Em execução', imobiliaria: 'Em execução' } },
  { chave: 'finalizado', cor: '#5A6459', rotulo: { master: 'Finalizados', imobiliaria: 'Finalizados' } },
  { chave: 'rejeitado', cor: '#A63A2D', rotulo: { master: 'Recusados', imobiliaria: 'Recusados' } },
];

const valorDe = (o) => Number(o.total) || 0;
const somar = (l) => l.reduce((a, o) => a + valorDe(o), 0);

export function resumoPorSituacao(lista) {
  return SITUACOES.map((s) => {
    const itens = lista.filter((o) => o.status === s.chave);
    return { chave: s.chave, qtd: itens.length, valor: somar(itens), semPreco: itens.filter((o) => valorDe(o) === 0).length };
  });
}

// Quanto tempo cada orçamento "enviado" está parado esperando resposta (desde a última atualização dele).
export const FAIXAS_ESPERA = [
  { chave: 'a', rotulo: 'até 3 dias', max: 3 },
  { chave: 'b', rotulo: '4 a 7 dias', max: 7 },
  { chave: 'c', rotulo: '8 a 14 dias', max: 14 },
  { chave: 'd', rotulo: 'mais de 14 dias', max: Infinity },
];

export function diasParado(o, agora = new Date()) {
  const t = new Date(o.atualizado_em || o.criado_em).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((agora.getTime() - t) / 86400000));
}

export function faixaEspera(o, agora = new Date()) {
  if (o.status !== 'enviado') return null;
  const d = diasParado(o, agora);
  return FAIXAS_ESPERA.find((f) => d <= f.max).chave;
}

export function visaoDoTodo(lista, agora = new Date()) {
  const por = (st) => lista.filter((o) => st.includes(o.status));
  const aguardando = por(['enviado']);
  const aOrcar = por(['pendente', 'em_preparacao']);
  const aprovados = por(ESTAGIOS_APROVADO);
  const recusados = por(['rejeitado']);
  const comPendencia = aprovados.filter(temPendencia);
  const decididos = aprovados.length + recusados.length;
  const total = somar(lista);
  const espera = FAIXAS_ESPERA.map((f) => {
    const itens = aguardando.filter((o) => faixaEspera(o, agora) === f.chave);
    return { chave: f.chave, rotulo: f.rotulo, qtd: itens.length, valor: somar(itens) };
  });
  return {
    total: { qtd: lista.length, valor: total },
    aguardando: { qtd: aguardando.length, valor: somar(aguardando), maisAntigoDias: aguardando.reduce((m, o) => Math.max(m, diasParado(o, agora)), 0) },
    aOrcar: { qtd: aOrcar.length, valor: somar(aOrcar), semPreco: aOrcar.filter((o) => valorDe(o) === 0).length },
    aprovados: {
      qtd: aprovados.length, valor: somar(aprovados),
      recebido: aprovados.reduce((a, o) => a + (Number(o.valor_pago) || 0), 0),
      aReceber: comPendencia.reduce((a, o) => a + Math.max(0, valorDe(o) - (Number(o.valor_pago) || 0)), 0),
    },
    recusados: { qtd: recusados.length, valor: somar(recusados) },
    taxaAprovacao: decididos > 0 ? Math.round((aprovados.length / decididos) * 100) : null,
    decididos,
    atraso: { qtd: lista.filter(estaAtrasado).length, valor: lista.filter(estaAtrasado).reduce((a, o) => a + Math.max(0, valorDe(o) - (Number(o.valor_pago) || 0)), 0) },
    espera,
  };
}
