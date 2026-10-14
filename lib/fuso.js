// Horário de Brasília em todo o sistema.
// O campo "data e hora" do navegador (datetime-local) manda "2026-10-14T09:00" SEM fuso. O servidor roda em UTC e
// lia isso como 09:00 UTC, que na tela de Brasília aparecia como 06:00. Aqui o horário digitado vira um instante
// de verdade (09:00 de Brasília) e a exibição sempre usa o fuso de São Paulo, igual no servidor e no navegador.
// O Brasil não tem horário de verão desde 2019, então o fuso de Brasília é fixo em -03:00.

export const FUSO = 'America/Sao_Paulo';
const SEM_FUSO = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/;

// "2026-10-14T09:00" -> "2026-10-14T09:00:00-03:00". Se já traz fuso (Z ou +hh:mm), mantém. Inválido -> null.
export function paraInstanteBrasilia(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const s = String(valor).trim();
  const m = s.match(SEM_FUSO);
  const iso = m ? `${m[1]}T${m[2]}${m[3] || ':00'}-03:00` : s;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// Partes da data no horário de Brasília: { ano, mes (1-12), dia, hora, min, sem (0=domingo) }.
export function partesSP(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  const p = {};
  fmt.formatToParts(d).forEach((x) => { p[x.type] = x.value; });
  const ano = Number(p.year), mes = Number(p.month), dia = Number(p.day);
  return { ano, mes, dia, hora: Number(p.hour), min: Number(p.minute), sem: new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() };
}

const dois = (n) => String(n).padStart(2, '0');
export const chaveDia = (iso) => { const p = partesSP(iso); return p ? `${p.ano}-${dois(p.mes)}-${dois(p.dia)}` : ''; };
export const fmtHoraSP = (iso) => { const p = partesSP(iso); return p ? `${dois(p.hora)}:${dois(p.min)}` : ''; };
export const hojeSP = () => partesSP(new Date());
