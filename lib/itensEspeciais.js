// Itens que pedem ATENÇÃO na hora de orçar (regra do dono): aquecedor, ar condicionado, papel de parede,
// planejados e gabinetes, eletrodomésticos, persianas e itens de grande dificuldade.
// Para mudar a lista, é só editar as palavras abaixo (sem acento e em minúsculas).
const norm = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const CATEGORIAS_ESPECIAIS = [
  { id: 'aquecedor', rotulo: 'Aquecedor', re: /aquecedor|boiler|passagem a gas|aquecimento a gas/ },
  { id: 'ar', rotulo: 'Ar condicionado', re: /ar[ -]?condicionado|\bsplit\b|condensadora|evaporadora|\bbtus?\b/ },
  { id: 'papel', rotulo: 'Papel de parede', re: /papel de parede|papel parede|papel de paredes/ },
  { id: 'planejados', rotulo: 'Planejados e gabinetes', re: /planejad|gabinete|armario embutido|marcenaria|modulad|bancada de cozinha/ },
  { id: 'eletro', rotulo: 'Eletrodoméstico', re: /eletrodomestic|geladeira|refrigerador|fogao|cooktop|\bforno\b|micro[ -]?ondas|maquina de lavar|lava[ -]?(loucas?|roupas?)|lavadora|secadora|coifa|depurador|exaustor|adega|freezer|lava e seca/ },
  { id: 'persiana', rotulo: 'Persianas', re: /persiana|cortina|blackout|rolo de cortina/ },
  { id: 'dificil', rotulo: 'Grande dificuldade', re: /telhado|calha|laje|estrutural|trinca|rachadura|infiltracao|umidade|impermeabiliz|vazamento|hidraulica|rede eletrica|quadro de (luz|distribuicao)|forro de gesso|drywall|troca de piso|piso completo|demolicao|reboco|encanamento|esgoto/ },
];

// Devolve a categoria do item (ou null). Procura no serviço, na descrição e no ambiente.
export function categoriaEspecial(it) {
  const texto = norm(`${it?.servico || ''} ${it?.descricao || ''} ${it?.ambiente || ''}`);
  if (!texto.trim()) return null;
  return CATEGORIAS_ESPECIAIS.find((c) => c.re.test(texto)) || null;
}

// Resumo do orçamento: quantos itens especiais e de quais categorias.
export function resumoEspeciais(itens) {
  const porCategoria = new Map();
  let total = 0;
  for (const it of itens || []) {
    const c = categoriaEspecial(it);
    if (!c) continue;
    total++;
    porCategoria.set(c.rotulo, (porCategoria.get(c.rotulo) || 0) + 1);
  }
  return { total, categorias: [...porCategoria.entries()].map(([rotulo, qtd]) => ({ rotulo, qtd })) };
}
