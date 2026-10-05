// Cartão de indicador: ícone colorido, número grande, rótulo e (opcional) uma linha extra, como o valor em R$.
// O número fica SEMPRE em uma linha: o tamanho da letra acompanha a largura da tela (nunca quebra "R$ 20.590,0 / 0").
// No celular o ícone fica em cima do número, para sobrar largura.
export default function KpiCard({ icone: Icone, cor = '#182F50', num, lbl, sub }) {
  return (
    <div className="card rounded-lg p-3 sm:p-5 flex flex-col items-start sm:flex-row sm:items-center gap-2 sm:gap-4 border-l-4 hover:shadow-md transition min-w-0 h-full" style={{ borderLeftColor: cor }}>
      <span className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white" style={{ background: cor }}>
        <Icone size={22} />
      </span>
      <div className="min-w-0 max-w-full">
        <span className="block font-bold text-marinho leading-tight whitespace-nowrap" style={{ fontSize: 'clamp(1rem, 1.35vw + 0.2rem, 1.875rem)' }}>{num}</span>
        <span className="block text-sm text-marinho/60">{lbl}</span>
        {sub && <span className="block text-xs font-mono font-semibold mt-0.5 break-words" style={{ color: cor }}>{sub}</span>}
      </div>
    </div>
  );
}
