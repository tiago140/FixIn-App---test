'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Equipe: define o prazo combinado da ordem (o prestador vê, com aviso quando está perto).
export default function PrazoOS({ osId, prazo }) {
  const router = useRouter();
  const [v, setV] = useState(prazo || '');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  async function salvar() {
    setErro(''); setOcupado(true);
    const res = await fetch(`/api/ordens/${osId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'definir_prazo', prazo: v }) });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível salvar');
    router.refresh();
  }
  return (
    <div className="card p-5 rounded-xl space-y-2">
      <h3 className="font-semibold">Prazo da ordem</h3>
      <div className="flex gap-2 items-center">
        <input type="date" value={v} onChange={(e) => setV(e.target.value)} className="border border-linha rounded-lg px-3 py-2 bg-papel text-sm" />
        <button type="button" disabled={ocupado} onClick={salvar} className="bg-marinho text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">{ocupado ? 'Salvando…' : 'Salvar'}</button>
      </div>
      {erro && <div className="text-sm text-erro">{erro}</div>}
      <p className="text-xs text-marinho/50">O prestador vê o prazo no painel e na ordem, com aviso quando faltar 2 dias ou menos.</p>
    </div>
  );
}
