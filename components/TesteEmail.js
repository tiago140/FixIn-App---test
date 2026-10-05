'use client';

import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';

// Mostra se o envio de e-mails está configurado e deixa mandar um e-mail de teste para o próprio dono.
export default function TesteEmail({ configuracao }) {
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState(null);

  async function testar() {
    setEnviando(true);
    setRes(null);
    try {
      const r = await fetch('/api/email/teste', { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      setRes(r.ok ? d : { enviado: false, motivo: d.error || `Erro ${r.status}` });
    } catch (e) {
      setRes({ enviado: false, motivo: 'Sem conexão com o servidor.' });
    }
    setEnviando(false);
  }

  return (
    <div className="card p-5 mt-6 max-w-2xl">
      <h3 className="font-semibold text-lg text-marinho flex items-center gap-2"><Mail size={18} /> Envio de e-mails do sistema</h3>
      <p className={`text-sm mt-2 ${configuracao.ok ? 'text-sucesso' : 'text-erro'}`}>{configuracao.descricao}</p>
      <button type="button" onClick={testar} disabled={enviando || !configuracao.ok} className="mt-3 inline-flex items-center gap-2 bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50">
        {enviando ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : 'Enviar e-mail de teste para mim'}
      </button>
      {res && (
        <div role="status" className={`mt-3 text-sm border rounded-lg px-4 py-3 ${res.enviado ? 'bg-sucesso/10 border-sucesso text-sucesso' : 'bg-erro/10 border-erro text-erro'}`}>
          {res.enviado ? `Enviado para ${res.para.join(', ')}. Confira a caixa de entrada (e o spam).` : `Não foi possível enviar: ${res.motivo}`}
        </div>
      )}
    </div>
  );
}
