'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtBRL, calcularTotalItens, calcularTotalComMargem, STATUS_LABEL } from '@/lib/format';

export default function GestaoOrcamentoForm({ orcamento, itensIniciais, prestadores, clientes }) {
  const router = useRouter();
  const [status, setStatus] = useState(orcamento.status);
  const [clienteId, setClienteId] = useState(orcamento.cliente_id);
  const [confirmandoCliente, setConfirmandoCliente] = useState(null);
  const [margem, setMargem] = useState(orcamento.margem_percentual);
  const [valorPago, setValorPago] = useState(orcamento.valor_pago || 0);
  const [garantia, setGarantia] = useState(orcamento.garantia || '');
  const [prestadorId, setPrestadorId] = useState(orcamento.prestador_id || '');
  const [valorCombinado, setValorCombinado] = useState(orcamento.valor_combinado_prestador || 0);
  const [valorEntrada, setValorEntrada] = useState(orcamento.valor_entrada_prestador || 0);
  const [statusPagamentoPrestador, setStatusPagamentoPrestador] = useState(orcamento.pagamento_prestador_status || 'aguardando');
  const [atrasado, setAtrasado] = useState(!!orcamento.atrasado);
  const [itens, setItens] = useState(itensIniciais.map((it) => ({ ...it })));
  const [salvando, setSalvando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const totalBase = calcularTotalItens(itens);
  const totalFinal = calcularTotalComMargem(itens, margem);
  const mostrarPagamentoPrestador = prestadorId && ['aprovado', 'em_execucao', 'finalizado'].includes(status);

  function atualizarItem(id, campo, valor) {
    setItens((lista) => lista.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)));
  }
  function removerItem(id) {
    setItens((lista) => lista.filter((it) => it.id !== id));
  }
  function adicionarItem() {
    setItens((lista) => [...lista, { id: 'novo-' + Date.now(), ambiente: '', servico: '', descricao: '', mo: 0, ma: 0 }]);
  }

  async function salvar() {
    setErro('');
    setAviso('');
    setSalvando(true);
    const res = await fetch(`/api/orcamentos/${orcamento.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        margem_percentual: Number(margem) || 0,
        valor_pago: Number(valorPago) || 0,
        garantia,
        prestador_id: prestadorId || null,
        valor_combinado_prestador: Number(valorCombinado) || 0,
        valor_entrada_prestador: Number(valorEntrada) || 0,
        pagamento_prestador_status: statusPagamentoPrestador,
        atrasado,
        itens: itens.map(({ id, ...resto }) => ({ ...resto, id: String(id).startsWith('novo-') ? undefined : id })),
      }),
    });
    setSalvando(false);
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error || 'Erro ao salvar');
      return;
    }
    setAviso('Salvo.');
    router.refresh();
  }

  async function gerarPdf() {
    setGerandoPdf(true);
    setErro('');
    const res = await fetch(`/api/orcamentos/${orcamento.id}/pdf`, { method: 'POST' });
    setGerandoPdf(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error || 'Erro ao gerar PDF');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      {aviso && <div className="text-sm bg-sucesso/10 border border-sucesso text-sucesso px-3 py-2 rounded">{aviso}</div>}

      <div className="card p-5">
        <h3 className="font-semibold text-sm mb-3">Itens</h3>
        <div className="space-y-3">
          {itens.map((it) => (
            <div key={it.id} className="border border-linha rounded p-3 grid sm:grid-cols-12 gap-2 items-start text-sm">
              <input className="sm:col-span-2 border border-linha rounded px-2 py-1 bg-papel" value={it.ambiente} onChange={(e) => atualizarItem(it.id, 'ambiente', e.target.value)} placeholder="Ambiente" />
              <input className="sm:col-span-2 border border-linha rounded px-2 py-1 bg-papel" value={it.servico} onChange={(e) => atualizarItem(it.id, 'servico', e.target.value)} placeholder="Serviço" />
              <textarea className="sm:col-span-4 border border-linha rounded px-2 py-1 bg-papel" rows={1} value={it.descricao || ''} onChange={(e) => atualizarItem(it.id, 'descricao', e.target.value)} placeholder="Descrição" />
              <input type="number" step="0.01" className="sm:col-span-1 border border-linha rounded px-2 py-1 bg-papel" value={it.mo} onChange={(e) => atualizarItem(it.id, 'mo', e.target.value)} placeholder="MO" />
              <input type="number" step="0.01" className="sm:col-span-1 border border-linha rounded px-2 py-1 bg-papel" value={it.ma} onChange={(e) => atualizarItem(it.id, 'ma', e.target.value)} placeholder="MA" />
              <button type="button" onClick={() => removerItem(it.id)} className="sm:col-span-2 text-erro text-xs text-right">remover</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={adicionarItem} className="mt-3 border border-marinho text-marinho rounded px-3 py-1.5 text-sm">
          + Item
        </button>
      </div>

      <div className="card p-5 grid sm:grid-cols-2 gap-4">
        {clientes && (
          <div className="sm:col-span-2">
            <label className="block text-xs text-marinho/60 mb-1">Imobiliária</label>
            <select
              value={clienteId}
              onChange={(e) => setConfirmandoCliente(e.target.value)}
              className="w-full border border-linha rounded px-3 py-2 bg-papel"
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome_empresa}</option>
              ))}
            </select>
            {confirmandoCliente && confirmandoCliente !== clienteId && (
              <div className="mt-2 border border-alerta bg-alerta/10 rounded p-3 text-sm">
                Confirma mudar este orçamento para <b>{clientes.find((c) => c.id === confirmandoCliente)?.nome_empresa}</b>? A imobiliária antiga deixa de ver esse orçamento.
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setConfirmandoCliente(null)} className="border border-linha rounded px-3 py-1 text-xs">Cancelar</button>
                  <button
                    type="button"
                    onClick={async () => {
                      const novoId = confirmandoCliente;
                      setConfirmandoCliente(null);
                      setClienteId(novoId);
                      await fetch(`/api/orcamentos/${orcamento.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cliente_id: novoId }),
                      });
                      router.refresh();
                    }}
                    className="bg-verde text-white rounded px-3 py-1 text-xs font-semibold"
                  >
                    Sim, trocar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel">
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Margem (%)</label>
          <input type="number" value={margem} onChange={(e) => setMargem(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Valor já pago (R$)</label>
          <input type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-marinho/60 mb-1">Garantia</label>
          <textarea value={garantia} onChange={(e) => setGarantia(e.target.value)} rows={2} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs text-marinho/60 mb-1">Prestador responsável</label>
          <select value={prestadorId} onChange={(e) => setPrestadorId(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel">
            <option value="">— nenhum —</option>
            {(prestadores || []).map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => setAtrasado((v) => !v)}
            className={`w-full text-sm px-3 py-2 rounded border ${atrasado ? 'bg-erro text-white border-erro' : 'border-erro text-erro'}`}
          >
            {atrasado ? 'Em atraso — clique para desmarcar' : 'Marcar como em atraso'}
          </button>
        </div>

        <div className="sm:col-span-2 flex justify-between text-sm text-marinho/60 pt-2 border-t border-linha">
          <span>Custo base (MO + MA)</span>
          <span className="font-mono">{fmtBRL(totalBase)}</span>
        </div>
        <div className="sm:col-span-2 flex justify-between text-lg font-semibold">
          <span>Total do orçamento</span>
          <span className="font-mono">{fmtBRL(totalFinal)}</span>
        </div>

        <div className="sm:col-span-2 flex gap-3 pt-2">
          <button type="button" onClick={salvar} disabled={salvando} className="flex-1 bg-marinho text-white rounded py-2.5 font-semibold disabled:opacity-50">
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
          <button type="button" onClick={gerarPdf} disabled={gerandoPdf} className="flex-1 bg-verde text-white rounded py-2.5 font-semibold disabled:opacity-50">
            {gerandoPdf ? 'Gerando…' : 'Gerar PDF e notificar'}
          </button>
        </div>

        {orcamento.pdf_url && (
          <div className="sm:col-span-2">
            <a href={orcamento.pdf_url} target="_blank" rel="noreferrer" className="text-sm text-marinho underline">
              Abrir último PDF gerado
            </a>
          </div>
        )}
      </div>

      {mostrarPagamentoPrestador && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-3">Pagamento ao prestador — {prestadores?.find((p) => p.id === prestadorId)?.nome}</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-marinho/60 mb-1">Valor combinado (R$)</label>
              <input type="number" value={valorCombinado} onChange={(e) => setValorCombinado(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
            </div>
            <div>
              <label className="block text-xs text-marinho/60 mb-1">Valor de entrada (R$)</label>
              <input type="number" value={valorEntrada} onChange={(e) => setValorEntrada(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-marinho/60 mb-1">Status do pagamento</label>
            <select value={statusPagamentoPrestador} onChange={(e) => setStatusPagamentoPrestador(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel">
              <option value="aguardando">Aguardando pagamento</option>
              <option value="entrada_paga">Entrada paga — falta parcela final</option>
              <option value="pago_total">Pago integralmente (realizado)</option>
            </select>
          </div>
          {statusPagamentoPrestador === 'entrada_paga' && (
            <div className="text-xs text-marinho/50 mb-3">
              Falta pagar: {fmtBRL(Math.max(0, (Number(valorCombinado) || 0) - (Number(valorEntrada) || 0)))}
            </div>
          )}
          <button type="button" onClick={salvar} disabled={salvando} className="w-full bg-marinho text-white rounded py-2 text-sm font-semibold disabled:opacity-50">
            Salvar pagamento do prestador
          </button>
        </div>
      )}
    </div>
  );
}
