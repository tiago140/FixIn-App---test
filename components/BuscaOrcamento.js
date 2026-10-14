'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { STATUS_LABEL } from '@/lib/format';

const norm = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Achar qualquer orçamento pelo número, endereço, imobiliária ou cliente — sem depender de qual lista ele está.
export default function BuscaOrcamento({ orcamentos, basePath, mostrarCliente = true }) {
  const [q, setQ] = useState('');
  const indice = useMemo(
    () => (orcamentos || []).map((o) => ({ o, t: norm([o.numero, o.endereco, o.clientes?.nome_empresa, o.nome_cliente_final, o.numero_contrato].join(' ')) })),
    [orcamentos]
  );
  const termos = norm(q).split(/\s+/).filter(Boolean);
  const achados = termos.length ? indice.filter((x) => termos.every((t) => x.t.includes(t))) : [];

  return (
    <div className="mb-5">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-marinho/40" />
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar orçamento"
          placeholder="Buscar orçamento: número (ORC-0055), endereço ou imobiliária"
          className="w-full border border-linha rounded-lg bg-white pl-9 pr-9 py-2.5 text-sm"
        />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-marinho/50"><X size={15} /></button>}
      </div>
      {termos.length > 0 && (
        <div className="mt-2 card rounded-xl overflow-hidden">
          {achados.length === 0 && <div className="px-4 py-3 text-sm text-marinho/60">Nenhum orçamento encontrado.</div>}
          {achados.slice(0, 8).map(({ o }, i) => (
            <Link key={o.id} href={`${basePath}/${o.id}`} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-papel ${i ? 'border-t border-linha' : ''}`}>
              <span className="min-w-0">
                <span className="font-mono text-[11px] text-marinho/50 mr-2">{o.numero}</span>
                <b className="break-words">{o.endereco}</b>
                {mostrarCliente && o.clientes?.nome_empresa && <span className="text-marinho/60"> · {o.clientes.nome_empresa}</span>}
              </span>
              <span className="text-xs text-marinho/60 whitespace-nowrap">{STATUS_LABEL[o.status] || o.status}</span>
            </Link>
          ))}
          {achados.length > 8 && <div className="px-4 py-2 border-t border-linha text-xs text-marinho/60">+ {achados.length - 8} outros — refine a busca</div>}
        </div>
      )}
    </div>
  );
}
