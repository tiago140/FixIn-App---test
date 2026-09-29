'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovoPrestadorForm() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', rg: '', cpf: '', telefone: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const res = await fetch('/api/prestadores', {
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
    router.push('/master/prestadores');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-md">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Nome completo</label>
        <input value={form.nome} onChange={set('nome')} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-marinho/60 mb-1">RG</label>
          <input value={form.rg} onChange={set('rg')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>
        <div>
          <label className="block text-xs text-marinho/60 mb-1">CPF</label>
          <input value={form.cpf} onChange={set('cpf')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Telefone</label>
        <input value={form.telefone} onChange={set('telefone')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <button disabled={salvando} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {salvando ? 'Salvando…' : 'Cadastrar'}
      </button>
    </form>
  );
}
