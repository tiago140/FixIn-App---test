'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// O cliente escolhe em quantas partes pagar (ex.: parte no Pix, parte no cartão, ou dois cartões).
export default function DividirPagamento({ token, total, max = 4, min = 100, dividido }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [n, setN] = useState(2);
  const [vals, setVals] = useState(['', '']);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const cents = (v) => Math.round(Number(String(v).replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const soma = vals.slice(0, n).reduce((t, v) => t + cents(v), 0);
  const falta = Math.round(total * 100) - soma;

  function igual(k) {
    const base = Math.floor(Math.round(total * 100) / k); const arr = Array(k).fill(base); arr[0] += Math.round(total * 100) - base * k;
    setN(k); setVals(arr.map((c) => (c / 100).toFixed(2).replace('.', ',')));
  }
  async function enviar(valores) {
    setBusy(true); setErro('');
    try {
      const r = await fetch(`/api/pagar/${token}/dividir`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valores }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j.error || 'Não foi possível dividir.'); return; }
      setAberto(false); router.refresh();
    } finally { setBusy(false); }
  }
  if (!aberto) return (
    <div className="text-center space-y-2">
      <button type="button" onClick={() => { setAberto(true); igual(2); }} className="text-sm text-marinho underline">Quer dividir o pagamento? (Pix + cartão ou mais de um cartão)</button>
      {dividido && <div><button type="button" disabled={busy} onClick={() => enviar([total.toFixed(2)])} className="text-xs text-marinho/60 underline">Voltar a pagar tudo de uma vez</button></div>}
    </div>
  );
  return (
    <section className="border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold text-marinho">Dividir o pagamento de {brl(total)}</h2>
      <div className="flex gap-2 text-sm">
        {Array.from({ length: max - 1 }, (_, i) => i + 2).map((k) => (
          <button key={k} type="button" onClick={() => igual(k)} className={`rounded-full px-3 py-1 border ${n === k ? 'bg-marinho text-white border-marinho' : 'border-linha'}`}>{k} partes</button>
        ))}
      </div>
      {vals.slice(0, n).map((v, i) => (
        <div key={i} className="flex items-center gap-2 text-sm"><span className="w-16">Parte {i + 1}</span>
          <input className="flex-1 rounded-lg border px-3 py-2" inputMode="decimal" value={v} onChange={(e) => setVals(vals.map((x, j) => (j === i ? e.target.value : x)))} /></div>
      ))}
      <p className={`text-xs ${falta === 0 ? 'text-emerald-700' : 'text-red-700'}`}>{falta === 0 ? 'Soma certa.' : falta > 0 ? `Faltam ${brl(falta / 100)} para completar.` : `Passou ${brl(-falta / 100)}.`} Cada parte precisa ter pelo menos {brl(min)}.</p>
      <p className="text-xs text-marinho/60">Cada parte tem o próprio link. Em cada uma você escolhe Pix ou cartão.</p>
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || falta !== 0} onClick={() => enviar(vals.slice(0, n))} className="flex-1 rounded-lg bg-marinho text-white py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Criando…' : 'Criar links das partes'}</button>
        <button type="button" onClick={() => setAberto(false)} className="rounded-lg border px-4 text-sm">Cancelar</button>
      </div>
    </section>
  );
}
