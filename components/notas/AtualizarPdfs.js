'use client';
import { useState } from 'react';

export default function AtualizarPdfs() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function rodar() {
    setBusy(true); setMsg('Atualizando…');
    let total = 0, erros = 0;
    try {
      for (let i = 0; i < 40; i++) {
        const r = await fetch('/api/orcamentos/atualizar-pdfs', { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setMsg(j.error || 'Falhou.'); return; }
        total += j.feitos; erros += j.erros;
        setMsg(`${total} atualizado(s)… restam ${j.restam}`);
        if (!j.restam || (j.feitos === 0)) break;
      }
      setMsg(`Pronto: ${total} PDF(s) atualizado(s)${erros ? `, ${erros} com erro (tente de novo)` : ''}.`);
    } finally { setBusy(false); }
  }
  return (
    <section className="card p-4 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-marinho">PDFs antigos dos orçamentos</div>
        <div className="text-xs text-gray-500">Os PDFs gerados antes do QR de pagamento não têm o QR nem o link. Este botão refaz todos de uma vez.</div>
        {msg && <div className="text-sm mt-1 text-marinho">{msg}</div>}
      </div>
      <button onClick={rodar} disabled={busy} className="rounded-full px-5 py-2 text-sm font-semibold bg-marinho text-white disabled:opacity-50">{busy ? 'Atualizando…' : 'Atualizar PDFs'}</button>
    </section>
  );
}
