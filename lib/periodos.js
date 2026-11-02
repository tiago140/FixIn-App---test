// Períodos em horário de Brasília (UTC-3, sem horário de verão): "YYYY-MM-DD" de hoje, início da semana (segunda) e do mês.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
export const hojeSP = (agora = new Date()) => fmt.format(agora);
const somar = (iso, dias) => { const d = new Date(`${iso}T12:00:00-03:00`); d.setUTCDate(d.getUTCDate() + dias); return fmt.format(d); };
export const diaDaSemana = (iso) => new Date(`${iso}T12:00:00-03:00`).getUTCDay(); // 0 = domingo

// Devolve { de, ate } (datas inclusivas) para: hoje, ontem, semana (segunda a hoje), mes (dia 1 a hoje), mes_passado.
export function intervalo(id, agora = new Date()) {
  const hoje = hojeSP(agora);
  if (id === 'hoje') return { de: hoje, ate: hoje };
  if (id === 'ontem') { const o = somar(hoje, -1); return { de: o, ate: o }; }
  if (id === 'semana') { const dow = diaDaSemana(hoje); return { de: somar(hoje, -((dow + 6) % 7)), ate: hoje }; }
  if (id === 'mes') return { de: `${hoje.slice(0, 7)}-01`, ate: hoje };
  if (id === 'mes_passado') {
    const primeiro = `${hoje.slice(0, 7)}-01`; const ult = somar(primeiro, -1);
    return { de: `${ult.slice(0, 7)}-01`, ate: ult };
  }
  return { de: hoje, ate: hoje };
}
export const inicioSP = (iso) => `${iso}T00:00:00-03:00`;
export const fimSP = (iso) => `${somar(iso, 1)}T00:00:00-03:00`;
