'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovoClienteForm() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', email: '', cnpj: '', nome_empresa: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const res = await fetch('/api/clientes', {
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
    router.push('/master/clientes');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-md">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      <Field label="Nome da empresa (imobiliária)" value={form.nome_empresa} onChange={set('nome_empresa')} required />
      <Field label="Pessoa de contato" value={form.nome} onChange={set('nome')} />
      <Field label="E-mail" type="email" value={form.email} onChange={set('email')} />
      <Field label="CNPJ" value={form.cnpj} onChange={set('cnpj')} />
      <button disabled={salvando} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {salvando ? 'Salvando…' : 'Cadastrar'}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-xs text-marinho/60 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full border border-linha rounded px-3 py-2 bg-papel"
      />
    </div>
  );
}
