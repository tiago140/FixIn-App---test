// SEGURO FIANÇA: o orçamento precisa vir desmembrado, item a item, nesta ordem fixa:
// 1) Pintura geral  2) Reparos  3) Faxina e limpeza.
export const GRUPOS_SEGURO_FIANCA = ['Pintura geral', 'Reparos', 'Faxina e limpeza'];

const norm = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RE_PINTURA = /pintur|pintar|repint|tinta|massa corrida|massa fina|selador|textura|grafiato|lixar parede|emassar/;
const RE_LIMPEZA = /limpeza|limpar|faxina|higieniz|descontamin|lavagem|lavar o imovel|polimento/;

// Pintura e limpeza têm grupo próprio; todo o resto (hidráulica, elétrica, portas, gabinetes etc.) é reparo.
export function categoriaSeguroFianca(it) {
  if (GRUPOS_SEGURO_FIANCA.includes(it?.ambiente)) return it.ambiente;
  const t = norm(`${it?.servico || ''} ${it?.descricao || ''}`);
  if (RE_LIMPEZA.test(t)) return 'Faxina e limpeza';
  if (RE_PINTURA.test(t)) return 'Pintura geral';
  return 'Reparos';
}

const maiuscula = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const dividirTexto = (s) =>
  String(s || '').split(/\s*[;\n]+\s*|\s*,\s+(?=[A-Za-zÀ-ú])|\s+\+\s+/).map((p) => p.trim().replace(/[.,]+$/, '')).filter(Boolean);

let seq = 0;
const novoId = () => `novo-sf-${++seq}-${Date.now()}`;

// "Realizar pintura, gabinete danificado" vira dois itens. Os valores (MO/material) ficam no primeiro; os demais entram
// sem preço, para o dono precificar item a item.
export function dividirItemSeguroFianca(it) {
  let partes = dividirTexto(it.servico);
  if (partes.length > 1) {
    return partes.map((p, i) => ({ ...it, id: i === 0 ? it.id : novoId(), servico: maiuscula(p), descricao: i === 0 ? it.descricao || '' : '', mo: i === 0 ? it.mo : 0, ma: i === 0 ? it.ma : 0 }));
  }
  partes = dividirTexto(it.descricao);
  if (partes.length > 1) {
    // o serviço original vira o primeiro item e as demais ações da descrição viram itens próprios
    return partes.map((p, i) => ({ ...it, id: i === 0 ? it.id : novoId(), servico: i === 0 ? it.servico : maiuscula(p), descricao: i === 0 ? partes[0] : '', mo: i === 0 ? it.mo : 0, ma: i === 0 ? it.ma : 0 }));
  }
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
