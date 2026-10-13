'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gerarSenha } from '@/lib/senha';

// Cria o login do prestador (e-mail + senha provisória, que ele troca no primeiro acesso).
export default function AcessoPrestadorForm({ prestador }) {
  const router = useRouter();
  const [email, setEmail] = useState(prestador.email || '');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [criado, setCriado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function criar(e) {
    e.preventDefault();
    setErro(''); setSalvando(true);
    const res = await fetch('/api/acessos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'prestador', prestador_id: prestador.id, nome_completo: prestador.nome, cpf: prestador.cpf || prestador.cnpj || '', email, senha }),
    });
    const data = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) return setErro(data.error || 'Erro ao criar acesso');
    setCriado({ email, senha });
    router.refresh();
  }

  if (criado) {
    return (
      <div className="card p-5 rounded-xl border-l-4 border-l-sucesso max-w-xl">
        <h3 className="font-semibold mb-1">Acesso criado</h3>
        <p className="text-sm text-marinho/70">Passe estes dados ao prestador. A senha é provisória: ele troca no primeiro acesso.</p>
        <div className="mt-3 font-mono text-sm bg-papel border border-linha rounded-lg p-3">
          Login: {criado.email}<br />Senha provisória: {criado.senha}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={criar} className="card p-5 rounded-xl max-w-xl space-y-3">
      <h3 className="font-semibold">Criar acesso ao portal</h3>
      <p className="text-xs text-marinho/50">O prestador entra com e-mail e senha para ver as ordens, aceitar e enviar valores.</p>
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail de login" className="w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm" />
      <div className="flex gap-2">
        <input required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha provisória (mín. 8)" className="flex-1 border border-linha rounded-lg px-3 py-2 bg-papel text-sm font-mono" />
        <button type="button" onClick={() => setSenha(gerarSenha(10))} className="border border-linha rounded-lg px-3 text-sm">Gerar</button>
      </div>
      <button disabled={salvando} className="bg-verde text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">{salvando ? 'Criando…' : 'Criar acesso'}</button>
    </form>
  );
}
