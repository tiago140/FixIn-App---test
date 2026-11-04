// SEGURO FIANÇA: o orçamento precisa vir desmembrado, item a item, nesta ordem fixa:
// 1) Pintura geral  2) Reparos  3) Faxina e limpeza.
export const GRUPOS_SEGURO_FIANCA = ['Pintura geral', 'Reparos', 'Faxina e limpeza'];

const norm = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RE_PINTURA = /pintur|pintar|repint|tinta|massa corrida|massa fina|selador|textura|grafiato|lixar parede|emassar|falhas? (de|na|da) cobertura|descasc/;
const RE_LIMPEZA = /limpeza|limpar|faxina|higieniz|descontamin|lavagem|lavar o imovel|polimento/;

// Pintura e limpeza têm grupo próprio; todo o resto (hidráulica, elétrica, portas, gabinetes etc.) é reparo.
export function categoriaSeguroFianca(it) {
  if (GRUPOS_SEGURO_FIANCA.includes(it?.ambiente)) return it.ambiente;
  const t = norm(`${it?.servico || ''} ${it?.descricao || ''}`);
  // Pintura junto com limpeza no mesmo item ("Pintura: fazer limpeza") é sempre cobrado como pintura.
  if (RE_PINTURA.test(t)) return 'Pintura geral';
  if (RE_LIMPEZA.test(t)) return 'Faxina e limpeza';
  return 'Reparos';
}

const maiuscula = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// AÇÃO CORRETIVA: trecho que só diz o que fazer com o item anterior ("fazer repintura", "retirar", "providenciar").
// Não é um serviço novo: é a solução do MESMO problema. Se virasse item próprio seria cobrado duas vezes
// (foi o que aconteceu no ORC-0047: "Teto: pintura com manchas" + "Fazer repintura", cada um com o preço cheio).
// Só entram aqui as ações genéricas; "trocar fechadura" ou "instalar prateleira" continuam sendo itens próprios.
const RE_ACAO_SOLTA = /^(?:(?:fazer|refazer|realizar|executar|efetuar)\b.*|retirar\b.*|remover\b.*|providenciar\b.*|verificar\b.*|repintar\b.*|repintura\b.*|pintura nova\b.*|pintar\b.*|limpar\b.*|lavar\b.*)$/i;
const RE_ACAO_COM_OBJETO = /^(?:fazer|refazer|realizar|executar|efetuar|retirar|remover|providenciar|verificar|limpar|lavar|pintar|repintar)\s+(?:(?:os|as|a|o|uma|um|de|da|do|e|ou)\s+)*(?:repintura|pintura(?:\s+nova)?|limpeza(?:\s+geral)?|remo[cç][aã]o(?:\s+e\s+limpeza)?|reparos?(?:\s+necess[aá]rios?)?|manuten[cç][aã]o|retoque|ajustes?|conserto)?(?:\s+(?:e|ou)\s+.*)?$/i;
export function ehAcaoSolta(texto) {
  const t = norm(texto).replace(/[.,;:\s]+$/, '').trim();
  if (!t) return false;
  const palavras = t.split(/\s+/).length;
  if (RE_ACAO_COM_OBJETO.test(t) || /^(retirar|remover) ou verificar\b/.test(t)) return true;
  return palavras <= 3 && RE_ACAO_SOLTA.test(t);
}

const SEPARADOR = /\s*[;\n]+\s*|\s*,\s+(?=[A-Za-zÀ-ú])|\s+\+\s+/;
// vírgula/ponto SEM espaço antes de uma ação ("sujeira,fazer limpeza") também separa — mas só diante de verbo de ação
const ANTES_DE_ACAO = /\s*[,.]\s*(?=(?:fazer|refazer|realizar|retirar|remover|providenciar|verificar|repintar|limpar)\b)/i;
const aparar = (p) => p.trim().replace(/[.,]+$/, '');
const dividirTexto = (s) =>
  String(s || '').split(SEPARADOR).flatMap((p) => p.split(ANTES_DE_ACAO)).map(aparar).filter(Boolean);

// Agrupa as partes: uma ação solta NUNCA vira item; ela fica junto da parte que vem antes dela.
// Devolve [{ texto, acoes: [..] }].
function agruparPartes(partes) {
  const grupos = [];
  for (const p of partes) {
    if (grupos.length && ehAcaoSolta(p)) grupos[grupos.length - 1].acoes.push(p);
    else grupos.push({ texto: p, acoes: [] });
  }
  return grupos;
}
const textoDoGrupo = (g) => [g.texto, ...g.acoes].join(', ');

let seq = 0;
const novoId = () => `novo-sf-${++seq}-${Date.now()}`;

// "Realizar pintura, gabinete danificado" vira dois itens (problemas DIFERENTES). Os valores (MO/material) ficam no
// primeiro; os demais entram sem preço, para o dono precificar item a item.
// "Teto: pintura com manchas, fazer repintura" continua UM item só (o problema e a solução dele).
export function dividirItemSeguroFianca(it) {
  let grupos = agruparPartes(dividirTexto(it.servico));
  if (grupos.length > 1) {
    return grupos.map((g, i) => ({ ...it, id: i === 0 ? it.id : novoId(), servico: maiuscula(textoDoGrupo(g)), descricao: i === 0 ? it.descricao || '' : '', mo: i === 0 ? it.mo : 0, ma: i === 0 ? it.ma : 0 }));
  }
  grupos = agruparPartes(dividirTexto(it.descricao));
  if (grupos.length > 1) {
    // o serviço original vira o primeiro item e os demais PROBLEMAS da descrição viram itens próprios
    return grupos.map((g, i) => ({ ...it, id: i === 0 ? it.id : novoId(), servico: i === 0 ? it.servico : maiuscula(textoDoGrupo(g)), descricao: i === 0 ? textoDoGrupo(g) : '', mo: i === 0 ? it.mo : 0, ma: i === 0 ? it.ma : 0 }));
  }
  if (grupos.length === 1 && grupos[0].acoes.length) return [{ ...it, descricao: textoDoGrupo(grupos[0]) }];
  return [it];
}

// Organiza o orçamento no formato do seguro fiança. dividir=true separa itens compostos (usado ao criar/organizar);
// no PDF usa dividir=false (só agrupa e ordena, nunca inventa itens sem preço).
export function organizarSeguroFianca(itens, { dividir = false } = {}) {
  const base = dividir ? (itens || []).flatMap(dividirItemSeguroFianca) : [...(itens || [])];
  const marcados = base.map((it, i) => {
    const grupo = categoriaSeguroFianca(it);
    const jaNoGrupo = GRUPOS_SEGURO_FIANCA.includes(it.ambiente);
    const local = !jaNoGrupo && it.ambiente && it.ambiente !== 'Geral' ? `${it.ambiente}: ` : '';
    return { ordem: i, grupo, item: jaNoGrupo ? it : { ...it, ambiente: grupo, servico: `${local}${it.servico}` } };
  });
  marcados.sort((a, b) => GRUPOS_SEGURO_FIANCA.indexOf(a.grupo) - GRUPOS_SEGURO_FIANCA.indexOf(b.grupo) || a.ordem - b.ordem);
  return marcados.map((m) => m.item);
}

// ---------- Orçamentos que JÁ estão com ações soltas (ex.: ORC-0047) ----------
const partirLocal = (servico) => {
  const m = String(servico || '').match(/^(.{1,80}?):\s+(.+)$/);
  return m ? { local: m[1].trim(), resto: m[2].trim() } : { local: '', resto: String(servico || '').trim() };
};

// Junta cada "ação solta" (item que só diz "Fazer repintura", "Retirar"...) ao item imediatamente anterior do MESMO
// local e do MESMO grupo. O preço fica com o do item mais caro (nunca soma): era o mesmo serviço cobrado duas vezes.
// O que não tem item anterior no mesmo local fica como está e é apontado por auditarSeguroFianca().
export function unirAcoesSoltas(itens) {
  const saida = [];
  let unidas = 0;
  let valorEvitado = 0;
  for (const it of itens || []) {
    const { local, resto } = partirLocal(it.servico);
    const anterior = saida[saida.length - 1];
    const ant = anterior ? partirLocal(anterior.servico) : null;
    if (anterior && ehAcaoSolta(resto) && !String(it.descricao || '').trim() && ant.local === local && anterior.ambiente === it.ambiente) {
      // fica com o PAR de valores do item mais caro (nunca mistura MO de um com material do outro)
      const totalAnt = (Number(anterior.mo) || 0) + (Number(anterior.ma) || 0);
      const totalAcao = (Number(it.mo) || 0) + (Number(it.ma) || 0);
      valorEvitado += Math.min(totalAnt, totalAcao);
      if (totalAcao > totalAnt) { anterior.mo = Number(it.mo) || 0; anterior.ma = Number(it.ma) || 0; }
      const frase = resto.toLowerCase();
      if (!norm(anterior.descricao).includes(norm(frase))) anterior.descricao = [anterior.descricao, frase].filter(Boolean).join(', ');
      unidas++;
      continue;
    }
    saida.push({ ...it });
  }
  return { itens: saida, unidas, valorEvitado };
}

// Procura o que ainda parece errado e devolve uma lista para a equipe conferir ANTES de enviar ao cliente.
export function auditarSeguroFianca(itens) {
  const avisos = [];
  const lista = itens || [];
  const vistos = new Map();
  lista.forEach((it, i) => {
    const { local, resto } = partirLocal(it.servico);
    const nome = `${it.servico}${it.descricao ? ' — ' + it.descricao : ''}`;
    if (!String(it.descricao || '').trim() && ehAcaoSolta(resto)) {
      avisos.push({ tipo: 'acao_solta', indice: i, texto: `"${it.servico}" é só uma ação, sem dizer o que consertar. Junte ao item de ${local || 'origem'} para não cobrar duas vezes.` });
    }
    if (/\s\d{1,2}\.\s+[A-ZÀ-Ý][a-zà-ÿ]/.test(nome)) {
      avisos.push({ tipo: 'titulo_colado', indice: i, texto: `"${it.servico}" parece ter o título de outra seção da vistoria colado no texto. Confira o local e separe.` });
    }
    const chave = norm(`${it.ambiente}|${it.servico}|${it.descricao}`).replace(/\s+/g, ' ');
    if (vistos.has(chave)) avisos.push({ tipo: 'duplicado', indice: i, texto: `"${it.servico}" aparece repetido (mesmo local, mesmo texto).` });
    else vistos.set(chave, i);
  });
  return avisos;
}

// Caminho único para criar/organizar: separa problemas diferentes, agrupa nas 3 seções e junta as ações soltas.
export function prepararSeguroFianca(itens) {
  const organizados = organizarSeguroFianca(itens, { dividir: true });
  return unirAcoesSoltas(organizados);
}
