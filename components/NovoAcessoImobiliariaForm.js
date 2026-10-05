'use client';

import { useState } from 'react';
import SenhaInput from '@/components/SenhaInput';
import { SENHA_MIN } from '@/lib/senha';
import { useRouter } from 'next/navigation';

export default function NovoAcessoImobiliariaForm() {
  const router = useRouter();
  const [form, setForm] = useState({ subrole: 'operacional', nome_completo: '', cpf: '', email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const res = await fetch('/api/imobiliaria/acessos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error || 'Erro ao criar usuário');
      return;
    }
    router.push('/imobiliaria/equipe');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-md">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Setor / nível de acesso</label>
        <select value={form.subrole} onChange={set('subrole')} className="w-full border border-linha rounded px-3 py-2 bg-papel">
          <option value="operacional">Operacional (solicita e acompanha orçamentos, usa o chat)</option>
          <option value="admin">Administrador (acessa tudo, cria outros usuários)</option>
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
        <SenhaInput autoComplete="new-password" value={form.senha} onChange={set('senha')} required minLength={SENHA_MIN} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <button disabled={salvando} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {salvando ? 'Criando…' : 'Criar usuário'}
      </button>
    </form>
  );
}
