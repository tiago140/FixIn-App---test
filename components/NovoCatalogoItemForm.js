'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovoCatalogoItemForm() {
  const router = useRouter();
  const [form, setForm] = useState({ ambiente: '', servico: '', mo_padrao: '', ma_padrao: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const res = await fetch('/api/catalogo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error || 'Erro ao salvar');
      return;
    }
    setForm({ ambiente: '', servico: '', mo_padrao: '', ma_padrao: '' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 mb-6 grid sm:grid-cols-5 gap-3 items-end">
      {erro && <div className="sm:col-span-5 text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      <div className="sm:col-span-2">
        <label className="block text-xs text-marinho/60 mb-1">Ambiente</label>
        <input value={form.ambiente} onChange={set('ambiente')} required placeholder="Ex: Sala" className="w-full border border-linha rounded px-2 py-1.5 bg-papel text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs text-marinho/60 mb-1">Serviço</label>
        <input value={form.servico} onChange={set('servico')} required placeholder="Ex: Pintura parede" className="w-full border border-linha rounded px-2 py-1.5 bg-papel text-sm" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">MO (R$)</label>
        <input type="number" step="0.01" value={form.mo_padrao} onChange={set('mo_padrao')} className="w-full border border-linha rounded px-2 py-1.5 bg-papel text-sm" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">MA (R$)</label>
        <input type="number" step="0.01" value={form.ma_padrao} onChange={set('ma_padrao')} className="w-full border border-linha rounded px-2 py-1.5 bg-papel text-sm" />
      </div>
      <button disabled={salvando} className="bg-marinho text-white rounded px-4 py-1.5 text-sm font-semibold sm:col-span-1">
        {salvando ? 'Salvando…' : 'Adicionar'}
      </button>
    </form>
  );
}
