'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovoLaudoForm({ clientes, orcamentos }) {
  const router = useRouter();
  const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ cliente_id: '', endereco: '', data_inspecao: hoje, orcamento_id: '' });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const set = (c) => (e) => setForm((f) => ({ ...f, [c]: e.target.value, ...(c === 'cliente_id' ? { orcamento_id: '' } : {}) }));
  const doCliente = orcamentos.filter((o) => o.cliente_id === form.cliente_id);

  async function criar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const res = await fetch('/api/laudos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, orcamento_id: form.orcamento_id || null }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setEnviando(false); return setErro(d.error || 'Não foi possível criar o laudo.'); }
    router.push(`/master/laudos/${d.id}`);
  }

  const campo = 'mt-1 w-full border border-linha rounded px-3 py-2 bg-papel text-sm text-marinho';
  return (
    <form onSubmit={criar} className="card p-5 max-w-2xl space-y-4">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      <label className="block text-xs text-marinho/60">Imobiliária
        <select value={form.cliente_id} onChange={set('cliente_id')} required className={campo}>
          <option value="">Escolha…</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
        </select>
      </label>
      <label className="block text-xs text-marinho/60">Endereço do imóvel
        <input value={form.endereco} onChange={set('endereco')} required maxLength={200} className={campo} placeholder="Rua, número, bairro, cidade" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-xs text-marinho/60">Data da inspeção
          <input type="date" value={form.data_inspecao} onChange={set('data_inspecao')} required className={campo} />
        </label>
        <label className="block text-xs text-marinho/60">Orçamento relacionado (opcional)
          <select value={form.orcamento_id} onChange={set('orcamento_id')} disabled={!form.cliente_id} className={`${campo} disabled:opacity-50`}>
            <option value="">Nenhum</option>
            {doCliente.map((o) => <option key={o.id} value={o.id}>{o.numero} — {o.endereco}</option>)}
          </select>
        </label>
      </div>
      <button disabled={enviando} className="bg-marinho text-white text-sm font-semibold rounded-lg px-5 py-2.5 disabled:opacity-50">{enviando ? 'Criando…' : 'Criar laudo e começar'}</button>
    </form>
  );
}
