'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { KANBAN_COLS, STATUS_LABEL, fmtBRL, calcularTotalComMargem, estaAtrasado } from '@/lib/format';

// Texto sem acento e em minúsculas, para a busca não depender de acentuação nem de maiúsculas.
const norm = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Tudo o que a pessoa pode querer procurar num cartão: número, endereço, imobiliária, cliente final, contrato, etapa, tipo.
function textoBusca(o) {
  return norm([
    o.numero, o.endereco, o.clientes?.nome_empresa, o.nome_empresa, o.nome_cliente_final, o.cpf_cliente_final, o.cnpj_cliente_final,
    o.numero_contrato, STATUS_LABEL[o.status || 'pendente'], o.tipo === 'manutencao' ? 'manutencao manut' : 'rescisao',
  ].join(' '));
}

export default function KanbanBoard({ orcamentos, readOnly, basePath, veValores = true }) {
  const router = useRouter();
  const [itens, setItens] = useState(orcamentos);
  const [dragId, setDragId] = useState(null);
  const [busca, setBusca] = useState('');
  const termos = norm(busca).split(/\s+/).filter(Boolean);
  const indice = useMemo(() => new Map(itens.map((o) => [o.id, textoBusca(o)])), [itens]);
  // todos os termos digitados precisam aparecer (em qualquer ordem) — "vicencia 33" acha "Rua Vicencia ... Apto 33"
  const visiveis = termos.length ? itens.filter((o) => termos.every((t) => (indice.get(o.id) || '').includes(t))) : itens;

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
    <>
    <div className="mb-3 flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[220px] max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-marinho/40" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por endereço, imobiliária, nº do orçamento, cliente…"
          aria-label="Pesquisar nos orçamentos"
          className="w-full border border-linha rounded-lg bg-white pl-9 pr-9 py-2 text-sm"
        />
        {busca && (
          <button type="button" onClick={() => setBusca('')} aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 -translate-y-1/2 text-marinho/50 p-1">
            <X size={15} />
          </button>
        )}
      </div>
      {termos.length > 0 && (
        <span className="text-xs text-marinho/60">
          {visiveis.length === 0 ? 'Nenhum orçamento encontrado' : `${visiveis.length} de ${itens.length} orçamento(s)`}
        </span>
      )}
    </div>
    <div className="flex gap-3 overflow-x-auto pb-3">
      {KANBAN_COLS.map((status) => {
        const doStatus = visiveis.filter((o) => (o.status || 'pendente') === status);
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
              {doStatus.length === 0 && <div className="text-xs text-marinho/40 p-2">{termos.length ? 'Nada nesta etapa' : 'Vazio'}</div>}
              {doStatus.map((o) => {
                const idxAtual = KANBAN_COLS.indexOf(status);
                // Dono: calcula pelos itens. Imobiliária: o banco já entrega o total (ou nulo, para o operacional).
                const total = o.total != null ? Number(o.total) : o.orcamento_itens ? calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) : null;
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
                    {veValores && total != null && <div className="font-mono mt-0.5">{fmtBRL(total)}</div>}
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
    </>
  );
}
