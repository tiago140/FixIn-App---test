import Link from 'next/link';
import { ETAPA_LABEL, ETAPA_COR } from '@/lib/etapasAcomp';

const dt = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

// Cartão de uma obra na lista de acompanhamento (equipe e imobiliária).
export default function CartaoObra({ href, a, numero, endereco, empresa }) {
  return (
    <Link href={href} className="card rounded-xl p-4 block hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-marinho/50">{numero}{empresa ? ` · ${empresa}` : ''}</div>
          <div className="font-semibold truncate">{endereco}</div>
        </div>
        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${ETAPA_COR[a.etapa] || 'bg-papel'}`}>{ETAPA_LABEL[a.etapa]}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-linha overflow-hidden"><div className="h-full bg-verde" style={{ width: `${a.percentual}%` }} /></div>
      <div className="mt-1.5 flex justify-between text-xs text-marinho/55"><span>{a.percentual}% concluído</span><span>Atualizado em {dt(a.atualizado_em)}</span></div>
    </Link>
  );
}
