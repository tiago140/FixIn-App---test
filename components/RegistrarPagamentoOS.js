'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

// Só o perfil de gestão: registra pagamento ao prestador com comprovante.
export default function RegistrarPagamentoOS({ osId, saldo }) {
  const router = useRouter();
  const arq = useRef(null);
  const [f, setF] = useState({ valor: saldo > 0 ? String(saldo.toFixed(2)).replace('.', ',') : '', data_pagamento: hoje(), forma: 'Pix', observacao: '' });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const set = (c) => (e) => setF((x) => ({ ...x, [c]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setOcupado(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    if (arq.current?.files?.[0]) fd.append('arquivo', arq.current.files[0]);
    const res = await fetch(`/api/ordens/${osId}/pagamentos`, { method: 'POST', body: fd });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível registrar');
    if (arq.current) arq.current.value = '';
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
      <div className="grid grid-cols-2 gap-2">
        <input required inputMode="decimal" value={f.valor} onChange={set('valor')} placeholder="Valor (R$)" className={ent} />
        <input required type="date" value={f.data_pagamento} onChange={set('data_pagamento')} className={ent} />
        <select value={f.forma} onChange={set('forma')} className={ent}><option>Pix</option><option>Transferência</option><option>Dinheiro</option><option>Outro</option></select>
        <input ref={arq} type="file" accept="application/pdf,image/jpeg,image/png" className={`${ent} text-xs`} />
      </div>
      <input value={f.observacao} onChange={set('observacao')} placeholder="Observação (opcional)" className={ent} />
      <button disabled={ocupado} className="bg-marinho text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">{ocupado ? 'Registrando…' : 'Registrar pagamento'}</button>
    </form>
  );
}
