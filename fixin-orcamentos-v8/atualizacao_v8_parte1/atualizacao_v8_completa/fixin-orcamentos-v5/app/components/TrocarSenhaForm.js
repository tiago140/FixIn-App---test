'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SENHA_MIN } from '@/lib/senha';

export default function TrocarSenhaForm() {
  const supabase = createClient();
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setOk(false);
    if (nova.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    if (nova !== confirma) return setErro('As duas senhas não são iguais.');
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: nova });
    setSalvando(false);
    if (error) return setErro(error.message);
    setOk(true);
    setNova('');
    setConfirma('');
  }

  return (
    <form onSubmit={enviar} className="card p-5 space-y-4 max-w-md">
      <h2 className="font-semibold text-sm">Trocar minha senha</h2>
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      {ok && <div className="text-sm bg-sucesso/10 border border-sucesso text-sucesso px-3 py-2 rounded">Senha alterada. Use a nova senha no próximo login.</div>}
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Nova senha</label>
        <input type="password" value={nova} onChange={(e) => setNova(e.target.value)} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <div>
        <label className="block text-xs text-marinho/60 mb-1">Repita a nova senha</label>
        <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
      </div>
      <button disabled={salvando} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {salvando ? 'Salvando…' : 'Salvar nova senha'}
      </button>
    </form>
  );
}
