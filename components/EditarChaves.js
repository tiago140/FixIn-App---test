'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Equipe FixIn: onde o prestador pega as chaves do imóvel (aparece para ele na ordem).
export default function EditarChaves({ osId, valor }) {
  const router = useRouter();
  const [v, setV] = useState(valor || '');
  const [busy, setBusy] = useState(false);
  async function salvar() {
    setBusy(true);
    await fetch(`/api/ordens/${osId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'chaves', chaves: v }) });
    setBusy(false); router.refresh();
  }
  return (
    <div className="sm:col-span-2">
      <span className="text-xs text-marinho/50 block mb-1">Onde pegar as chaves</span>
      <div className="flex gap-2"><input value={v} onChange={(e) => setV(e.target.value)} className="flex-1 border border-linha rounded-lg px-3 py-2 text-sm" placeholder="Ex.: portaria, imobiliária, caixinha com senha…" />
        <button type="button" disabled={busy || v === (valor || '')} onClick={salvar} className="rounded-lg bg-marinho text-white px-4 text-sm font-semibold disabled:opacity-40">{busy ? '…' : 'Salvar'}</button></div>
    </div>
  );
}
