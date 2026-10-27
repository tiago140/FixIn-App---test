'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X, Search } from 'lucide-react';
import { hojeSP, somarDias } from '@/lib/lancamentos';

// Ações da FixIn sobre um pedido: equipe marca "em análise"; o dono aprova (gera a conta a pagar) ou recusa.
export default function EstornoAcoes({ e, dono }) {
  const router = useRouter();
  const [modo, setModo] = useState(null); // 'aprovar' | 'recusar'
  const [venc, setVenc] = useState(somarDias(hojeSP(), 3));
  const [resposta, setResposta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const aberto = e.status === 'solicitado' || e.status === 'em_analise';

  async function enviar(body) {
    setCarregando(true); setErro('');
    try {
      const res = await fetch(`/api/estornos/${e.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErro(d.error || 'Não foi possível salvar.'); return; }
      setModo(null); router.refresh();
    } finally { setCarregando(false); }
  }
  const btn = 'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50';

  if (e.status === 'aprovado' && dono) return <div className="mt-3 text-sm text-marinho/70">Aprovado: a conta a pagar está no <Link href="/master/financeiro" className="font-semibold underline">Financeiro</Link>. Quando você marcar como paga lá, este pedido vira “Pago”.</div>;
  if (!aberto) return null;
  return (
    <div className="mt-3">
      {modo === 'aprovar' && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg bg-papel p-3">
          <label className="text-sm text-marinho/70">Pagar até
            <input type="date" value={venc} onChange={(ev) => setVenc(ev.target.value)} className="mt-1 block rounded-lg border border-linha bg-white px-3 py-2 text-base" />
          </label>
          <label className="min-w-[200px] flex-1 text-sm text-marinho/70">Recado para a imobiliária (opcional)
            <input value={resposta} onChange={(ev) => setResposta(ev.target.value)} className="mt-1 block w-full rounded-lg border border-linha bg-white px-3 py-2 text-base" />
          </label>
          <button type="button" disabled={carregando || !venc} onClick={() => enviar({ acao: 'aprovar', vencimento: venc, resposta })} className={`${btn} bg-verde text-white`}>Confirmar e criar conta a pagar</button>
          <button type="button" onClick={() => setModo(null)} className={`${btn} border border-linha bg-white text-marinho`}>Voltar</button>
        </div>
      )}
      {modo === 'recusar' && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg bg-papel p-3">
          <label className="min-w-[240px] flex-1 text-sm text-marinho/70">Por que está recusando? (a imobiliária vê)
            <input value={resposta} onChange={(ev) => setResposta(ev.target.value)} className="mt-1 block w-full rounded-lg border border-linha bg-white px-3 py-2 text-base" />
          </label>
          <button type="button" disabled={carregando || !resposta.trim()} onClick={() => enviar({ acao: 'recusar', resposta })} className={`${btn} bg-erro text-white`}>Confirmar recusa</button>
          <button type="button" onClick={() => setModo(null)} className={`${btn} border border-linha bg-white text-marinho`}>Voltar</button>
        </div>
      )}
      {!modo && (
        <div className="flex flex-wrap gap-2">
          {e.status === 'solicitado' && <button type="button" disabled={carregando} onClick={() => enviar({ acao: 'em_analise' })} className={`${btn} border border-linha bg-white text-marinho`}><Search size={16} />Marcar em análise</button>}
          {dono ? (
            <>
              <button type="button" disabled={carregando} onClick={() => { setResposta(''); setModo('aprovar'); }} className={`${btn} bg-verde text-white`}><Check size={16} />Aprovar e gerar conta a pagar</button>
              <button type="button" disabled={carregando} onClick={() => { setResposta(''); setModo('recusar'); }} className={`${btn} border border-erro/30 bg-white text-erro`}><X size={16} />Recusar</button>
            </>
          ) : <span className="self-center text-sm text-marinho/60">Quem aprova ou recusa é o dono.</span>}
        </div>
      )}
      {erro && <div className="mt-2 text-sm font-semibold text-erro">{erro}</div>}
    </div>
  );
}
