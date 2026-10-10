'use client';
import { useState } from 'react';

export default function FormRecuperar() {
  const [contato, setContato] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  async function enviar(e) {
    e.preventDefault(); setEnviando(true); setErro(''); setMsg('');
    const r = await fetch('/api/chamados/recuperar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contato, codigo, website: e.currentTarget.website.value }) });
    const j = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) setErro(j.error || 'Erro.'); else if (j.link) window.location.href = new URL(j.link).pathname; else setMsg(j.mensagem);
  }
  return (
    <form onSubmit={enviar} className="bg-white border border-linha rounded-lg p-5 space-y-3">
      <label className="text-sm font-semibold text-marinho">E-mail ou telefone usados ao abrir o chamado</label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input value={contato} onChange={(e) => setContato(e.target.value)} required maxLength={200} className="w-full border border-linha rounded-md px-3 py-2 text-sm" />
      <label className="text-sm font-semibold text-marinho">Código de acesso (6 caracteres)</label>
      <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={7} placeholder="Ex.: K7M-3QX" className="w-full border border-linha rounded-md px-3 py-2 text-sm font-mono tracking-widest" />
      <p className="text-xs text-marinho/60">Com o código, o chamado abre na hora. Sem o código, enviamos o link para o e-mail cadastrado.</p>
      {erro && <p className="text-sm text-erro">{erro}</p>}
      {msg && <p className="text-sm text-sucesso font-semibold">{msg}</p>}
      <button disabled={enviando} className="w-full bg-marinho text-white font-semibold rounded-md px-4 py-2.5 disabled:opacity-50">{enviando ? 'Aguarde…' : codigo ? 'Abrir meu chamado' : 'Enviar meu link por e-mail'}</button>
    </form>
  );
}
