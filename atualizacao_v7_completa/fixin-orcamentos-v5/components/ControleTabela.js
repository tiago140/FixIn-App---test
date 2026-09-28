'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtBRL, STATUS_LABEL, KANBAN_COLS } from '@/lib/format';

const CLASSE_STATUS = {
  rejeitado: 'bg-erro/15 text-erro',
  aprovado: 'bg-sucesso/15 text-sucesso',
  em_execucao: 'bg-sucesso/15 text-sucesso',
  finalizado: 'bg-sucesso/15 text-sucesso',
};

const CABECALHO = [
  'Imobiliária', 'Nº Contrato', 'Endereço', 'Orçamento', 'Aprovado', 'Data Depósito',
  'Valor Orçamento', 'Comissão %', 'Valor Imob.', 'Valor Prest.', 'Prestador', 'Data Início',
];

const numeroCsv = (n) => Number(n || 0).toFixed(2).replace('.', ',');

export default function ControleTabela({ linhas }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(null);
  const [erro, setErro] = useState('');

  async function salvar(id, campo, valor) {
    setErro('');
    setSalvando(id);
    const res = await fetch(`/api/orcamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: valor }),
    });
    setSalvando(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d.error || 'Não foi possível salvar.');
      return;
    }
    router.refresh();
  }

  function aoSair(l, campo, tipo) {
    return (e) => {
      let v = e.target.value.trim();
      const atual = l[campo] == null ? '' : String(l[campo]);
      if (v === atual) return;
      if (tipo === 'numero') v = Number(v) || 0;
      else if (v === '') v = null;
      salvar(l.id, campo, v);
    };
  }

  function exportarCsv() {
    const dados = [CABECALHO];
    linhas.forEach((l) => {
      dados.push([
        l.cliente, l.numero_contrato || '', l.endereco, l.temItens ? 'SIM' : 'NÃO',
        STATUS_LABEL[l.status] || l.status, l.data_deposito || '',
        numeroCsv(l.total), l.comissao, numeroCsv(l.valorImob), numeroCsv(l.valorPrest),
        l.prestador || '', l.data_inicio || '',
      ]);
    });
    const csv = dados.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'controle-manutencao-fixin.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const campo = 'w-full bg-transparent border border-transparent hover:border-linha focus:border-marinho focus:bg-white rounded px-1 py-0.5 text-[12px] outline-none';

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={exportarCsv} className="border border-linha bg-white text-sm font-medium px-3 py-1.5 rounded hover:bg-papel">
          Exportar CSV
        </button>
        {salvando && <span className="text-xs text-marinho/50">salvando…</span>}
        {erro && <span className="text-xs text-erro">{erro}</span>}
      </div>

      <div className="overflow-x-auto border border-linha bg-white">
        <table className="w-full text-[12px] whitespace-nowrap border-collapse">
          <thead>
            <tr>
              {CABECALHO.map((c) => (
                <th key={c} className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-2 py-2 sticky top-0">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="odd:bg-white even:bg-papel">
                <td className="px-2 py-1 border-b border-r border-linha">{l.cliente}</td>
                <td className="px-2 py-1 border-b border-r border-linha">
                  <input key={`c-${l.id}-${l.numero_contrato}`} defaultValue={l.numero_contrato || ''} placeholder="—" onBlur={aoSair(l, 'numero_contrato', 'texto')} className={campo} />
                </td>
                <td className="px-2 py-1 border-b border-r border-linha">{l.endereco}</td>
                <td className="px-2 py-1 border-b border-r border-linha">{l.temItens ? 'SIM' : 'NÃO'}</td>
                <td className="px-2 py-1 border-b border-r border-linha">
                  <select
                    value={l.status}
                    onChange={(e) => salvar(l.id, 'status', e.target.value)}
                    className={`text-[11px] font-bold rounded px-1 py-0.5 border border-transparent hover:border-linha ${CLASSE_STATUS[l.status] || 'bg-alerta/15 text-alerta'}`}
                  >
                    {KANBAN_COLS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1 border-b border-r border-linha">
                  <input key={`d-${l.id}-${l.data_deposito}`} type="date" defaultValue={l.data_deposito || ''} onBlur={aoSair(l, 'data_deposito', 'texto')} className={`${campo} min-w-[112px]`} />
                </td>
                <td className="px-2 py-1 border-b border-r border-linha text-right font-mono">{fmtBRL(l.total)}</td>
                <td className="px-2 py-1 border-b border-r border-linha">
                  <input key={`p-${l.id}-${l.comissao}`} type="number" min="0" max="100" step="0.5" defaultValue={l.comissao} onBlur={aoSair(l, 'comissao_percentual', 'numero')} className={`${campo} w-14`} />%
                </td>
                <td className="px-2 py-1 border-b border-r border-linha text-right font-mono">{fmtBRL(l.valorImob)}</td>
                <td className="px-2 py-1 border-b border-r border-linha text-right font-mono">{fmtBRL(l.valorPrest)}</td>
                <td className="px-2 py-1 border-b border-r border-linha">{l.prestador || '—'}</td>
                <td className="px-2 py-1 border-b border-linha">
                  <input key={`i-${l.id}-${l.data_inicio}`} type="date" defaultValue={l.data_inicio || ''} onBlur={aoSair(l, 'data_inicio', 'texto')} className={`${campo} min-w-[112px]`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {linhas.length === 0 && <div className="p-8 text-center text-marinho/50">Nenhum orçamento ainda.</div>}
      </div>
    </div>
  );
}
