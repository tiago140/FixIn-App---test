'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fmtDataHora } from '@/lib/format';

const STATUS_LABEL_VISITA = { pendente: 'Aguardando aprovação', confirmada: 'Confirmada', cancelada: 'Cancelada', sugerida: 'Outra data sugerida' };
const STATUS_CLASS = { pendente: 'tag-pendente', confirmada: 'tag-aprovado', cancelada: 'tag-rejeitado', sugerida: 'tag-em_preparacao' };

export default function VisitaRow({ visita, cliente, role }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [novaData, setNovaData] = useState('');

  async function enviar(body) {
    setCarregando(true);
    const res = await fetch(`/api/visitas/${visita.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setCarregando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Não foi possível salvar.');
      return;
    }
    setSugerindo(false);
    router.refresh();
  }

  function confirmarSugestao() {
    if (!novaData) return;
    enviar({ status: 'sugerida', data_hora_sugerida: novaData });
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
          {visita.status === 'sugerida' && visita.data_hora_sugerida && (
            <div className="text-xs text-alerta font-semibold mt-1">
              FixIn sugeriu: {fmtDataHora(visita.data_hora_sugerida)}
            </div>
          )}
          {visita.observacoes && <div className="text-xs text-marinho/50 mt-1">{visita.observacoes}</div>}
          {visita.prestadores?.nome && (
            <div className="text-xs text-marinho font-medium mt-2 bg-papel inline-block px-2 py-1 rounded">
              👷 Prestador: {visita.prestadores.nome}{visita.prestadores.telefone ? ` · ${visita.prestadores.telefone}` : ''}
            </div>
          )}
        </div>
        <span className={`tag ${STATUS_CLASS[visita.status]}`}>{STATUS_LABEL_VISITA[visita.status]}</span>
      </div>

      {role === 'master' && visita.status === 'pendente' && !sugerindo && (
        <div className="flex gap-2 justify-end mt-3">
          <button disabled={carregando} onClick={() => enviar({ status: 'cancelada' })} className="border border-linha text-sm px-3 py-1.5 rounded">
            Recusar
          </button>
          <button disabled={carregando} onClick={() => setSugerindo(true)} className="border border-linha text-sm px-3 py-1.5 rounded">
            Não posso — sugerir outra data
          </button>
          <button disabled={carregando} onClick={() => enviar({ status: 'confirmada' })} className="bg-verde text-white text-sm px-3 py-1.5 rounded">
            Confirmar
          </button>
        </div>
      )}

      {role === 'master' && sugerindo && (
        <div className="flex gap-2 justify-end items-end mt-3">
          <div>
            <label className="block text-[11px] text-marinho/60 mb-1">Nova data e hora</label>
            <input type="datetime-local" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="border border-linha rounded px-2 py-1.5 bg-papel text-sm" />
          </div>
          <button onClick={() => setSugerindo(false)} className="border border-linha text-sm px-3 py-1.5 rounded">Cancelar</button>
          <button disabled={carregando || !novaData} onClick={confirmarSugestao} className="bg-marinho text-white text-sm px-3 py-1.5 rounded disabled:opacity-50">
            Enviar sugestão
          </button>
        </div>
      )}

      {role === 'master' && visita.status === 'sugerida' && (
        <div className="text-xs text-marinho/50 mt-2">Aguardando a imobiliária aceitar a nova data.</div>
      )}

      {role === 'master' && visita.status === 'confirmada' && (
        <div className="flex gap-2 justify-end mt-3">
          <button disabled={carregando} onClick={() => enviar({ status: 'cancelada' })} className="border border-linha text-sm px-3 py-1.5 rounded">
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
          <button disabled={carregando} onClick={() => enviar({ status: 'cancelada' })} className="border border-linha text-sm px-3 py-1.5 rounded">
            Cancelar solicitação
          </button>
        </div>
      )}

      {role === 'imobiliaria' && visita.status === 'sugerida' && (
        <div className="flex gap-2 justify-end mt-3">
          <button disabled={carregando} onClick={() => enviar({ status: 'cancelada' })} className="border border-linha text-sm px-3 py-1.5 rounded">
            Recusar
          </button>
          <button disabled={carregando} onClick={() => enviar({ status: 'confirmada' })} className="bg-verde text-white text-sm px-3 py-1.5 rounded">
            Aceitar nova data
          </button>
        </div>
      )}
    </div>
  );
}
