// Extrai itens de laudos de vistoria/orçamentos em PDF. Reconhece 5 formatos
// diferentes, tentando cada um em sequência até um encontrar itens. Ignora
// valores quando o formato não os traz; extrai valores reais quando o
// formato os traz (formatos 4 e 5).

const RE_AMBIENTE = /^(\d+)\.\s+([A-Za-zÀ-ÿ0-9 /\-]+)$/;
const RE_ITEM = /^(\d+)\.(\d+)\s*-\s*([^:]+):\s*(.+)$/;

function formato1(linhas) {
  const itens = [];
  let ambienteAtual = null;
  for (const linha of linhas) {
    const mItem = linha.match(RE_ITEM);
    if (mItem) {
      itens.push({ ambiente: ambienteAtual || 'Geral', servico: mItem[3].trim(), descricao: mItem[4].trim(), mo: 0, ma: 0 });
      continue;
    }
    const mAmbiente = linha.match(RE_AMBIENTE);
    if (mAmbiente) ambienteAtual = mAmbiente[2].trim();
  }
  return itens;
}

// Formato 2: "Nº.Nº Ambiente – Componente: descrição  R$ valor" — sem cabeçalho de ambiente separado.
const RE_ITEM_TABELA = /^(\d+)\.(\d+)\s+(.+)$/;
const RE_VALOR_TABELA = /R\$\s*[\d.,]+/g;
const RE_RODAPE_TABELA = /^(TOTAL|Observa[cç][aã]o)/i;

function formato2(linhas) {
  const itens = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    const m = linha.match(RE_ITEM_TABELA);
    if (!m) { i++; continue; }
    let resto = m[3];
    let j = i + 1;
    while (j < linhas.length && !RE_ITEM_TABELA.test(linhas[j]) && !RE_RODAPE_TABELA.test(linhas[j])) {
      resto += ' ' + linhas[j];
      j++;
    }
    const restoLimpo = resto.replace(RE_VALOR_TABELA, '').trim();
    const partes = restoLimpo.split(/\s+[–—-]\s+/);
    if (partes.length >= 2) {
      const ambiente = partes[0].trim();
      const resto2 = partes.slice(1).join(' - ');
      const m2 = resto2.match(/^([^:]+):\s*(.+)$/);
      itens.push({ ambiente, servico: m2 ? m2[1].trim() : resto2.trim(), descricao: m2 ? m2[2].trim() : '', mo: 0, ma: 0 });
    }
    i = j;
  }
  return itens;
}

// Formato 3: ambiente numerado sozinho ("2. Frente do Imóvel", sem ponto final) e itens
// numerados sequencialmente à parte ("1. Portão — Recolocar trinco.", termina com ponto).
const RE_NUM_LINHA = /^(\d+)\.\s+(.+)$/;

function formato3(textoOriginal) {
  const texto = (textoOriginal || '').replace(/([a-zà-ÿ])(\d+\.\s)/g, '$1\n$2');
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const itens = [];
  let ambienteAtual = null;
  for (const linha of linhas) {
    const m = linha.match(RE_NUM_LINHA);
    if (!m) continue;
    const conteudo = m[2].trim();
    if (/\.$/.test(conteudo)) {
      const semPonto = conteudo.slice(0, -1).trim();
      const partes = semPonto.split(/\s+[—–]\s+/);
      const servico = partes.length >= 2 ? partes[0].trim() : semPonto;
      const descricao = partes.length >= 2 ? partes.slice(1).join(' - ').trim() : '';
      itens.push({ ambiente: ambienteAtual || 'Geral', servico, descricao, mo: 0, ma: 0 });
    } else {
      ambienteAtual = conteudo;
    }
  }
  return itens;
}

// Formato 4: "Nº, Componente: descrição, MO: R$ X,XX | MA: R$ Y,YY | Total: R$ Z,ZZ" — traz valores reais.
const RE_ITEM4_START = /^(\d+),\s*[A-Za-zÀ-ÿ]/;
const RE_ITEM4_COMPLETO = /^(\d+),\s*([^:]+):\s*(.+?),\s*MO:\s*R\$\s*([\d.]+,\d{2})\s*\|\s*MA:\s*R\$\s*([\d.]+,\d{2})\s*\|\s*Total:\s*R\$\s*([\d.]+,\d{2})/;
const RE_RODAPE4 = /^(TOTAL|M[aã]o de obra|Total original|Foram removidos|OR[CÇ]AMENTO|Cliente:)/i;

function paraNumeroBRL(s) {
  if (s.trim() === '—') return 0;
  return parseFloat(s.replace(/^R\$\s*/, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function formato4(textoOriginal) {
  const texto = (textoOriginal || '').replace(/(,\d{2})(\d+,\s)/g, '$1\n$2');
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const itens = [];
  let ambienteAtual = null;
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (RE_RODAPE4.test(linha)) { i++; continue; }
    if (!RE_ITEM4_START.test(linha)) {
      if (linha.indexOf(':') === -1 && linha.length < 60) ambienteAtual = linha.trim();
      i++;
      continue;
    }
    let acumulado = linha;
    let j = i + 1;
    while (!RE_ITEM4_COMPLETO.test(acumulado) && j < linhas.length && !RE_ITEM4_START.test(linhas[j])) {
      acumulado += ' ' + linhas[j];
      j++;
    }
    const m = acumulado.match(RE_ITEM4_COMPLETO);
    if (m) {
      itens.push({ ambiente: ambienteAtual || 'Geral', servico: m[2].trim(), descricao: m[3].trim(), mo: paraNumeroBRL(m[4]), ma: paraNumeroBRL(m[5]) });
      i = j;
    } else {
      i++;
    }
  }
  return itens;
}

// Formato 5: tabela "SERVIÇO | MO | MATERIAL | TOTAL | ORIGEM/OBS.", ambiente em maiúsculas.
const RE_LINHA_VALORES5 = /^(.+?)\s+(R\$\s*[\d.,]+|—)\s+(R\$\s*[\d.,]+|—)\s+(R\$\s*[\d.,]+|—)\s+(.+)$/;
const RE_CABECALHO5 = /^SERVI[CÇ]O\s+MO\s+MATERIAL\s+TOTAL/i;
const RE_RODAPE5 = /^(OBSERVA[CÇ][AÃ]O|A soma|Soma dos|Consolida[cç][aã]o|LISTA CONSOLIDADA|Rua )/i;

function ehAmbiente5(linha) {
  if (RE_LINHA_VALORES5.test(linha) || RE_CABECALHO5.test(linha) || RE_RODAPE5.test(linha)) return false;
  const letras = linha.replace(/[^A-Za-zÀ-ÿ]/g, '');
  return letras.length > 0 && letras === letras.toUpperCase();
}

function formato5(textoOriginal) {
  const linhas = (textoOriginal || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const itens = [];
  let ambienteAtual = null;
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (RE_CABECALHO5.test(linha) || RE_RODAPE5.test(linha)) { i++; continue; }
    if (ehAmbiente5(linha)) { ambienteAtual = linha.trim(); i++; continue; }
    const m = linha.match(RE_LINHA_VALORES5);
    if (!m) { i++; continue; }
    let descricao = m[1].trim();
    const mo = paraNumeroBRL(m[2]);
    const ma = paraNumeroBRL(m[3]);
    let j = i + 1;
    if (j < linhas.length) {
      const prox = linhas[j];
      if (!RE_LINHA_VALORES5.test(prox) && !ehAmbiente5(prox) && !RE_CABECALHO5.test(prox) && !RE_RODAPE5.test(prox)) {
        descricao += ' ' + prox;
        j++;
      }
    }
    itens.push({ ambiente: ambienteAtual || 'Geral', servico: descricao, descricao: '', mo, ma });
    i = j;
  }
  return itens;
}

export function parseVistoriaTexto(textoBruto) {
  const linhas = (textoBruto || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let itens = formato1(linhas);
  if (itens.length) return itens;

  itens = formato2(linhas);
  if (itens.length) return itens;

  itens = formato3(textoBruto);
  if (itens.length) return itens;

  itens = formato4(textoBruto);
  if (itens.length) return itens;

  return formato5(textoBruto);
}

export function extrairEnderecoVistoria(textoBruto) {
  const linhas = (textoBruto || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const linha of linhas) {
    const m = linha.match(/^Im[oó]vel\s*:\s*(.+)$/i);
    if (m) {
      const valor = m[1].trim();
      if (valor.indexOf('|') >= 0) {
        const partes = valor.split('|').map((p) => p.trim()).filter(Boolean);
        return partes[partes.length - 1];
      }
      return valor;
    }
    const m2 = linha.match(/^Endere[cç]o\s*:\s*(.+)$/i);
    if (m2) return m2[1].trim();
  }
  return '';
}
