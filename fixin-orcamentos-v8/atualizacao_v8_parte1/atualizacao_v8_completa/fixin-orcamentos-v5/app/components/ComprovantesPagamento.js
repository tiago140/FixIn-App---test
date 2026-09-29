'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtBRL, fmtDataHora, PAGAMENTO_CLIENTE_LABEL } from '@/lib/format';

const CLASSE_STATUS = {
  aguardando: 'bg-alerta/15 text-alerta',
  entrada_paga: 'bg-info/15 text-info',
  pago_total: 'bg-sucesso/15 text-sucesso',
};

export default function ComprovantesPagamento({ orcamentoId, comprovantes, role, total, valorPago, pagamentoClienteStatus }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(null);
  const [erro, setErro] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [valor, setValor] = useState(Math.round(total / 2));

  async function enviar(e) {
    e.preventDefault();
    const file = e.target.arquivo.files?.[0];
    if (!file) { setErro('Selecione o PDF do comprovante.'); return; }
    setErro('');
    setEnviando(true);
    const fd = new FormData();
    fd.append('arquivo', file);
    fd.append('tipo_pagamento', tipo);
    fd.append('valor', valor);
    const res = await fetch(`/api/orcamentos/${orcamentoId}/comprovantes`, { method: 'POST', body: fd });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d.error || 'Não foi possível enviar.');
      return;
    }
    e.target.reset();
    router.refresh();
  }

  async function verificar(comp) {
    setVerificando(comp.id);
    setErro('');
    const res = await fetch(`/api/orcamentos/${orcamentoId}/comprovantes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comprovante_id: comp.id,
        valor_pago: comp.valor,
        pagamento_cliente_status: comp.tipo_pagamento === 'integral' ? 'pago_total' : 'entrada_paga',
      }),
    });
    setVerificando(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d.error || 'Não foi possível confirmar.');
      return;
    }
    router.refresh();
  }

  const pendente = Math.max(0, (total || 0) - (valorPago || 0));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Pagamento do cliente</h3>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${CLASSE_STATUS[pagamentoClienteStatus] || CLASSE_STATUS.aguardando}`}>
          {PAGAMENTO_CLIENTE_LABEL[pagamentoClienteStatus] || PAGAMENTO_CLIENTE_LABEL.aguardando}
        </span>
      </div>
      <div className="text-xs text-marinho/60 mb-3">
        Total {fmtBRL(total)} · Pago {fmtBRL(valorPago || 0)} · <span className={pendente > 0 ? 'text-erro font-semibold' : ''}>Faltando {fmtBRL(pendente)}</span>
      </div>

      {erro && <div className="text-xs bg-erro/10 border border-erro text-erro px-3 py-2 rounded mb-3">{erro}</div>}

      {comprovantes.length === 0 ? (
        <div className="text-xs text-marinho/50 mb-3">Nenhum comprovante enviado ainda.</div>
      ) : (
        <div className="mb-3 space-y-2">
          {comprovantes.map((c) => (
            <div key={c.id} className="flex items-center justify-between border border-linha rounded px-3 py-2">
              <div>
                <a href={c.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-marinho underline">
                  Comprovante — {c.tipo_pagamento === 'integral' ? 'Pago integral' : 'Entrada 50%'}
                </a>
                <div className="text-xs text-marinho/50">{fmtBRL(c.valor)} · enviado em {fmtDataHora(c.criado_em)}</div>
              </div>
              {c.verificado ? (
                <span className="text-xs text-sucesso font-semibold">✓ Verificado</span>
              ) : role === 'master' ? (
                <button
                  onClick={() => verificar(c)}
                  disabled={verificando === c.id}
                  className="bg-verde text-white text-xs font-semibold rounded px-3 py-1.5 disabled:opacity-50"
                >
                  {verificando === c.id ? 'Confirmando…' : 'Aprovado — confirmar'}
                </button>
              ) : (
                <span className="text-xs text-alerta font-semibold">Aguardando o dono conferir</span>
              )}
            </div>
          ))}
        </div>
      )}

      {role === 'imobiliaria' && (
        <form onSubmit={enviar} className="border-t border-linha pt-3 space-y-2">
          <div className="text-xs font-semibold">Anexar comprovante (PDF)</div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-[11px] text-marinho/60 mb-1">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="border border-linha rounded px-2 py-1.5 bg-papel text-sm">
                <option value="entrada">Entrada 50%</option>
                <option value="integral">Pago integral</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-marinho/60 mb-1">Valor pago (R$)</label>
              <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="border border-linha rounded px-2 py-1.5 bg-papel text-sm w-32" />
            </div>
            <div>
              <label className="block text-[11px] text-marinho/60 mb-1">Arquivo (PDF)</label>
              <input type="file" name="arquivo" accept="application/pdf" className="text-sm" />
            </div>
            <button disabled={enviando} className="bg-marinho text-white text-xs font-semibold rounded px-3 py-1.5 disabled:opacity-50">
              {enviando ? 'Enviando…' : 'Enviar comprovante'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
