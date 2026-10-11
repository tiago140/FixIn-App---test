// Filtro por imobiliária do Painel geral (só o dono). O valor vem da URL (?cliente=<id>) e SÓ vale se for o id de uma imobiliária
// que existe: qualquer outra coisa é ignorada (mostra todas), então nada vindo da URL chega ao banco sem ser conferido.
export function resolverFiltro(param, clientes) {
  const id = Array.isArray(param) ? param[0] : param;
  if (typeof id !== 'string' || !id) return null;
  return (clientes || []).find((c) => c.id === id) || null;
}

// Opções do seletor: todas as imobiliárias com quantos orçamentos cada uma tem. Desativada sem orçamento some (não tem o que ver).
export function opcoesFiltro(clientes, linhasContagem) {
  const qtd = {};
  (linhasContagem || []).forEach((l) => { qtd[l.cliente_id] = (qtd[l.cliente_id] || 0) + 1; });
  return (clientes || [])
    .map((c) => ({ id: c.id, nome: c.nome_empresa, ativo: c.ativo !== false, qtd: qtd[c.id] || 0 }))
    .filter((o) => o.ativo || o.qtd > 0)
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}

// Período do Painel (?de=AAAA-MM-DD&ate=AAAA-MM-DD, inclusive, horário de Brasília). Só vale data real; o resto é ignorado.
const DATA = /^\d{4}-\d{2}-\d{2}$/;
function dataReal(s) {
  const v = Array.isArray(s) ? s[0] : s;
  if (typeof v !== 'string' || !DATA.test(v)) return null;
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : v;
}
export function resolverPeriodo(de, ate) {
  let a = dataReal(de);
  let b = dataReal(ate);
  if (a && b && a > b) [a, b] = [b, a];
  const inicio = a ? `${a}T00:00:00-03:00` : null;
  let fim = null;
  if (b) {
    const prox = new Date(`${b}T12:00:00Z`);
    prox.setUTCDate(prox.getUTCDate() + 1);
    fim = `${prox.toISOString().slice(0, 10)}T00:00:00-03:00`;
  }
  return { de: a, ate: b, inicio, fim };
}

// Meses (AAAA-MM) que têm orçamento, do mais novo ao mais antigo, para o atalho "por mês".
export function mesesComOrcamento(linhas) {
  const set = new Set();
  (linhas || []).forEach((l) => {
    if (!l.criado_em) return;
    set.add(new Date(new Date(l.criado_em).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 7));
  });
  return [...set].sort().reverse();
}
