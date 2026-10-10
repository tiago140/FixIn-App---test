'use client';

import { useEffect, useState } from 'react';
import SenhaInput from '@/components/SenhaInput';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [etapaMfa, setEtapaMfa] = useState(false);
  const [codigo, setCodigo] = useState('');

  // Voltou do sistema pedindo a verificação em duas etapas (sessão já existe, falta o código)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mfa') === '1') setEtapaMfa(true);
  }, []);

  async function verificarCodigo(e) {
    e.preventDefault();
    setErro(''); setCarregando(true);
    const { data: f } = await supabase.auth.mfa.listFactors();
    const fator = (f?.totp || []).find((x) => x.status === 'verified');
    if (!fator) { setCarregando(false); return setErro('Nenhum aplicativo de verificação encontrado.'); }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo.replace(/\s/g, '') });
    setCarregando(false);
    if (error) return setErro('Código incorreto ou vencido. Tente de novo.');
    router.push('/');
    router.refresh();
  }

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

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') { setEtapaMfa(true); return; }
    router.push('/');
    router.refresh();
  }

  if (etapaMfa) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={verificarCodigo} className="card p-6 space-y-4 w-full max-w-sm">
          <div className="font-slab text-xl font-bold text-marinho">Verificação em duas etapas</div>
          <p className="text-sm text-marinho/70">Digite o código de 6 números do seu aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy…).</p>
          {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={codigo} onChange={(e) => setCodigo(e.target.value)} required className="w-full border border-linha rounded px-3 py-2 bg-papel text-center text-2xl tracking-widest font-mono" />
          <button disabled={carregando} className="w-full bg-marinho text-white rounded py-2.5 font-semibold disabled:opacity-50">{carregando ? 'Verificando…' : 'Confirmar'}</button>
        </form>
      </div>
    );
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
            <SenhaInput
              required
              autoComplete="current-password"
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
