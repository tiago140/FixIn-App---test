'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fmtDataHora } from '@/lib/format';

const STATUS_LABEL_VISITA = { pendente: 'Aguardando aprovação', confirmada: 'Confirmada', cancelada: 'Cancelada' };
const STATUS_CLASS = { pendente: 'tag-pendente', confirmada: 'tag-aprovado', cancelada: 'tag-rejeitado' };

export default function VisitaRow({ visita, cliente, role }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function mudarStatus(status) {
    setCarregando(true);
    await fetch(`/api/visitas/${visita.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="card p-4 mb-3">
      <div className="flex justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold">{visita.endereco}</div>
          <div className="text-xs text-marinho/50">
            {role === 'master' && cliente ? `${cliente.nome_empresa} · ` : ''}
            {fmtDataHora(visita.data_hora)}
            {visita.responsavel ? ` · ${visita.responsavel}` : ''}
            {visita.solicitado_por ? ` · solicitado por ${visita.solicitado_por}` : ''}
          </div>
          {visita.observacoes && <div className="text-xs text-marinho/50 mt-1">{visita.observacoes}</div>}
        </div>
        <span className={`tag ${STATUS_CLASS[visita.status]}`}>{STATUS_LABEL_VISITA[visita.status]}</span>
      </div>

      {role === 'master' && visita.status === 'pendente' && (
        <div className="flex gap-2 justify-end mt-3">
          <button disabled={carregando} onClick={() => mudarStatus('cancelada')} className="border border-linha text-sm px-3 py-1.5 rounded">
            Recusar
          </button>
          <button disabled={carregando} onClick={() => mudarStatus('confirmada')} className="bg-verde text-white text-sm px-3 py-1.5 rounded">
            Confirmar
          </button>
        </div>
      )}
      {role === 'master' && visita.status === 'confirmada' && (
        <div className="flex gap-2 justify-end mt-3">
          <button disabled={carregando} onClick={() => mudarStatus('cancelada')} className="border border-linha text-sm px-3 py-1.5 rounded">
            Cancelar
          </button>
          <a
            href={`/master/orcamentos/novo?tipo=rescisao&endereco=${encodeURIComponent(visita.endereco)}&cliente_id=${visita.cliente_id}`}
            className="bg-verde text-white text-sm px-3 py-1.5 rounded"
          >
            Transformar em orçamento
          </a>
        </div>
      )}
      {role === 'imobiliaria' && visita.status === 'pendente' && (
        <div className="flex justify-end mt-3">
          <button disabled={carregando} onClick={() => mudarStatus('cancelada')} className="border border-linha text-sm px-3 py-1.5 rounded">
            Cancelar solicitação
          </button>
        </div>
      )}
    </div>
  );
}
