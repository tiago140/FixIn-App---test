'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro('E-mail ou senha incorretos.');
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-slab text-2xl font-bold text-marinho">FixIn</div>
          <div className="text-xs tracking-wide text-verde font-semibold">REFORMAS</div>
          <div className="text-sm text-marinho/60 mt-3">Painel de orçamentos</div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {erro && (
            <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">
              {erro}
            </div>
          )}
          <div>
            <label className="block text-xs text-marinho/60 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-linha rounded px-3 py-2 bg-papel"
            />
          </div>
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full border border-linha rounded px-3 py-2 bg-papel"
            />
          </div>
          <button
            disabled={carregando}
            className="w-full bg-marinho text-white rounded py-2.5 font-semibold disabled:opacity-50"
          >
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
