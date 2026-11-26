// O Postgres não aceita o caractere NUL (\u0000) em texto ("unsupported Unicode escape sequence").
// Ele costuma vir de textos copiados de PDF/vistoria. Remove em qualquer profundidade antes de gravar.
export function semNul(v) {
  if (typeof v === 'string') return v.replace(/\u0000/g, '').replace(/\\u0000/g, '');
  if (Array.isArray(v)) return v.map(semNul);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, semNul(x)]));
  return v;
}
