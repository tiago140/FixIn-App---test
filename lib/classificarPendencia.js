// Classifica cada pendência lida de um laudo de vistoria (ex.: MOV/LAG) no tipo de serviço que ela pede,
// e reescreve a linha no vocabulário do orçamento: "piscina suja" -> "Limpeza: piscina suja".
// As regras vêm do banco (tabela vistoria_regras, editável pela equipe). Se o banco ainda não tem a tabela
// ou está vazio, vale REGRAS_PADRAO — o sistema nunca fica sem regra.
//
// Cada regra: { prioridade, padrao, acao, cliente_id? }. A primeira regra (menor prioridade) que casar vence.
// "padrao" é uma expressão regular aplicada ao texto SEM acentos e em minúsculas.

export const ACOES = {
  limpeza: { rotulo: 'Limpeza', prefixo: 'Limpeza' },
  reparo: { rotulo: 'Reparo', prefixo: 'Reparo' },
  pintura: { rotulo: 'Pintura', prefixo: 'Pintura/retoque' },
  reposicao: { rotulo: 'Reposição', prefixo: 'Reposição' },
  verificar: { rotulo: 'Verificar', prefixo: 'Verificar' },
};

export const REGRAS_PADRAO = [
  // O que falta ou foi levado/retirado: repor.
  { prioridade: 10, acao: 'reposicao', padrao: 'removid|retirad|sem chave|sem grade|sem tampa|sem separador|faltando|furtad|levad' },
  // Coisas que só dá para conferir com teste ou visita.
  { prioridade: 20, acao: 'verificar', padrao: 'sem gas para teste|funcionando parcialmente|funcionamento parcial|baixa luminosidade' },
  // Pintura nova que não foi refeita ou ficou com falhas: pintura, mesmo que o texto cite sujidade.
  { prioridade: 25, acao: 'pintura', padrao: 'pintura nova|nao foram pintad|nao foi pintad|falhas? na cobertura|pintura (inicial|descascad)|descascad.*pintura' },
  // Dano físico: reparo, mesmo que o texto também cite sujidade (ex.: "lascas e estufamento, e sujidades").
  { prioridade: 28, acao: 'reparo', padrao: 'lasca|estufament|danificad|quebrad|vazament|sem funcionamento|sem tensao|solto|soltando|desregulad|nao abre|pingando' },
  // Sujeira declarada: limpeza (vem antes da pintura: "parede com sujidades/barro" é limpeza, não repintura).
  { prioridade: 30, acao: 'limpeza', padrao: 'sujo|suja|sujidade|sujeira|barro|mato|etiqueta|fita (colante|adesiva)|resquicio|cola\\b|entupid|pertences|inseto|churrasqueira' },
  // Parede e teto manchados, marcas de reparo, cor diferente ou furos tampados: pintura.
  { prioridade: 40, acao: 'pintura', padrao: 'pintura|dualidade de tons|marca[s]? de reparo|(mancha|escorrido)s?.*(parede|teto|rodape)|(parede|teto|rodape)s?.*mancha|furo[s]? tampado[s]?|furos? com bucha|buchas' },
  // Outras manchas (piso, cortina, pedra, azulejo): limpeza.
  { prioridade: 50, acao: 'limpeza', padrao: 'mancha' },
  // Todo o resto (danificado, lascas, estufamento, solto, quebrado, vazamento, sem funcionamento, riscos…): reparo.
  { prioridade: 90, acao: 'reparo', padrao: '.' },
];

function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Regras do cliente valem antes das gerais, na mesma prioridade. Regra inválida é ignorada (nunca derruba a leitura).
export function prepararRegras(regras, clienteId) {
  const lista = (regras && regras.length ? regras : REGRAS_PADRAO)
    .filter((r) => r && r.ativo !== false && ACOES[r.acao] && (!r.cliente_id || r.cliente_id === clienteId))
    .map((r) => {
      try { return { ...r, _re: new RegExp(String(r.padrao).slice(0, 200), 'i') }; } catch (e) { return null; }
    })
    .filter(Boolean);
  lista.sort((a, b) => (a.prioridade - b.prioridade) || ((b.cliente_id ? 1 : 0) - (a.cliente_id ? 1 : 0)));
  return lista;
}

export function classificarTexto(texto, regrasPreparadas) {
  const t = semAcento(texto);
  const r = regrasPreparadas.find((x) => x._re.test(t));
  return r ? r.acao : 'reparo';
}

const minuscula1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// Devolve novos itens (não altera os recebidos): servico reescrito e campo "acao".
export function classificarPendencias(itens, regras, clienteId) {
  const prep = prepararRegras(regras, clienteId);
  return (itens || []).map((it) => {
    const acao = classificarTexto(`${it.ambiente || ''} ${it.servico || ''}`, prep);
    return { ...it, acao, servico: `${ACOES[acao].prefixo}: ${minuscula1(it.servico || '')}` };
  });
}

export function contarPorAcao(itens) {
  const c = {};
  (itens || []).forEach((it) => { if (it.acao) c[it.acao] = (c[it.acao] || 0) + 1; });
  return c;
}
