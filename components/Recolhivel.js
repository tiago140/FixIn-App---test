// Bloco que o dia a dia quase não usa: fica fechado, com título e um resumo; abre com um clique. O conteúdo continua na página.
export default function Recolhivel({ titulo, resumo, aberto = false, children }) {
  return (
    <details open={aberto} className="card group">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-marinho">
        <span>{titulo}</span>
        <span className="flex items-center gap-2 text-xs font-normal text-marinho/50">{resumo}<span aria-hidden className="transition-transform group-open:rotate-180">▾</span></span>
      </summary>
      <div className="border-t border-linha p-5">{children}</div>
    </details>
  );
}
