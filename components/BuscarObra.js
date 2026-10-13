'use client';
import { useState } from 'react';

export default function BuscarObra() {
  const [endereco, setEndereco] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  async function buscar(e) {
    e.preventDefault(); setErro(''); setBusy(true);
    try {
      const r = await fetch('/api/acompanhar/buscar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endereco, codigo }) });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro || 'Não foi possível consultar.'); setBusy(false); return; }
      window.location.href = `/acompanhar/${j.token}`;
    } catch (err) { setErro('Sem conexão. Tente de novo.'); setBusy(false); }
  }
  return (
    <form onSubmit={buscar} className="mt-6 space-y-4">
      <label className="block"><span className="text-sm font-semibold">Endereço da obra</span>
        <input value={endereco} onChange={(e) => setEndereco(e.target.value)} required placeholder="Ex.: Rua das Flores, 120" className="mt-1 w-full rounded-lg border border-linha px-3 py-3 text-base" /></label>
      <label className="block"><span className="text-sm font-semibold">Código do orçamento</span>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="Ex.: ORC-0123" className="mt-1 w-full rounded-lg border border-linha px-3 py-3 text-base" /></label>
      {erro && <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{erro}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-marinho text-white font-semibold py-3 disabled:opacity-60">{busy ? 'Buscando…' : 'Ver andamento da obra'}</button>
    </form>
  );
}
