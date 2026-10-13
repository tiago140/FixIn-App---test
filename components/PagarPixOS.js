'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ent = 'border border-linha rounded-lg px-3 py-2 bg-papel text-sm';

// Gestão: paga o prestador por Pix pelo Asaas (só precisa da chave Pix cadastrada).
export default function PagarPixOS({ osId, saldo, chaveMasc, ativo, motivo, temProcessando }) {
  const router = useRouter();
  const [valor, setValor] = useState(saldo > 0 ? saldo.toFixed(2).replace('.', ',') : '');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function chamar(corpo) {
    setErro(''); setOcupado(true);
    const res = await fetch(`/api/ordens/${osId}/pix`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível concluir');
    router.refresh();
  }
  function pagar(e) {
    e.preventDefault();
    const v = Number(String(valor).replace(',', '.'));
    if (!(v > 0)) return setErro('Informe um valor válido.');
    if (!window.confirm(`Enviar Pix de R$ ${v.toFixed(2).replace('.', ',')} para a chave ${chaveMasc}? Não dá para desfazer.`)) return;
    chamar({ acao: 'pagar', valor: v });
  }

  return (
    <div className="border border-linha rounded-lg p-3 space-y-2 bg-papel/50">
      <div className="text-sm font-semibold">Pagar por Pix (Asaas)</div>
      {!chaveMasc ? <p className="text-xs text-marinho/60">O prestador ainda não cadastrou a chave Pix.</p>
        : !ativo ? <p className="text-xs text-marinho/60">{motivo}</p>
        : (
          <form onSubmit={pagar} className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-marinho/60">Chave: <b className="font-mono">{chaveMasc}</b></span>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={`${ent} w-32`} />
            <button disabled={ocupado || saldo <= 0} className="bg-marinho text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50">{ocupado ? 'Enviando…' : 'Enviar Pix'}</button>
          </form>
        )}
      {temProcessando && <button type="button" disabled={ocupado} onClick={() => chamar({ acao: 'atualizar' })} className="text-xs underline">Atualizar situação do Pix</button>}
      {erro && <div className="text-sm text-erro">{erro}</div>}
    </div>
  );
}
