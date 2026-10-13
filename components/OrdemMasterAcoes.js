'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrdemMasterAcoes({ os, clientes = [] }) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [cliente, setCliente] = useState(os.cliente_id || '');

  async function agir(acao, confirmacao) {
    if (confirmacao && !window.confirm(confirmacao)) return;
    setErro(''); setOcupado(true);
    const res = await fetch(`/api/ordens/${os.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao, cliente_id: cliente || null }) });
    const data = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(data.error || 'Não foi possível concluir');
    if (acao === 'aplicar_orcamento' && data.orcamento_id) { router.push(`/master/orcamentos/${data.orcamento_id}`); return; }
    router.refresh();
  }

  const podeCancelar = !['paga', 'cancelada'].includes(os.status);
  return (
    <div className="space-y-3">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
      {os.status === 'orcada' && (
        <div className="card p-4 rounded-xl border-l-4 border-l-accent space-y-3">
          <p className="text-sm">O prestador enviou os valores. Ao aplicar, os itens entram no orçamento (como custo) e você define a margem lá.</p>
          {!os.orcamento_id && !os.cliente_id && (
            <select value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm">
              <option value="">Imobiliária do novo orçamento…</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
            </select>
          )}
          <div className="flex flex-wrap gap-2">
            <button disabled={ocupado} onClick={() => agir('aplicar_orcamento')} className="bg-verde text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {os.orcamento_id ? 'Aplicar valores ao orçamento' : 'Criar orçamento com estes valores'}
            </button>
            <button disabled={ocupado} onClick={() => agir('devolver', 'Devolver ao prestador para ajustar os valores?')} className="border border-linha rounded-lg px-4 py-2 text-sm">Devolver para ajuste</button>
          </div>
        </div>
      )}
      {podeCancelar && (
        <button disabled={ocupado} onClick={() => agir('cancelar', 'Cancelar esta ordem de serviço? O prestador será avisado.')} className="text-sm text-erro underline">Cancelar ordem</button>
      )}
    </div>
  );
}
