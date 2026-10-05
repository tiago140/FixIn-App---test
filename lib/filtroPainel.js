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
