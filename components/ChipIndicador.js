const TONS = { info: '#3B6B8C', alerta: '#B8862E', erro: '#C0392B', ok: '#3F7A5E' };

// Indicador rápido do cabeçalho, ex.: "2 aguardando você". Não aparece quando n = 0.
export default function ChipIndicador({ n, texto, tom = 'info' }) {
  if (!n) return null;
  const cor = TONS[tom] || TONS.info;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full px-3 py-1 border" style={{ color: cor, borderColor: `${cor}55`, background: `${cor}14` }}>
      <span className="font-bold">{n}</span> {texto}
    </span>
  );
}
