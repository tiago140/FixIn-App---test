'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SENHA_MIN, gerarSenha } from '@/lib/senha';

export default function NovoAcessoForm({ clientes, podeCriarMaster = false, tipoInicial = 'imobiliaria' }) {
  const router = useRouter();
  const [form, setForm] = useState({
    role: tipoInicial === 'master' && podeCriarMaster ? 'master' : 'imobiliaria',
    subrole: 'admin',
    nome_completo: '',
    cpf: '',
    email: '',
    senha: '',
    cliente_id: clientes?.[0]?.id || '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [criado, setCriado] = useState(null);

  const ehMaster = form.role === 'master';

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
    setCriado({ nome: form.nome_completo, email: form.email.trim().toLowerCase(), senha: form.senha });
    router.refresh();
  }

  if (criado) {
    return (
      <div className="card p-5 max-w-md space-y-3">
        <div className="font-semibold text-sucesso">Acesso criado.</div>
        <div className="text-sm">
          Passe estes dados para <b>{criado.nome}</b> (por WhatsApp ou telefone) e peça para trocar a senha no primeiro acesso, em <b>Minha conta</b>:
        </div>
        <div className="bg-papel border border-linha rounded p-3 text-sm font-mono">
          <div>Endereço: {typeof window !== 'undefined' ? window.location.origin : ''}</div>
          <div>E-mail: {criado.email}</div>
          <div>Senha: {criado.senha}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/master/acessos')} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold">Ver equipe e acessos</button>
          <button onClick={() => { setCriado(null); setForm((f) => ({ ...f, nome_completo: '', cpf: '', email: '', senha: '' })); }} className="border border-linha rounded px-4 py-2 text-sm">Criar outro</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-md">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}

      <div>
        <label className="block text-xs text-marinho/60 mb-1">Tipo de usuário</label>
        <select value={form.role} onChange={set('role')} className="w-full border border-linha rounded px-3 py-2 bg-papel">
          {podeCriarMaster && <option value="master">Funcionário FixIn — acesso total (master)</option>}
          <option value="imobiliaria">Imobiliária (cliente)</option>
        </select>
        {ehMaster && (
          <div className="text-xs text-alerta mt-1.5">
            Acessa <b>tudo</b>: orçamentos, financeiro e margens, controle, auditoria e acessos das imobiliárias. Só você (dono) cria e desativa usuários master.
          </div>
        )}
      </div>

      {!ehMaster && (
        <>
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
        </>
      )}

      <div>
        <label className="block text-xs text-marinho/60 mb-1">Nome completo</label>
        <input value={form.nome_completo} onChange={set('nome_completo')} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">CPF (opcional)</label>
        <input value={form.cpf} onChange={set('cpf')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">E-mail de login</label>
        <input type="email" value={form.email} onChange={set('email')} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Senha inicial (mín. {SENHA_MIN} caracteres)</label>
        <div className="flex gap-2">
          <input value={form.senha} onChange={set('senha')} required minLength={SENHA_MIN} className="flex-1 border border-linha rounded px-3 py-2 bg-papel" />
          <button type="button" onClick={() => setForm((f) => ({ ...f, senha: gerarSenha() }))} className="text-xs border border-linha rounded px-3 bg-white hover:bg-papel whitespace-nowrap">Gerar senha</button>
        </div>
      </div>

      <button disabled={salvando} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {salvando ? 'Criando…' : 'Criar acesso'}
      </button>
    </form>
  );
}
