// Cartão de indicador: ícone colorido, número grande, rótulo e (opcional) uma linha extra, como o valor em R$.
export default function KpiCard({ icone: Icone, cor = '#182F50', num, lbl, sub }) {
  return (
    <div className="card rounded-lg p-5 flex items-center gap-4 border-l-4 hover:shadow-md transition" style={{ borderLeftColor: cor }}>
      <span className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white" style={{ background: cor }}>
        <Icone size={24} />
      </span>
      <div className="min-w-0">
        <span className="block font-bold text-2xl xl:text-3xl text-marinho leading-tight">{num}</span>
        <span className="block text-sm text-marinho/60">{lbl}</span>
        {sub && <span className="block text-xs font-mono font-semibold mt-0.5" style={{ color: cor }}>{sub}</span>}
      </div>
    </div>
  );
}
