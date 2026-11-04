import { categoriaSeguroFianca } from './seguroFianca.js';

// TABELA DE PREÇOS DO SEGURO FIANÇA (definida pelo dono). Para mudar um valor, é só editar aqui.
// Cada valor é POR ITEM do orçamento (uma linha = um preço).
export const TABELA_SEGURO_FIANCA = {
  parede: { mo: 150, ma: 100, rotulo: 'Pintura de parede' },
  porta: { mo: 150, ma: 100, rotulo: 'Pintura de porta' },
  teto: { mo: 100, ma: 100, rotulo: 'Pintura de teto' },
  // Planejado/gabinete DANIFICADO: a solução é trocar (cota-se um novo), por item.
  planejado: { mo: 250, ma: 350, rotulo: 'Planejado danificado (troca por novo)' },
};
// Os demais itens do seguro fiança (reparos, limpeza, outras pinturas) têm o preço-base elevado em 20%.
export const AUMENTO_DEMAIS_SEGURO_FIANCA = 0.2;

const norm = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RE_PLANEJADO = /planejad|gabinete|armario embutido|marcenaria|modulad|bancada de cozinha/;
const RE_DANO = /danific|quebrad|estragad|avariad|empenad|descolad|soltando|solto|desgastad|inchad|estufad|mofad|infiltrad|riscad|lascad|rasgad|dano|avaria|danos/;
// A tabela vale para REPINTURA de verdade. Mancha pontual de tinta, respingo ou cerâmica/azulejo com tinta é retoque/limpeza:
// esses ficam fora da tabela e seguem como "demais itens" (+20%).
const RE_REPINTURA = /repint|refaz|refeita|pintura nova|fazer pintura|pintar\b|pintura|falhas? (de|na|da) cobertura|descasc/;
const RE_SUPERFICIE_NAO_PINTADA = /ceramic|azulej|porcelanat|pastilha|vidro|\bpiso\b|respingo/;
const RE_TETO = /\bteto|\bforro/;
const RE_PORTA = /\bportas?\b/;
const RE_PAREDE = /\bparedes?\b/;

// Qual linha da tabela vale para este item? Devolve a chave ('parede' | 'porta' | 'teto' | 'planejado') ou null.
export function chaveTabelaSeguroFianca(it) {
  // o nome do local ("Sala Piso Superior: Teto") não conta: só o que vem depois dos dois pontos
  const semLocal = (t) => String(t || '').replace(/^.{1,80}?:\s+/, '');
  const servico = norm(semLocal(it?.servico));
  const tudo = norm(`${semLocal(it?.servico)} ${it?.descricao || ''}`);
  if (RE_PLANEJADO.test(tudo) && RE_DANO.test(tudo)) return 'planejado';
  if (categoriaSeguroFianca(it) !== 'Pintura geral') return null;
  if (!RE_REPINTURA.test(tudo) || RE_SUPERFICIE_NAO_PINTADA.test(tudo)) return null;
  // o que aparece primeiro no TÍTULO do item manda ("Sala: Teto" -> teto, mesmo que a descrição cite parede)
  for (const texto of [servico, tudo]) {
    const achados = [['teto', texto.search(RE_TETO)], ['porta', texto.search(RE_PORTA)], ['parede', texto.search(RE_PAREDE)]].filter(([, p]) => p >= 0);
    if (achados.length) return achados.sort((a, b) => a[1] - b[1])[0][0];
  }
  return null;
}

// Aplica a regra a uma lista de itens (os que o usuário mandou precificar).
// Devolve { fixos: [{id, mo, ma, origem:'regra', tabela}], demais: [itens que seguem para a IA] }.
export function separarPrecosSeguroFianca(itens) {
  const fixos = [];
  const demais = [];
  for (const it of itens || []) {
    const chave = chaveTabelaSeguroFianca(it);
    if (chave) fixos.push({ id: it.id, mo: TABELA_SEGURO_FIANCA[chave].mo, ma: TABELA_SEGURO_FIANCA[chave].ma, origem: 'regra', tabela: chave });
    else demais.push(it);
  }
  return { fixos, demais };
}

// +20% nos valores sugeridos para os demais itens (arredondado para o real).
export function elevarDemais(valores, fator = AUMENTO_DEMAIS_SEGURO_FIANCA) {
  return (valores || []).map((v) => ({ ...v, mo: Math.round(v.mo * (1 + fator)), ma: Math.round(v.ma * (1 + fator)), origem_base: v.origem, elevado: true }));
}
