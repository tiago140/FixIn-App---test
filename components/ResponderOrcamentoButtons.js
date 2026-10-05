'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// `bloqueado` = texto explicando por que ainda não dá para decidir (ex.: orçamento ainda em preparação pela FixIn).
export default function ResponderOrcamentoButtons({ orcamentoId, bloqueado = '' }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function responder(status) {
    if (bloqueado) return;
    setErro('');
    setEnviando(true);
    const res = await fetch(`/api/orcamentos/${orcamentoId}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d.error || 'Não foi possível salvar.');
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {bloqueado && (
        <div role="status" className="text-sm bg-alerta/10 border border-alerta text-marinho px-4 py-3 rounded-lg mb-3">
          <b>Aprovação ainda bloqueada.</b> {bloqueado}
        </div>
      )}
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded mb-3">{erro}</div>}
      <div className="flex gap-3">
        <button disabled={enviando || !!bloqueado} title={bloqueado || undefined} onClick={() => responder('rejeitado')} className="flex-1 border border-erro text-erro rounded py-2.5 font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
          Recusar
        </button>
        <button disabled={enviando || !!bloqueado} title={bloqueado || undefined} onClick={() => responder('aprovado')} className="flex-1 bg-verde text-white rounded py-2.5 font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
          Aprovar orçamento
        </button>
      </div>
    </div>
  );
}
