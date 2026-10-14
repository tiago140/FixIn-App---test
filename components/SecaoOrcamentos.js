import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import OrcamentoLinha from '@/components/OrcamentoLinha';
import ListaOrcamentos from '@/components/ListaOrcamentos';

const TETO_NA_PAGINA = 120; // acima disso o resto só no "ver todos" (evita página gigante)

// Bloco do painel: título com a contagem e uma lista de linhas compactas (uma por orçamento).
export default function SecaoOrcamentos({ titulo, cor, lista, basePath, verTodosHref, mostrarCliente = true, limite = 5, veValores = false, papel = 'master' }) {
  if (!lista || lista.length === 0) return null;
  const naPagina = lista.slice(0, TETO_NA_PAGINA);
  const resto = lista.length - naPagina.length;

  return (
    <section className="mb-6 scroll-mt-20">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="h-3 w-3 rounded-full" style={{ background: cor }} />
        <h2 className="text-base font-semibold text-marinho">{titulo}</h2>
        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: cor }}>{lista.length}</span>
        {resto > 0 && (
          <Link href={verTodosHref} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-marinho/60 hover:text-marinho">
            ver todos <ArrowRight size={13} />
          </Link>
        )}
      </div>
      <ListaOrcamentos limite={limite}>
        {naPagina.map((o) => (
          <OrcamentoLinha key={o.id} o={o} basePath={basePath} mostrarCliente={mostrarCliente} veValores={veValores} papel={papel} />
        ))}
      </ListaOrcamentos>
    </section>
  );
}
