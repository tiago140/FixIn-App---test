'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Verificação em duas etapas (aplicativo autenticador). Recomendado a todos, principalmente ao dono.
export default function MfaConta() {
  const supabase = createClient();
  const [fator, setFator] = useState(null); // fator verificado
  const [novo, setNovo] = useState(null); // { id, qr, secret }
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFator((data?.totp || []).find((f) => f.status === 'verified') || null);
  }
  useEffect(() => { carregar(); }, []);

  async function ativar() {
    setErro(''); setOcupado(true);
    // limpa tentativas antigas não concluídas
    const { data: lista } = await supabase.auth.mfa.listFactors();
    for (const f of (lista?.all || []).filter((x) => x.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `FixIn ${new Date().toLocaleDateString('pt-BR')}` });
    setOcupado(false);
    if (error) return setErro('Não foi possível iniciar: ' + error.message);
    setNovo({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function confirmar(e) {
    e.preventDefault(); setErro(''); setOcupado(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: novo.id, code: codigo.replace(/\s/g, '') });
    setOcupado(false);
    if (error) return setErro('Código incorreto. Confira o aplicativo e tente de novo.');
    setNovo(null); setCodigo(''); carregar();
  }
  async function desativar() {
    if (!confirm('Desativar a verificação em duas etapas?')) return;
    setOcupado(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: fator.id });
    setOcupado(false);
    if (error) return setErro('Não foi possível desativar: ' + error.message);
    carregar();
  }

  return (
    <div className="card p-5 space-y-3 max-w-md mt-6">
      <h2 className="font-semibold text-sm">Verificação em duas etapas</h2>
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      {fator && !novo && (
        <>
          <p className="text-sm text-sucesso font-semibold">✔ Ativada. No login, além da senha, será pedido o código do aplicativo.</p>
          <button disabled={ocupado} onClick={desativar} className="text-sm border border-linha rounded px-3 py-1.5">Desativar</button>
        </>
      )}
      {!fator && !novo && (
        <>
          <p className="text-sm text-marinho/70">Protege a sua conta mesmo que alguém descubra a senha. Você precisa de um aplicativo autenticador no celular.</p>
          <button disabled={ocupado} onClick={ativar} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold">Ativar</button>
        </>
      )}
      {novo && (
        <form onSubmit={confirmar} className="space-y-3">
          <p className="text-sm">1. No aplicativo autenticador, escaneie o QR Code:</p>
          <img src={novo.qr} alt="QR Code" className="w-40 h-40 border border-linha" />
          <p className="text-xs text-marinho/60 break-all">Ou digite a chave: <span className="font-mono">{novo.secret}</span></p>
          <p className="text-sm">2. Digite o código de 6 números que aparece:</p>
          <input inputMode="numeric" maxLength={7} value={codigo} onChange={(e) => setCodigo(e.target.value)} required className="w-full border border-linha rounded px-3 py-2 bg-papel font-mono tracking-widest" />
          <button disabled={ocupado} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold">Confirmar e ativar</button>
        </form>
      )}
    </div>
  );
}
