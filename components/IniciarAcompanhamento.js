'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ETAPA_LABEL } from '@/lib/etapasAcomp';

// Card no orçamento da equipe: abre o acompanhamento da obra ou leva até ele.
export default function IniciarAcompanhamento({ orcamentoId, acomp }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  async function abrir() {
    setOcupado(true); setErro('');
    const r = await fetch(`/api/acompanhamento/orcamento/${orcamentoId}`, { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) return setErro(d.error || 'Não foi possível abrir.');
    router.push(`/master/acompanhamento/${d.id}`);
  }
  return (
    <div className="card rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="font-semibold text-sm">Acompanhamento da obra</div>
        <p className="text-xs text-marinho/60 mt-0.5">{acomp ? `${ETAPA_LABEL[acomp.etapa]} · ${acomp.percentual}% concluído` : 'Quando a obra começar, abra o acompanhamento para lançar fotos, etapas e enviar o link ao locador.'}</p>
        {erro && <p className="text-xs text-erro mt-1">{erro}</p>}
      </div>
      {acomp
        ? <Link href={`/master/acompanhamento/${acomp.id}`} className="bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-2">Abrir acompanhamento</Link>
        : <button type="button" disabled={ocupado} onClick={abrir} className="bg-verde text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50">Iniciar acompanhamento</button>}
    </div>
  );
}
