'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovoAcessoForm({ clientes }) {
  const router = useRouter();
  const [form, setForm] = useState({
    role: 'imobiliaria',
    subrole: 'admin',
    nome_completo: '',
    cpf: '',
    email: '',
    senha: '',
    cliente_id: clientes?.[0]?.id || '',
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
    const res = await fetch('/api/acessos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error || 'Erro ao criar acesso');
      return;
    }
    router.push('/master/acessos');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-md">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}

      <div>
        <label className="block text-xs text-marinho/60 mb-1">Imobiliária vinculada</label>
        <select value={form.cliente_id} onChange={set('cliente_id')} className="w-full border border-linha rounded px-3 py-2 bg-papel">
          {(clientes || []).map((c) => (
            <option key={c.id} value={c.id}>{c.nome_empresa}</option>
          ))}
        </select>
        {(!clientes || clientes.length === 0) && (
          <div className="text-xs text-alerta mt-1">Cadastre uma imobiliária antes de criar este acesso.</div>
        )}
      </div>

      <div>
        <label className="block text-xs text-marinho/60 mb-1">Setor / nível de acesso</label>
        <select value={form.subrole} onChange={set('subrole')} className="w-full border border-linha rounded px-3 py-2 bg-papel">
          <option value="admin">Administrador (acessa tudo, cria outros usuários)</option>
          <option value="operacional">Operacional (só solicita e acompanha orçamentos)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-marinho/60 mb-1">Nome completo</label>
        <input value={form.nome_completo} onChange={set('nome_completo')} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">CPF</label>
        <input value={form.cpf} onChange={set('cpf')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">E-mail de login</label>
        <input type="email" value={form.email} onChange={set('email')} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Senha</label>
        <input type="password" value={form.senha} onChange={set('senha')} required minLength={6} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>

      <button disabled={salvando} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {salvando ? 'Criando…' : 'Criar acesso'}
      </button>
    </form>
  );
}
