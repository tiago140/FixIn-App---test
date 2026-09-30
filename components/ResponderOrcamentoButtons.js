'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResponderOrcamentoButtons({ orcamentoId }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function responder(status) {
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
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded mb-3">{erro}</div>}
      <div className="flex gap-3">
        <button disabled={enviando} onClick={() => responder('rejeitado')} className="flex-1 border border-erro text-erro rounded py-2.5 font-semibold disabled:opacity-50">
          Recusar
        </button>
        <button disabled={enviando} onClick={() => responder('aprovado')} className="flex-1 bg-verde text-white rounded py-2.5 font-semibold disabled:opacity-50">
          Aprovar orçamento
        </button>
      </div>
    </div>
  );
}
