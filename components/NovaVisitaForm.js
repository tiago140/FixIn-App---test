'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovaVisitaForm({ clientes, prestadores }) {
  const router = useRouter();
  const [form, setForm] = useState({
    cliente_id: clientes?.[0]?.id || '',
    endereco: '',
    data_hora: '',
    responsavel: '',
    prestador_id: '',
    observacoes: '',
  });
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
      setErro(data.error || 'Erro ao agendar');
      return;
    }
    router.push('/master/visitas');
    router.refresh();
  }

  if (!clientes || clientes.length === 0) {
    return <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Cadastre uma imobiliária antes.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-md">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Imobiliária</label>
        <select value={form.cliente_id} onChange={set('cliente_id')} className="w-full border border-linha rounded px-3 py-2 bg-papel">
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome_empresa}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Endereço do imóvel</label>
        <input value={form.endereco} onChange={set('endereco')} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Data e hora</label>
        <input type="datetime-local" value={form.data_hora} onChange={set('data_hora')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Responsável (texto livre)</label>
        <input value={form.responsavel} onChange={set('responsavel')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Prestador (cadastrado)</label>
        <select value={form.prestador_id} onChange={set('prestador_id')} className="w-full border border-linha rounded px-3 py-2 bg-papel">
          <option value="">— nenhum —</option>
          {(prestadores || []).map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Observações</label>
        <textarea value={form.observacoes} onChange={set('observacoes')} rows={3} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <button disabled={salvando} className="bg-verde text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50 w-full">
        {salvando ? 'Agendando…' : 'Agendar (já confirmada)'}
      </button>
    </form>
  );
}
