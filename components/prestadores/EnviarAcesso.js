'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnviarAcesso({ id, rotulo = 'Enviar acesso por e-mail' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function enviar() {
    if (!confirm('Enviar o e-mail de acesso? Se o prestador já tem login, será gerada uma nova senha provisória.')) return;
    setBusy(true);
    const r = await fetch(`/api/prestadores/${id}/acesso`, { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return alert(j.error || 'Falhou.');
    if (j.acesso === 'enviado') alert('E-mail enviado ao prestador.');
    else alert((j.aviso || 'Não foi possível enviar.') + (j.senha ? `\n\nSenha provisória: ${j.senha}` : ''));
    router.refresh();
  }
  return <button type="button" disabled={busy} onClick={enviar} className="rounded-full border border-linha px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? 'Enviando…' : rotulo}</button>;
}
