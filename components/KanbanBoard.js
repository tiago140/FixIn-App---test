'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KANBAN_COLS, STATUS_LABEL, fmtBRL, calcularTotalComMargem, estaAtrasado } from '@/lib/format';

export default function KanbanBoard({ orcamentos, readOnly, basePath }) {
  const router = useRouter();
  const [itens, setItens] = useState(orcamentos);
  const [dragId, setDragId] = useState(null);

  async function moverPara(id, novoStatus) {
    setItens((lista) => lista.map((o) => (o.id === id ? { ...o, status: novoStatus } : o)));
    if (readOnly) return;
    await fetch(`/api/orcamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {KANBAN_COLS.map((status) => {
        const doStatus = itens.filter((o) => (o.status || 'pendente') === status);
        return (
          <div
            key={status}
            className="flex-shrink-0 w-72 bg-white border border-linha rounded max-h-[70vh] flex flex-col"
            onDragOver={(e) => !readOnly && e.preventDefault()}
            onDrop={(e) => {
              if (readOnly) return;
              e.preventDefault();
              if (dragId) moverPara(dragId, status);
            }}
          >
            <div className="px-3 py-2 border-b border-linha text-sm font-semibold flex justify-between">
              <span>{STATUS_LABEL[status]}</span>
              <span className="font-mono text-marinho/50">{doStatus.length}</span>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              {doStatus.length === 0 && <div className="text-xs text-marinho/40 p-2">Vazio</div>}
              {doStatus.map((o) => {
                const idxAtual = KANBAN_COLS.indexOf(status);
                const total = calcularTotalComMargem(o.orcamento_itens, o.margem_percentual);
                return (
                  <div
                    key={o.id}
                    draggable={!readOnly}
                    onDragStart={() => setDragId(o.id)}
                    className="bg-papel border border-linha rounded p-2 mb-2 text-xs cursor-pointer"
                    onClick={() => router.push(`${basePath}/${o.id}`)}
                  >
                    <span className="block font-mono text-[10px] text-marinho/50">
                      {o.numero} {o.tipo === 'manutencao' ? '· MANUT.' : ''}
                    </span>
                    <div className="font-semibold mt-0.5">{o.endereco}</div>
                    <div className="font-mono mt-0.5">{fmtBRL(total)}</div>
                    {estaAtrasado(o) && (
                      <div className="mt-1">
                        <span className="text-[10px] bg-erro/20 text-erro px-1.5 py-0.5 rounded font-semibold">EM ATRASO</span>
                      </div>
                    )}
                    {!readOnly && (
                      <div className="flex justify-between mt-1.5" onClick={(e) => e.stopPropagation()}>
                        {idxAtual > 0 ? (
                          <button
                            className="text-[10px] border border-linha rounded px-1.5 py-0.5"
                            onClick={() => moverPara(o.id, KANBAN_COLS[idxAtual - 1])}
                          >
                            ← {STATUS_LABEL[KANBAN_COLS[idxAtual - 1]]}
                          </button>
                        ) : (
                          <span />
                        )}
                        {idxAtual < KANBAN_COLS.length - 2 ? (
                          <button
                            className="text-[10px] border border-linha rounded px-1.5 py-0.5"
                            onClick={() => moverPara(o.id, KANBAN_COLS[idxAtual + 1])}
                          >
                            {STATUS_LABEL[KANBAN_COLS[idxAtual + 1]]} →
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
