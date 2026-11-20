// Valor por extenso em reais: 150 -> "cento e cinquenta reais".
const U = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(n) {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100, p = [];
  if (c) p.push(C[c]);
  if (r) p.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' e ' + U[r % 10] : ''));
  return p.join(' e ');
}

function inteiro(n) {
  if (n === 0) return 'zero';
  const escalas = [[1e9, 'bilhão', 'bilhões'], [1e6, 'milhão', 'milhões'], [1e3, 'mil', 'mil']];
  const partes = []; let resto = n;
  for (const [v, s, pl] of escalas) {
    const q = Math.floor(resto / v);
    if (q) { partes.push(v === 1e3 && q === 1 ? 'mil' : `${ate999(q)} ${q === 1 ? s : pl}`); resto -= q * v; }
  }
  if (resto) partes.push(ate999(resto));
  // "e" antes do último bloco quando ele é < 100 ou centena exata
  if (partes.length > 1) { const ult = resto || 0; if (ult && (ult < 100 || ult % 100 === 0)) return partes.slice(0, -1).join(' ') + ' e ' + partes[partes.length - 1]; }
  return partes.join(' ');
}

export function valorExtenso(valor) {
  const cent = Math.round((Number(valor) || 0) * 100);
  const r = Math.floor(cent / 100), c = cent % 100;
  const partes = [];
  if (r > 0 || c === 0) partes.push(`${inteiro(r)} ${r === 1 ? 'real' : (r !== 0 && r % 1e6 === 0 ? 'de reais' : 'reais')}`);
  if (c > 0) partes.push(`${inteiro(c)} ${c === 1 ? 'centavo' : 'centavos'}`);
  return partes.join(' e ');
}
