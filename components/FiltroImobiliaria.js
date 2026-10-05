'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';

// Filtro do Painel geral por imobiliária. Troca a URL (?cliente=...), então o painel inteiro é recalculado no servidor
// e dá para guardar/compartilhar o endereço com a imobiliária já escolhida.
export default function FiltroImobiliaria({ opcoes, selecionado = null, totalGeral = 0 }) {
  const router = useRouter();
  const pathname = usePathname();
  const atual = opcoes.find((o) => o.id === selecionado);
  return (
    <div role="search" className="flex items-center gap-3 flex-wrap mb-5 bg-white border border-linha rounded-lg px-4 py-3 shadow-sm">
      <label htmlFor="filtro-imobiliaria" className="inline-flex items-center gap-2 text-sm font-semibold text-marinho"><Building2 size={16} /> Imobiliária</label>
      <select
        id="filtro-imobiliaria"
        value={selecionado || ''}
        onChange={(e) => router.push(e.target.value ? `${pathname}?cliente=${e.target.value}` : pathname)}
        className="border border-linha rounded-lg px-3 py-2 bg-papel text-sm text-marinho min-w-[16rem] max-w-full"
      >
        <option value="">Todas as imobiliárias ({totalGeral})</option>
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome} ({o.qtd}){o.ativo ? '' : ' — desativada'}</option>)}
      </select>
      {atual && (
        <>
          <Link href={pathname} className="text-sm font-semibold text-marinho underline">Ver todas</Link>
          <span className="ml-auto text-sm text-marinho/60">Mostrando só <b className="text-marinho">{atual.nome}</b> · {atual.qtd} orçamento(s)</span>
        </>
      )}
    </div>
  );
}
