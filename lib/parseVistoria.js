/* ======================================================================
   LEITOR DE VISTORIAS / ORÇAMENTOS EM PDF  (núcleo compartilhado)
   - Reconhece 6 formatos, roda TODOS e escolhe o que aproveita mais o texto.
   - Independe da ordem em que o leitor de PDF entrega as linhas quebradas.
   - "Contabilidade de linhas": toda linha relevante do PDF precisa virar item
     ou ser reconhecida como cabeçalho/rodapé. O que sobrar é reportado em
     itens.diagnostico.naoLidas — nunca é descartado em silêncio.
   Escrito em ES5 de propósito (roda igual no navegador e no servidor).
   ====================================================================== */

var VT_RE_PAGINA = /^(P[aá]gina|Pag\.|\d+\s*\/\s*\d+$)/i;
var VT_RE_RODAPE_GERAL = /^(Observa[cç][aã]o|TOTAL|Total|Soma|Assinatura)/;
var VT_RE_META = /^(Cliente|Data |Data:|Endere[cç]o|Im[oó]vel|Validade|Prazo|Observa|Foram removidos|Consolida|Itens separados|Total|TOTAL|Soma|M[aã]o de obra|Nota|Vistoriador|Ambientes:|LISTA|OR[CÇ]AMENTO|SERVI[CÇ]O\s+MO|Local\s*\/|Item$|It$|Vistoria|A soma|Rua |Avenida |Av\. )/i;

function vtNormalizar(texto){
  var t = String(texto || '').replace(/\u00a0/g, ' ');
  // emendas comuns da extração de PDF: "...Gourmet29. Substituir" e "...R$ 216,0021, Móveis"
  t = t.replace(/([a-zà-ÿ])(\d+\.\s)/g, '$1\n$2');
  t = t.replace(/(,\d{2})(\d+,\s)/g, '$1\n$2');
  return t.split(/\r?\n/).map(function(l){ return l.replace(/[ \t]+/g, ' ').trim(); }).filter(Boolean);
}
function vtSoMaiusculas(l){
  var letras = l.replace(/[^A-Za-zÀ-ÿ]/g, '');
  return letras.length > 0 && letras === letras.toUpperCase();
}
function vtNumeroBRL(s){
  s = String(s).trim();
  if (s === '' || s === '—' || s === '-') return 0;
  return parseFloat(s.replace(/^R\$\s*/, '').replace(/\./g, '').replace(',', '.')) || 0;
}
function vtSemAcento(s){ return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s; }
function vtTokens(s){ return vtSemAcento(String(s).toLowerCase()).match(/[a-z]{4,}/g) || []; }
// Uma linha "N.N - texto:" tem a cara de item do Formato 1 (dois níveis + dois pontos) — se o Formato 3
// (lista numerada de UM nível só) tentar engolir essa linha como continuação, ele acaba colando
// várias seções inteiras numa só. Melhor recusar e deixar sobrar, pra o Formato 1 vencer a comparação.
var VT_RE_PARECE_ITEM_2NIVEIS = /^\d+\.\d+\s*[-–—].*:/;
function vtContinuacaoValida(l){ return !vtSoMaiusculas(l) && !VT_RE_PAGINA.test(l) && !VT_RE_RODAPE_GERAL.test(l) && !VT_RE_PARECE_ITEM_2NIVEIS.test(l); }

/* ---------- Formato 1: "N. Ambiente" + "N.N - Componente: descrição" ----------
   Alguns laudos (ex.: AE Patrimônio) têm uma seção geral que usa mais um nível:
   "N. Imóvel" -> "N.N - Ambientes" (só um rótulo, sem dois pontos) -> "N.N.N - Observação: texto".
   Esses dois casos extras viram itens também, em vez de serem descartados em silêncio. */
var VT_RE_AMBIENTE1 = /^(\d+)\.\s+([A-Za-zÀ-ÿ0-9 \/\-.]+)$/;
var VT_RE_ITEM1 = /^(\d+)\.(\d+)\s*-\s*([^:]+):\s*(.+)$/;
var VT_RE_SUBROTULO1 = /^(\d+)\.(\d+)\s*-\s*([A-Za-zÀ-ÿ0-9 \/\-.]+)$/;
var VT_RE_SUBITEM1 = /^(\d+)\.(\d+)\.(\d+)\s*-\s*([^:]+):\s*(.+)$/;
function vtFormato1(linhas, ctx){
  var itens = [], ambiente = null, ultimo = null;
  for (var i = 0; i < linhas.length; i++){
    var l = linhas[i];
    var msi = l.match(VT_RE_SUBITEM1);                       // "N.N.N - Rótulo: texto" (3 níveis, com dois pontos)
    if (msi){ ultimo = {ambiente: ambiente || 'Geral', servico: msi[4].trim(), descricao: msi[5].trim(), mo: 0, ma: 0}; itens.push(ultimo); ctx.i(i); continue; }
    var mi = l.match(VT_RE_ITEM1);
    if (mi){ ultimo = {ambiente: ambiente || 'Geral', servico: mi[3].trim(), descricao: mi[4].trim(), mo: 0, ma: 0}; itens.push(ultimo); ctx.i(i); continue; }
    var mm = l.match(VT_RE_AMBIENTE1);
    if (mm){ ambiente = mm[2].trim(); ultimo = null; ctx.u(i); continue; }
    var msr = l.match(VT_RE_SUBROTULO1);                     // "N.N - Rótulo" (2 níveis, sem dois pontos) — só um sub-título, não gera item
    if (msr){ ultimo = null; ctx.u(i); continue; }
    if (ultimo && vtContinuacaoValida(l)){ ultimo.descricao += ' ' + l; ctx.i(i); continue; }   // texto que quebrou de linha
    ultimo = null;
  }
  return itens;
}

/* ---------- Formato 2: "N.N Ambiente – Componente: descrição  R$ valor" ---------- */
var VT_RE_ITEM2 = /^(\d+)\.(\d+)\s+(.+)$/;
var VT_RE_VALOR2 = /R\$\s*[\d.,]+/g;
function vtFormato2(linhas, ctx){
  var itens = [], i = 0;
  while (i < linhas.length){
    var m = linhas[i].match(VT_RE_ITEM2);
    if (!m){ i++; continue; }
    var resto = m[3], usados = [i], j = i + 1;
    while (j < linhas.length && !VT_RE_ITEM2.test(linhas[j]) && !VT_RE_RODAPE_GERAL.test(linhas[j]) && !vtSoMaiusculas(linhas[j])){
      resto += ' ' + linhas[j]; usados.push(j); j++;
    }
    var limpo = resto.replace(VT_RE_VALOR2, '').replace(/\s+/g, ' ').trim();
    var partes = limpo.split(/\s+[–—-]\s+/);
    if (partes.length >= 2){
      var resto2 = partes.slice(1).join(' - ');
      var m2 = resto2.match(/^([^:]+):\s*(.+)$/);
      itens.push({ambiente: partes[0].trim(), servico: m2 ? m2[1].trim() : resto2.trim(), descricao: m2 ? m2[2].trim() : '', mo: 0, ma: 0});
      usados.forEach(function(x){ ctx.i(x); });
    }
    i = j;
  }
  return itens;
}

/* ---------- Formato 3: ambiente "N. Nome" (sem ponto final) + itens "N. Componente — descrição." ---------- */
var VT_RE_NUM = /^(\d+)\.\s+(.+)$/;
function vtFormato3(linhas, ctx){
  var itens = [], ambiente = null, reg = null, ultimoN = null;
  function fechar(){
    if (!reg) return;
    var t = reg.partes.join(' ').replace(/\s+/g, ' ').trim();
    var completo = /\.$/.test(t);
    if (completo || reg.idx.length > 1){
      var sp = completo ? t.slice(0, -1).trim() : t;
      var ps = sp.split(/\s+[—–]\s+/);
      itens.push({ambiente: ambiente || 'Geral', servico: ps.length >= 2 ? ps[0].trim() : sp, descricao: ps.length >= 2 ? ps.slice(1).join(' - ').trim() : '', mo: 0, ma: 0, _n: reg.n});
      ultimoN = reg.n;
    } else {
      ambiente = t;
    }
    var ehItem = completo || reg.idx.length > 1;
    var suspeito = !ehItem && ultimoN !== null && reg.n === ultimoN + 1;   // parece o PRÓXIMO item, mas sem ponto final
    reg.idx.forEach(function(x){ if (ehItem) ctx.i(x); else if (!suspeito) ctx.u(x); });
    reg = null;
  }
  for (var i = 0; i < linhas.length; i++){
    var l = linhas[i];
    var m = l.match(VT_RE_NUM);
    if (m){ fechar(); reg = {n: parseInt(m[1], 10), partes: [m[2]], idx: [i]}; continue; }
    if (reg && !/\.$/.test(reg.partes.join(' ').trim()) && vtContinuacaoValida(l)){ reg.partes.push(l); reg.idx.push(i); continue; }
    fechar();
  }
  fechar();
  return itens;
}

/* ---------- Formato 4: "N, Componente: descrição, MO: R$ x | MA: R$ y | Total: R$ z" ---------- */
var VT_RE_ITEM4_START = /^(\d+),\s*[A-Za-zÀ-ÿ]/;
var VT_RE_ITEM4_COMPLETO = /^(\d+),\s*([^:]+):\s*(.+?),\s*MO:\s*R\$\s*([\d.]+,\d{2})\s*\|\s*MA:\s*R\$\s*([\d.]+,\d{2})\s*\|\s*Total:\s*R\$\s*([\d.]+,\d{2})/;
var VT_RE_RODAPE4 = /^(TOTAL|M[aã]o de obra|Total original|Foram removidos|OR[CÇ]AMENTO|Cliente:)/i;
function vtFormato4(linhas, ctx){
  var itens = [], ambiente = null, i = 0;
  while (i < linhas.length){
    var l = linhas[i];
    if (VT_RE_RODAPE4.test(l)){ ctx.u(i); i++; continue; }
    if (!VT_RE_ITEM4_START.test(l)){
      if (l.indexOf(':') === -1 && l.length < 60){ ambiente = l; ctx.u(i); }
      i++; continue;
    }
    var acc = l, idx = [i], j = i + 1;
    while (!VT_RE_ITEM4_COMPLETO.test(acc) && j < linhas.length && !VT_RE_ITEM4_START.test(linhas[j])){ acc += ' ' + linhas[j]; idx.push(j); j++; }
    var m = acc.match(VT_RE_ITEM4_COMPLETO);
    if (m){
      itens.push({ambiente: ambiente || 'Geral', servico: m[2].trim(), descricao: m[3].trim(), mo: vtNumeroBRL(m[4]), ma: vtNumeroBRL(m[5]), _n: parseInt(m[1], 10)});
      idx.forEach(function(x){ ctx.i(x); });
      i = j;
    } else { i++; }
  }
  return itens;
}

/* ---------- Formato 5: tabela "SERVIÇO | MO | MATERIAL | TOTAL | ORIGEM" (ambiente em MAIÚSCULAS) ----------
   Uma linha da tabela pode chegar em qualquer ordem, dependendo do leitor:
     (a) descrição, valores, origem    (b) descrição (1ª parte) + valores + origem, e o resto DEPOIS
   A regra é: os 3 valores FECHAM a linha. Texto antes dos valores = descrição em andamento.
   Texto depois dos valores que começa em minúscula = fim da descrição (se ainda não acabou em ponto)
   ou continuação da coluna "origem" (ignorada). */
var VT_TOK5 = '(?:R\\$\\s*[\\d.]+(?:,\\d{1,2})?|—)';
var VT_RE_TRIPLA5 = new RegExp('^(.*?)\\s*(' + VT_TOK5 + ')\\s+(' + VT_TOK5 + ')\\s+(' + VT_TOK5 + ')\\s*(.*)$');
var VT_RE_CABECALHO5 = /^SERVI[CÇ]O MO MATERIAL TOTAL/i;
function vtFormato5(linhas, ctx){
  var itens = [], ambiente = null, buffer = [], bufIdx = [], ultimo = null, fim = false;
  for (var i = 0; i < linhas.length; i++){
    var l = linhas[i];
    if (fim) break;
    if (VT_RE_CABECALHO5.test(l)){ ctx.u(i); buffer = []; bufIdx = []; ultimo = null; continue; }
    if (/^OBSERVA[CÇ][AÃ]O/i.test(l) && vtSoMaiusculas(l)){ for (var k = i; k < linhas.length; k++) ctx.u(k); fim = true; continue; }   // observações finais
    var m = l.match(VT_RE_TRIPLA5);
    if (m){
      var desc = (buffer.join(' ') + ' ' + m[1]).replace(/\s+/g, ' ').trim();
      if (desc){
        ultimo = {ambiente: ambiente || 'Geral', servico: desc, descricao: '', mo: vtNumeroBRL(m[2]), ma: vtNumeroBRL(m[3]), _completo: /[.!?]$/.test(desc)};
        itens.push(ultimo);
        bufIdx.forEach(function(x){ ctx.i(x); }); ctx.i(i);
      }
      buffer = []; bufIdx = [];
      continue;
    }
    if (vtSoMaiusculas(l)){ ambiente = l; ctx.u(i); buffer = []; bufIdx = []; ultimo = null; continue; }
    if (ambiente === null) continue;                       // título/endereço antes da 1ª seção
    var minuscula = /^[a-zà-ÿ(]/.test(l);
    if (buffer.length){ buffer.push(l); bufIdx.push(i); continue; }            // continua descrição em andamento
    if (ultimo && minuscula){                                                   // sobra DEPOIS dos valores
      if (!ultimo._completo){
        var p = l.indexOf('.');
        if (p >= 0){ ultimo.servico += ' ' + l.slice(0, p + 1); ultimo._completo = true; }
        else { ultimo.servico += ' ' + l; }
      }
      ctx.i(i); continue;                                                       // (senão: coluna origem — ignorada)
    }
    buffer.push(l); bufIdx.push(i);                                             // começo de nova descrição
  }
  itens.forEach(function(it){ delete it._completo; });
  return itens;
}

/* ---------- Formato 6: lista de pendências — "Nº Local – Serviço Descrição R$ ____ R$ ____ R$ ____" ----------
   Seções "1. PINTURA / 2. REPAROS / 3. LIMPEZA"; a numeração dos itens recomeça em 1 a cada seção.
   O item começa no número esperado e vai até o próximo número — não importa onde os "R$ ____" caiam. */
var VT_RE_SECAO6 = /^(\d+)\.\s+([A-ZÀ-Ý][A-ZÀ-Ý ]*)$/;
var VT_RE_HEADER6 = /^(It\s+)?Local\s*\/\s*Servi[cç]o\s+Descri[cç][aã]o/i;
var VT_RE_VERBO6 = /^(.*?)\s+(Pintura|Reparo|Reposi[cç][aã]o|Recoloca[cç][aã]o|Regulariza[cç][aã]o|Instala[cç][aã]o|Realizar|Substitui[cç][aã]o|Fornecer|Providenciar|Retirar|Limpeza)\b(.*)$/;
function vtSepararLocalServico(t){
  var mm = t.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  var ambiente = mm ? mm[1].trim() : 'Geral';
  var resto = mm ? mm[2].trim() : t;
  var toks = resto.split(' '), k = -1;
  for (var q = 1; q < toks.length; q++){ if (/^[A-ZÀ-Ý]/.test(toks[q])){ k = q; break; } }   // descrição começa em maiúscula
  if (k < 0){
    var mv = resto.match(VT_RE_VERBO6);
    if (mv) return {ambiente: ambiente, servico: mv[1].trim(), descricao: (mv[2] + mv[3]).trim()};
    return {ambiente: ambiente, servico: resto, descricao: ''};
  }
  return {ambiente: ambiente, servico: toks.slice(0, k).join(' '), descricao: toks.slice(k).join(' ')};
}
function vtFormato6(linhas, ctx){
  var itens = [], secao = null, viuHeader = false, esperado = 1, reg = null, lacunas = [];
  function fechar(){
    if (!reg) return;
    var t = reg.partes.join(' ').replace(/(R\$\s*_+)\s*It\b/g, '$1').replace(/R\$\s*_+/g, ' ').replace(/\s+/g, ' ').trim();
    var s = vtSepararLocalServico(t);
    itens.push({ambiente: s.ambiente, servico: s.servico, descricao: s.descricao, mo: 0, ma: 0, _n: reg.n, _secao: secao || ''});
    reg.idx.forEach(function(x){ ctx.i(x); });
    reg = null;
  }
  for (var i = 0; i < linhas.length; i++){
    var l = linhas[i];
    if (VT_RE_HEADER6.test(l)){ viuHeader = true; ctx.u(i); continue; }
    if (/^(It|e|m|Item)$/i.test(l)){ ctx.u(i); continue; }                       // "Item" escrito na vertical
    var ms = l.match(VT_RE_SECAO6);
    if (ms){ fechar(); secao = ms[2].trim(); esperado = 1; ctx.u(i); continue; }
    if (/^Observa[cç][aã]o/i.test(l)){ fechar(); ctx.u(i); reg = null; continue; }
    var ma = l.match(/^(\d+)\s+(\S.*)$/);
    if (ma && (secao !== null || viuHeader)){
      var n = parseInt(ma[1], 10);
      if (n === esperado){ fechar(); reg = {n: n, partes: [ma[2]], idx: [i]}; esperado++; continue; }
      if (n > esperado && n <= esperado + 3 && /[–—]/.test(l)){                  // numeração pulou: aceita e avisa
        for (var g = esperado; g < n; g++) lacunas.push((secao ? secao + ' ' : '') + 'nº ' + g);
        fechar(); reg = {n: n, partes: [ma[2]], idx: [i]}; esperado = n + 1; continue;
      }
    }
    if (reg){ reg.partes.push(l); reg.idx.push(i); }
  }
  fechar();
  itens._lacunas = lacunas;
  return itens;
}

/* ---------- Escolha do formato + diagnóstico ---------- */
var VT_FORMATOS = [
  {nome: 'Vistoria (ambiente + itens 1.1, 1.2…)', fn: vtFormato1},
  {nome: 'Tabela 1.1 Ambiente – Componente', fn: vtFormato2},
  {nome: 'Lista numerada sequencial', fn: vtFormato3},
  {nome: 'Itens com MO/MA/Total', fn: vtFormato4},
  {nome: 'Tabela Serviço/MO/Material/Total', fn: vtFormato5},
  {nome: 'Lista de pendências (Local/Serviço)', fn: vtFormato6}
];

function vtNaoLidas(linhas, usadas, primeiro, ultimo){
  var i, lista = [];
  for (i = 0; i < linhas.length; i++){
    if (usadas[i]) continue;
    var l = linhas[i];
    if (vtSoMaiusculas(l) || VT_RE_META.test(l) || VT_RE_PAGINA.test(l)) continue;
    var tk = vtTokens(l.replace(/R\$\s*[\d._,]+/g, ' '));
    var ancora = (/^\d+([.,]\d+)?[.,]?\s+\S/.test(l) && tk.length >= 1) || ((l.match(/R\$/g) || []).length >= 2);
    var dentro = i > primeiro && i < ultimo;
    if ((dentro && tk.length >= 3) || ancora) lista.push(l);
  }
  return lista;
}

function vtLacunasNumeracao(itens){
  var grupos = {}, out = [];
  itens.forEach(function(it){ if (it._n){ var k = it._secao || ''; (grupos[k] = grupos[k] || []).push(it._n); } });
  Object.keys(grupos).forEach(function(k){
    var nums = grupos[k], max = Math.max.apply(null, nums), set = {};
    nums.forEach(function(n){ set[n] = 1; });
    if (max > 1000) return;
    for (var n = 1; n <= max; n++){ if (!set[n]) out.push((k ? k + ' ' : '') + 'nº ' + n); }
  });
  return out;
}

function parseVistoriaTexto(texto){
  var linhas = vtNormalizar(texto);
  var melhor = null;
  VT_FORMATOS.forEach(function(f, idx){
    var ctx = {usadas: {}, min: 1e9, max: -1,
      u: function(i){ this.usadas[i] = true; },                                           // cabeçalho/rodapé/ruído reconhecido
      i: function(i){ this.usadas[i] = true; if (i < this.min) this.min = i; if (i > this.max) this.max = i; }};  // linha de item
    var itens;
    try { itens = f.fn(linhas, ctx); } catch (e) { itens = []; }
    if (!itens.length) return;
    var naoLidas = vtNaoLidas(linhas, ctx.usadas, ctx.min, ctx.max);
    if (!melhor || naoLidas.length < melhor.naoLidas.length || (naoLidas.length === melhor.naoLidas.length && itens.length > melhor.itens.length)){
      melhor = {itens: itens, naoLidas: naoLidas, formato: f.nome, idx: idx};
    }
  });
  if (!melhor){
    var vazio = [];
    vazio.diagnostico = {formato: null, naoLidas: [], lacunas: [], avisos: ['Não reconheci itens neste PDF.']};
    return vazio;
  }
  var itens = melhor.itens;
  var lacunas = [];
  (itens._lacunas || []).concat(vtLacunasNumeracao(itens)).forEach(function(x){ if (lacunas.indexOf(x) < 0) lacunas.push(x); });
  var avisos = [];
  if (melhor.naoLidas.length) avisos.push(melhor.naoLidas.length + ' linha(s) do PDF não viraram item — conferir.');
  if (lacunas.length) avisos.push('A numeração do PDF pula: ' + lacunas.slice(0, 12).join(', ') + '.');
  itens.forEach(function(it){ delete it._n; delete it._secao; });
  delete itens._lacunas;
  itens.diagnostico = {formato: melhor.formato, naoLidas: melhor.naoLidas, lacunas: lacunas, avisos: avisos};
  return itens;
}

/* Itens "A CONFERIR": o que sobrou do PDF vira item visível, para nada ser esquecido. */
function itensParaConferir(itens){
  var d = itens && itens.diagnostico;
  if (!d || !d.naoLidas) return [];
  return d.naoLidas.map(function(l){ return {ambiente: '⚠ A CONFERIR', servico: l.length > 220 ? l.slice(0, 220) + '…' : l, descricao: '', mo: 0, ma: 0}; });
}

function resumoLeituraVistoria(itens){
  var d = itens && itens.diagnostico;
  if (!itens.length) return 'Não reconheci itens automaticamente neste PDF — adicione manualmente.';
  var s = itens.length + ' item(ns) lido(s) do PDF';
  if (d && d.formato) s += ' (formato: ' + d.formato + ')';
  s += '.';
  if (d && d.naoLidas && d.naoLidas.length){
    s += '\n⚠ ' + d.naoLidas.length + ' linha(s) não viraram item e foram adicionadas em "A CONFERIR":';
    d.naoLidas.slice(0, 6).forEach(function(l){ s += '\n • ' + (l.length > 110 ? l.slice(0, 110) + '…' : l); });
    if (d.naoLidas.length > 6) s += '\n • …e mais ' + (d.naoLidas.length - 6);
  }
  if (d && d.lacunas && d.lacunas.length) s += '\n⚠ A numeração do PDF pula: ' + d.lacunas.slice(0, 12).join(', ') + ' — confira se falta algum item.';
  return s;
}

function extrairEnderecoVistoria(texto){
  var linhas = (texto || '').split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
  for (var i = 0; i < linhas.length; i++){
    var m = linhas[i].match(/^Im[oó]vel\s*:\s*(.+)$/i);
    if (m){
      var valor = m[1].trim();
      if (valor.indexOf('|') >= 0){
        var partes = valor.split('|').map(function(p){ return p.trim(); }).filter(Boolean);
        return partes[partes.length - 1];
      }
      return valor;
    }
    var m2 = linhas[i].match(/^Endere[cç]o\s*:\s*(.+)$/i);
    if (m2) return m2[1].trim();
  }
  return '';
}

export { parseVistoriaTexto, extrairEnderecoVistoria, itensParaConferir, resumoLeituraVistoria };
