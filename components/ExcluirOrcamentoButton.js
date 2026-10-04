'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtBRL } from '@/lib/format';

// Exclusão em dois passos. Se o orçamento já foi aprovado/executado ou tem pagamento registrado,
// o dono precisa digitar o número do orçamento — evita apagar um registro financeiro por engano.
export default function ExcluirOrcamentoButton({ orcamentoId, numero, endereco, status, statusLabel, valorPago }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');

  const pago = Number(valorPago) || 0;
  const sensivel = pago > 0 || ['aprovado', 'em_execucao', 'finalizado'].includes(status);
  const podeConfirmar = !sensivel || digitado.trim().toUpperCase() === String(numero).toUpperCase();

  async function excluir() {
    setErro('');
    setExcluindo(true);
    const res = await fetch(`/api/orcamentos/${orcamentoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmacao: digitado }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(d.error || 'Não foi possível excluir.');
      setExcluindo(false);
      return;
    }
    router.push('/master/orcamentos');
    router.refresh();
  }

  return (
    <div className="card p-5 border-erro/40">
      <h3 className="font-semibold text-sm text-erro mb-1">Zona de perigo</h3>

      {!aberto ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-marinho/60">Excluir este orçamento de forma definitiva.</div>
          <button type="button" onClick={() => setAberto(true)} className="border border-erro text-erro text-sm font-semibold rounded px-3 py-1.5 hover:bg-erro/10">
            Excluir orçamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm">
            Excluir <b>{numero}</b> — {endereco}?
            <div className="text-xs text-marinho/60 mt-1">
              Também apaga os itens, o PDF, as notas fiscais, os comprovantes e o chat deste orçamento. <b>Não dá para desfazer.</b> Fica um registro na Auditoria.
            </div>
          </div>

          {sensivel && (
            <div className="bg-erro/10 border border-erro text-erro text-xs rounded px-3 py-2">
              Este orçamento está <b>{statusLabel}</b>
              {pago > 0 && <> e tem <b>{fmtBRL(pago)}</b> de pagamento registrado</>}. Para confirmar, digite o número <b>{numero}</b> abaixo.
              <input
                value={digitado}
                onChange={(e) => setDigitado(e.target.value)}
                placeholder={numero}
                aria-label="Digite o número do orçamento para confirmar"
                className="mt-2 block w-full max-w-xs border border-erro/50 rounded px-2 py-1.5 bg-white text-marinho text-sm"
              />
            </div>
          )}

          {erro && <div className="text-xs bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}

          <div className="flex gap-2 justify-end">
            <button type="button" disabled={excluindo} onClick={() => { setAberto(false); setDigitado(''); setErro(''); }} className="border border-linha text-sm px-3 py-1.5 rounded">
              Cancelar
            </button>
            <button type="button" disabled={excluindo || !podeConfirmar} onClick={excluir} className="bg-erro text-white text-sm font-semibold px-3 py-1.5 rounded disabled:opacity-40">
              {excluindo ? 'Excluindo…' : 'Sim, excluir definitivamente'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
