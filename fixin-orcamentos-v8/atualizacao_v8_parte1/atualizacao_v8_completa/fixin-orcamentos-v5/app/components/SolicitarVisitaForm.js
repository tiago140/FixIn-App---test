'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SolicitarVisitaForm() {
  const router = useRouter();
  const [form, setForm] = useState({ endereco: '', data_hora: '', observacoes: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const res = await fetch('/api/visitas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error || 'Erro ao enviar solicitação');
      return;
    }
    router.push('/imobiliaria/visitas');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-md">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Endereço do imóvel</label>
        <input value={form.endereco} onChange={set('endereco')} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Data e hora desejada</label>
        <input type="datetime-local" value={form.data_hora} onChange={set('data_hora')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Observações</label>
        <textarea value={form.observacoes} onChange={set('observacoes')} rows={3} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div className="text-xs text-marinho/50">Sua solicitação fica pendente até a FixIn confirmar.</div>
      <button disabled={salvando} className="bg-verde text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50 w-full">
        {salvando ? 'Enviando…' : 'Enviar solicitação'}
      </button>
    </form>
  );
}
