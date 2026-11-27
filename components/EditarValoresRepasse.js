'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtBRL } from '@/lib/format';

const num = (v) => { const x = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return Number.isFinite(x) && x >= 0 ? x : 0; };
const ini = (v) => String(Number(v) || 0).replace('.', ',');

// A FixIn ajusta o valor que repassa ao prestador (mão de obra e material por serviço) vendo o que recebe do cliente.
export default function EditarValoresRepasse({ osId, itens, recebido, varias }) {
  const router = useRouter();
  const [linhas, setLinhas] = useState(itens.map((i) => ({ id: i.id, ambiente: i.ambiente, servico: i.servico, descricao: i.descricao, mo: ini(i.mo), ma: ini(i.ma) })));
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k, campo) => (e) => setLinhas((l) => l.map((x, n) => (n === k ? { ...x, [campo]: e.target.value } : x)));
  const totMO = linhas.reduce((s, i) => s + num(i.mo), 0);
  const totMA = linhas.reduce((s, i) => s + num(i.ma), 0);
  const repasse = totMO + totMA;
  const fica = recebido != null ? recebido - repasse : null;
  const pct = recebido > 0 && fica != null ? (fica / recebido) * 100 : null;
  const mudou = linhas.some((l, k) => num(l.mo) !== Number(itens[k].mo || 0) || num(l.ma) !== Number(itens[k].ma || 0));

  async function salvar() {
    setOcupado(true); setMsg('');
    try {
      const r = await fetch(`/api/ordens/${osId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'editar_valores', itens: linhas.map((l) => ({ id: l.id, mo: num(l.mo), ma: num(l.ma) })) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || 'Não foi possível salvar.'); else { setMsg('Valores salvos. O prestador foi avisado.'); router.refresh(); }
    } catch (e) { setMsg('Sem conexão. Tente de novo.'); }
    setOcupado(false);
  }

  const ent = 'w-28 border border-linha rounded-lg px-2 py-1.5 text-right font-mono text-sm';
  return (
    <div className="card rounded-xl overflow-x-auto">
      <div className="px-5 py-3 border-b border-linha font-semibold">Valores a repassar ao prestador <span className="text-xs font-normal text-marinho/50">· você pode editar</span></div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wide text-marinho/50 border-b border-linha">
          <th className="px-5 py-2">Ambiente</th><th className="px-3 py-2">Serviço</th><th className="px-3 py-2 text-right">Mão de obra (MO)</th><th className="px-3 py-2 text-right">Material (MA)</th><th className="px-5 py-2 text-right">Subtotal</th>
        </tr></thead>
        <tbody>
          {linhas.map((i, k) => (
            <tr key={i.id} className="border-b border-linha last:border-0">
              <td className="px-5 py-2">{i.ambiente || '—'}</td>
              <td className="px-3 py-2"><b>{i.servico}</b></td>
              <td className="px-3 py-2 text-right"><input inputMode="decimal" value={i.mo} onChange={set(k, 'mo')} className={ent} /></td>
              <td className="px-3 py-2 text-right"><input inputMode="decimal" value={i.ma} onChange={set(k, 'ma')} className={ent} /></td>
              <td className="px-5 py-2 text-right font-mono font-semibold">{fmtBRL(num(i.mo) + num(i.ma))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-5 border-t border-linha space-y-1.5 text-sm bg-papel">
        <div className="flex justify-between"><span className="text-marinho/60">Total de mão de obra</span><span className="font-mono font-semibold">{fmtBRL(totMO)}</span></div>
        <div className="flex justify-between"><span className="text-marinho/60">Total de material</span><span className="font-mono font-semibold">{fmtBRL(totMA)}</span></div>
        <div className="flex justify-between text-base"><span className="font-semibold">Você repassa ao prestador</span><span className="font-mono font-bold">{fmtBRL(repasse)}</span></div>
        {recebido != null && (<>
          <div className="flex justify-between border-t border-linha pt-2"><span className="text-marinho/60">Você recebe do cliente{varias ? ' (orçamento inteiro, com todas as ordens)' : ''}</span><span className="font-mono font-semibold">{fmtBRL(recebido)}</span></div>
          <div className={`flex justify-between text-base ${fica < 0 ? 'text-erro' : 'text-sucesso'}`}><span className="font-semibold">{fica < 0 ? 'Prejuízo' : 'Fica com a FixIn'}</span><span className="font-mono font-bold">{fmtBRL(fica)}{pct != null && !varias ? ` (${pct.toFixed(1).replace('.', ',')}%)` : ''}</span></div>
        </>)}
        <div className="flex items-center gap-3 pt-2">
          <button disabled={ocupado || !mudou} onClick={salvar} className="bg-verde text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{ocupado ? 'Salvando…' : 'Salvar valores'}</button>
          {msg && <span className="text-sm text-marinho/70">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
