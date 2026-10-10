'use client';
import { useRef, useState } from 'react';

// Caixa de texto + anexo. "url" é para onde enviar (externo ou interno).
export default function EnviarMensagem({ url, onEnviado }) {
  const [texto, setTexto] = useState('');
  const [arquivos, setArquivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const inp = useRef(null);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim() && arquivos.length === 0) return;
    setEnviando(true); setErro('');
    const fd = new FormData();
    fd.append('texto', texto);
    arquivos.forEach((f) => fd.append('arquivos', f));
    try {
      const r = await fetch(url, { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não foi possível enviar.');
      setTexto(''); setArquivos([]); if (inp.current) inp.current.value = '';
      onEnviado?.();
    } catch (err) { setErro(err.message); }
    setEnviando(false);
  }

  return (
    <form onSubmit={enviar} className="mt-3 space-y-2">
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={3000} placeholder="Escreva uma mensagem…" className="w-full border border-linha rounded-md px-3 py-2 text-sm" />
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm border border-linha rounded-md px-3 py-1.5 cursor-pointer hover:bg-fundo">
          📷 Anexar foto/PDF
          <input ref={inp} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => setArquivos(Array.from(e.target.files || []))} />
        </label>
        {arquivos.length > 0 && <span className="text-xs text-marinho/60">{arquivos.length} arquivo(s)</span>}
        <button disabled={enviando} className="ml-auto bg-marinho text-white text-sm font-semibold rounded-md px-4 py-1.5 disabled:opacity-50">{enviando ? 'Enviando…' : 'Enviar'}</button>
      </div>
      {erro && <p className="text-sm text-erro">{erro}</p>}
    </form>
  );
}
