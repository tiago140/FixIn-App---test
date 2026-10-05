import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import OrcamentoCard from '@/components/OrcamentoCard';

// Bloco do painel: cabeçalho colorido com a contagem e uma grade de cartões.
export default function SecaoOrcamentos({ titulo, cor, lista, basePath, verTodosHref, mostrarCliente = true, limite = 6, veValores = false, papel = 'master' }) {
  if (!lista || lista.length === 0) return null;
  const mostrar = lista.slice(0, limite);
  const resto = lista.length - mostrar.length;

  return (
    <section className="mb-8 scroll-mt-20">
      <div className="flex items-center gap-3 mb-3 pb-2 border-b-2" style={{ borderColor: cor }}>
        <span className="w-3 h-8 rounded-full" style={{ background: cor }} />
        <h2 className="font-slab text-xl sm:text-2xl font-bold text-marinho">{titulo}</h2>
        <span className="text-sm font-bold text-white rounded-full px-3 py-0.5" style={{ background: cor }}>
          {lista.length}
        </span>
        {resto > 0 && (
          <Link href={verTodosHref} className="ml-auto text-sm font-semibold text-marinho/70 hover:text-marinho inline-flex items-center gap-1">
            ver todos <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {mostrar.map((o) => (
          <OrcamentoCard key={o.id} o={o} basePath={basePath} mostrarCliente={mostrarCliente} veValores={veValores} papel={papel} />
        ))}
      </div>
    </section>
  );
}
