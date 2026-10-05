// Formato simples do texto do laudo, igual na tela e no PDF:
//   "# Título"     → faixa de seção
//   "- tópico"     → item com marcador
//   linha comum    → parágrafo (linhas seguidas viram um parágrafo; linha em branco separa)
export function parseTextoLaudo(texto) {
  const blocos = [];
  let par = [];
  const fechaParagrafo = () => {
    if (par.length) { blocos.push({ tipo: 'paragrafo', texto: par.join(' ') }); par = []; }
  };
  for (const bruta of String(texto || '').replace(/\r/g, '').split('\n')) {
    const l = bruta.trim();
    if (!l) { fechaParagrafo(); continue; }
    const titulo = /^#{1,3}\s+(.+)$/.exec(l);
    const topico = /^[-•]\s+(.+)$/.exec(l);
    if (titulo) { fechaParagrafo(); blocos.push({ tipo: 'titulo', texto: titulo[1].trim() }); }
    else if (topico) { fechaParagrafo(); blocos.push({ tipo: 'topico', texto: topico[1].trim() }); }
    else par.push(l);
  }
  fechaParagrafo();
  return blocos;
}

const numeros = (t) => (String(t || '').match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(',', '.'));

// A IA não pode mudar medidas, datas nem quantidades. Compara os números do texto original com os do texto melhorado.
export function conferirNumeros(original, melhorado) {
  const orig = new Set(numeros(original));
  const novo = new Set(numeros(melhorado));
  return {
    faltando: [...orig].filter((n) => !novo.has(n)),
    novos: [...novo].filter((n) => !orig.has(n)),
  };
}

// Limpa marcas de markdown que a IA às vezes coloca e que não fazem parte do formato do laudo.
export function limparSaidaIA(texto) {
  return String(texto || '')
    .replace(/```[a-z]*\n?|```/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\n)\s*\*\s+/g, '$1- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
