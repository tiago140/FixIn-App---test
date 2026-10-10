'use client';
import { useState } from 'react';

export default function FormRecuperar() {
  const [contato, setContato] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  async function enviar(e) {
    e.preventDefault(); setEnviando(true); setErro(''); setMsg('');
    const r = await fetch('/api/chamados/recuperar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contato, website: e.currentTarget.website.value }) });
    const j = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) setErro(j.error || 'Erro.'); else setMsg(j.mensagem);
  }
  return (
    <form onSubmit={enviar} className="bg-white border border-linha rounded-lg p-5 space-y-3">
      <label className="text-sm font-semibold text-marinho">E-mail ou telefone usados ao abrir o chamado</label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input value={contato} onChange={(e) => setContato(e.target.value)} required maxLength={200} className="w-full border border-linha rounded-md px-3 py-2 text-sm" />
      {erro && <p className="text-sm text-erro">{erro}</p>}
      {msg && <p className="text-sm text-sucesso font-semibold">{msg}</p>}
      <button disabled={enviando} className="w-full bg-marinho text-white font-semibold rounded-md px-4 py-2.5 disabled:opacity-50">{enviando ? 'Enviando…' : 'Enviar meu link por e-mail'}</button>
    </form>
  );
}
