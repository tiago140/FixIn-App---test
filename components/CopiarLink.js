'use client';

import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';

// Copia o link do locador ou abre o WhatsApp com a mensagem pronta (a imobiliária escolhe o contato no próprio WhatsApp).
export default function CopiarLink({ link, mensagem }) {
  const [ok, setOk] = useState(false);
  async function copiar() { try { await navigator.clipboard.writeText(link); setOk(true); setTimeout(() => setOk(false), 2000); } catch (e) {} }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <input readOnly value={link} onFocus={(e) => e.target.select()} className="flex-1 min-w-[220px] border border-linha rounded-lg px-3 py-2 bg-papel font-mono text-xs" />
      <button type="button" onClick={copiar} className="border border-linha rounded-lg px-3 text-sm inline-flex items-center gap-1"><Copy size={14} />{ok ? 'Copiado' : 'Copiar'}</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer" className="bg-verde text-white rounded-lg px-3 py-2 text-sm font-semibold inline-flex items-center gap-1"><MessageCircle size={14} /> WhatsApp</a>
    </div>
  );
}
