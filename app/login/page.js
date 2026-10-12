'use client';

import { useEffect, useState } from 'react';
import SenhaInput from '@/components/SenhaInput';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ClipboardList, ShieldCheck, Wallet } from 'lucide-react';

const CAMPO = 'w-full border border-linha rounded-lg px-3.5 py-3 bg-papel text-base outline-none transition focus:border-marinho focus:ring-2 focus:ring-marinho/15';

// Moldura da tela de entrada: painel azul com a marca à esquerda (some no celular) e o formulário à direita.
function Moldura({ children }) {
  const pontos = [
    { Icone: ClipboardList, titulo: 'Do laudo ao orçamento', texto: 'Chamados, laudos e orçamentos acompanhados em um só lugar.' },
    { Icone: Wallet, titulo: 'Pagamento sob controle', texto: 'Cobrança, comprovantes e prazos sempre à vista do time.' },
    { Icone: ShieldCheck, titulo: 'Acesso seguro', texto: 'Cada pessoa vê apenas o que precisa, com verificação em duas etapas.' },
  ];
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="hidden lg:flex flex-col justify-between bg-marinho text-white px-14 py-12">
        <div>
          <div className="font-slab text-4xl font-bold tracking-tight">FixIn</div>
          <div className="text-xs font-mono font-semibold tracking-[0.3em] text-white/70 mt-1">REFORMAS</div>
        </div>
        <div className="max-w-md">
          <h1 className="font-slab text-4xl font-bold leading-tight">Reformas de imóveis sem complicação.</h1>
          <p className="text-white/75 mt-4 text-lg">O painel que organiza toda a operação, da vistoria ao pagamento.</p>
          <ul className="mt-10 space-y-6">
            {pontos.map(({ Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="w-11 h-11 shrink-0 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center"><Icone size={22} /></span>
                <span>
                  <span className="block font-semibold">{titulo}</span>
                  <span className="block text-sm text-white/70 mt-0.5">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-white/50">app.fixinreformas.com</div>
      </aside>

      <main className="flex flex-col">
        <div className="lg:hidden bg-marinho text-white px-6 py-6 text-center">
          <div className="font-slab text-3xl font-bold tracking-tight">FixIn</div>
          <div className="text-[11px] font-mono font-semibold tracking-[0.3em] text-white/70">REFORMAS</div>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}

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
      <Moldura>
        <form onSubmit={verificarCodigo} className="space-y-5">
          <div>
            <h2 className="font-slab text-2xl font-bold text-marinho">Verificação em duas etapas</h2>
            <p className="text-sm text-marinho/70 mt-2">Digite o código de 6 números do seu aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy…).</p>
          </div>
          {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={codigo} onChange={(e) => setCodigo(e.target.value)} required autoFocus className={`${CAMPO} text-center text-3xl tracking-[0.4em] font-mono`} />
          <button disabled={carregando} className="w-full bg-marinho hover:brightness-110 text-white rounded-lg py-3 text-base font-semibold shadow-sm transition disabled:opacity-50">{carregando ? 'Verificando…' : 'Confirmar'}</button>
        </form>
      </Moldura>
    );
  }

  return (
    <Moldura>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="font-slab text-3xl font-bold text-marinho">Bem-vindo de volta</h2>
          <p className="text-sm text-marinho/60 mt-1.5">Entre com seu e-mail e senha para acessar o painel.</p>
        </div>
        {erro && (
          <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">
            {erro}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-marinho/80 mb-1.5">E-mail</label>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="voce@empresa.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={CAMPO}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-marinho/80 mb-1.5">Senha</label>
          <SenhaInput
            required
            autoComplete="current-password"
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={CAMPO}
          />
        </div>
        <button
          disabled={carregando}
          className="w-full bg-marinho hover:brightness-110 text-white rounded-lg py-3 text-base font-semibold shadow-sm transition disabled:opacity-50"
        >
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="text-xs text-marinho/50 text-center">Problemas para entrar? Fale com o suporte da FixIn.</p>
      </form>
    </Moldura>
  );
}
