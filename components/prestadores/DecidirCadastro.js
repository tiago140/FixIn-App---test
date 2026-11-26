'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DecidirCadastro({ id }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  async function agir(acao) {
    if (acao === 'recusar' && !confirm('Recusar este cadastro?')) return;
    setBusy(true); setErro('');
    const r = await fetch(`/api/prestadores/cadastros/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErro(j.error || 'Falhou.');
    if (acao === 'aprovar') {
      if (j.acesso === 'enviado') alert('Aprovado. O prestador recebeu o acesso por e-mail.');
      else alert((j.aviso || 'Aprovado.') + (j.senha ? `\n\nPasse ao prestador: e-mail do cadastro e senha provisória ${j.senha}` : ''));
    }
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={busy} onClick={() => agir('aprovar')} className="rounded-full bg-marinho text-white px-5 py-2 text-sm font-semibold disabled:opacity-50">Aprovar e enviar acesso</button>
      <button disabled={busy} onClick={() => agir('recusar')} className="rounded-full border border-linha px-5 py-2 text-sm font-medium disabled:opacity-50">Recusar</button>
      {erro && <span className="text-sm text-erro">{erro}</span>}
    </div>
  );
}
