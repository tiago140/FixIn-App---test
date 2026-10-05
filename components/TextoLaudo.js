import { parseTextoLaudo } from '@/lib/laudoTexto';

// Mostra o texto do laudo do mesmo jeito que o PDF: "# Título" vira faixa, "- item" vira lista, o resto é parágrafo.
export default function TextoLaudo({ texto, vazio = 'Sem texto.' }) {
  const blocos = parseTextoLaudo(texto);
  if (blocos.length === 0) return <p className="text-sm text-marinho/50">{vazio}</p>;
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-marinho">
      {blocos.map((b, i) => {
        if (b.tipo === 'titulo') return <h3 key={i} className="mt-4 first:mt-0 bg-papel text-marinho font-bold uppercase text-sm tracking-wide px-3 py-1.5 rounded">{b.texto}</h3>;
        if (b.tipo === 'topico') return <p key={i} className="pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-marinho/50">{b.texto}</p>;
        return <p key={i}>{b.texto}</p>;
      })}
    </div>
  );
}
