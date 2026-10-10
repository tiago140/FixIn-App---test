'use client';
import { AlertTriangle } from 'lucide-react';
import { resumoEspeciais } from '@/lib/itensEspeciais';

// Faixa de alerta amarela: aparece quando o orçamento tem itens que exigem atenção (aquecedor, ar condicionado, etc.)
export default function AlertaItensEspeciais({ itens, className = '' }) {
  const r = resumoEspeciais(itens);
  if (r.total === 0) return null;
  return (
    <div role="alert" className={`rounded-lg border border-alerta/60 bg-alerta/10 px-4 py-3 text-sm flex gap-3 items-start ${className}`}>
      <AlertTriangle size={20} className="text-alerta shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-marinho">Atenção: {r.total} {r.total === 1 ? 'item pede' : 'itens pedem'} cuidado ao orçar</div>
        <div className="text-marinho/70 mt-0.5">{r.categorias.map((c) => `${c.rotulo} (${c.qtd})`).join(' · ')}. Confira o escopo e o valor antes de gerar ou enviar.</div>
      </div>
    </div>
  );
}
