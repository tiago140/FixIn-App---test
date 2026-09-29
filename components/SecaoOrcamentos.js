import Link from 'next/link';
import StatusTag from '@/components/StatusTag';
import { fmtBRL, fmtDate } from '@/lib/format';

export default function SecaoOrcamentos({ titulo, cor, lista, basePath, verTodosHref, mostrarCliente = true, limite = 4 }) {
  if (!lista || lista.length === 0) return null;
  const mostrar = lista.slice(0, limite);
  const resto = lista.length - mostrar.length;

  return (
    <section className="mb-6">
      <h2 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: cor }} />
        {titulo} <span className="font-normal text-marinho/50">({lista.length})</span>
      </h2>
      {mostrar.map((o) => (
        <Link key={o.id} href={`${basePath}/${o.id}`} className="flex items-center justify-between py-3 border-b border-linha hover:bg-papel">
          <div>
            <span className="block text-[11px] font-mono text-marinho/50">
              {o.numero}
              {mostrarCliente && o.clientes?.nome_empresa ? ` · ${o.clientes.nome_empresa}` : ''}
              {o.tipo === 'manutencao' ? ' · MANUTENÇÃO' : ''}
            </span>
            <span className="font-semibold">{o.endereco}</span>
            <div className="text-xs text-marinho/50">{fmtDate(o.criado_em)}</div>
          </div>
          <div className="text-right">
            <StatusTag status={o.status} />
            <div className="font-mono font-semibold mt-1">{fmtBRL(o.total)}</div>
          </div>
        </Link>
      ))}
      {resto > 0 && (
        <Link href={verTodosHref} className="block text-center text-xs text-marinho/60 py-2 hover:underline">
          + {resto} outro(s) — ver todos
        </Link>
      )}
    </section>
  );
}
