'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fmtBRL, fmtDate, STATUS_LABEL, KANBAN_COLS } from '@/lib/format';

const CLASSE_STATUS = {
  rejeitado: 'bg-erro/15 text-erro',
  aprovado: 'bg-sucesso/15 text-sucesso',
  em_execucao: 'bg-sucesso/15 text-sucesso',
  finalizado: 'bg-sucesso/15 text-sucesso',
};

const numeroCsv = (n) => Number(n || 0).toFixed(2).replace('.', ',');

// Comissão e valor da imobiliária são internos da FixIn — só o dono vê.
export default function ControleTabela({ linhas, role = 'master', podeEditar = true, veValores = true }) {
  const veMargem = role === 'master';
  const basePath = role === 'master' ? '/master/orcamentos' : '/imobiliaria/orcamentos';
  const router = useRouter();
  const [salvando, setSalvando] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter((l) =>
      [l.cliente, l.numero_contrato, l.endereco, l.prestador, STATUS_LABEL[l.status]]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [linhas, busca]);

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
    const cabecalho = ['Imobiliária', 'Nº Contrato', 'Endereço', 'Orçamento', 'Aprovado', 'Data Depósito'];
    if (veValores) cabecalho.push('Valor Orçamento');
    if (veMargem) cabecalho.push('Comissão %', 'Valor Imob.', 'Valor Prest.');
    cabecalho.push('Prestador', 'Data Início');

    const dados = [cabecalho];
    filtradas.forEach((l) => {
      const linha = [l.cliente, l.numero_contrato || '', l.endereco, l.temItens ? 'SIM' : 'NÃO', STATUS_LABEL[l.status] || l.status, l.data_deposito || ''];
      if (veValores) linha.push(numeroCsv(l.total));
      if (veMargem) linha.push(l.comissao, numeroCsv(l.valorImob), numeroCsv(l.valorPrest));
      linha.push(l.prestador || '', l.data_inicio || '');
      dados.push(linha);
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
  // impede que um clique num campo editável dispare o link de navegação da linha
  const pararPropagacao = (e) => e.stopPropagation();

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por imobiliária, endereço, contrato, prestador ou status…"
          className="border border-linha rounded px-3 py-2 bg-white text-sm w-full sm:w-96"
        />
        <button onClick={exportarCsv} className="border border-linha bg-white text-sm font-medium px-3 py-2 rounded hover:bg-papel">
          Exportar CSV
        </button>
        <span className="text-xs text-marinho/50">
          {filtradas.length} de {linhas.length} orçamento(s)
        </span>
        {salvando && <span className="text-xs text-marinho/50">salvando…</span>}
        {erro && <span className="text-xs text-erro">{erro}</span>}
      </div>

      <div className="overflow-auto max-h-[calc(100vh-24rem)] min-h-[16rem] sm:max-h-[calc(100vh-17rem)] sm:min-h-[22rem] border border-linha bg-white rounded-md shadow-sm">
        <table className="w-full text-[12.5px] whitespace-nowrap border-collapse">
          <thead>
            <tr>
              <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 left-0 z-30">Imobiliária</th>
              <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Nº Contrato</th>
              <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Endereço</th>
              <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Orçamento</th>
              <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Aprovado</th>
              <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Data Depósito</th>
              {veValores && <th className="bg-marinho text-white text-right font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Valor Orçamento</th>}
              {veMargem && (
                <>
                  <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Comissão %</th>
                  <th className="bg-marinho text-white text-right font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Valor Imob.</th>
                  <th className="bg-marinho text-white text-right font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Valor Prest.</th>
                </>
              )}
              <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Prestador</th>
              <th className="bg-marinho text-white text-left font-semibold uppercase tracking-wide text-[10.5px] px-3 py-2.5 sticky top-0 z-20">Data Início</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr
                key={l.id}
                onClick={() => router.push(`${basePath}/${l.id}`)}
                className="group odd:bg-white even:bg-papel hover:bg-info/10 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2 border-b border-r border-linha sticky left-0 z-10 group-odd:bg-white group-even:bg-papel group-hover:bg-[#ECF1F5]">
                  <Link href={`${basePath}/${l.id}`} onClick={pararPropagacao} className="font-medium text-marinho hover:underline">
                    {l.cliente}
                  </Link>
                </td>
                <td className="px-3 py-2 border-b border-linha" onClick={pararPropagacao}>
                  {podeEditar ? (
                    <input key={`c-${l.id}-${l.numero_contrato}`} defaultValue={l.numero_contrato || ''} placeholder="—" onBlur={aoSair(l, 'numero_contrato', 'texto')} className={campo} />
                  ) : (
                    l.numero_contrato || '—'
                  )}
                </td>
                <td className="px-3 py-2 border-b border-linha">{l.endereco}</td>
                <td className="px-3 py-2 border-b border-linha">{l.temItens ? 'SIM' : 'NÃO'}</td>
                <td className="px-3 py-2 border-b border-linha" onClick={pararPropagacao}>
                  {podeEditar ? (
                    <select
                      value={l.status}
                      onChange={(e) => salvar(l.id, 'status', e.target.value)}
                      className={`text-[11px] font-bold rounded px-1.5 py-1 border border-transparent hover:border-linha ${CLASSE_STATUS[l.status] || 'bg-alerta/15 text-alerta'}`}
                    >
                      {KANBAN_COLS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  ) : (
                    <span className={`text-[11px] font-bold rounded px-1.5 py-1 ${CLASSE_STATUS[l.status] || 'bg-alerta/15 text-alerta'}`}>{STATUS_LABEL[l.status]}</span>
                  )}
                </td>
                <td className="px-3 py-2 border-b border-linha" onClick={pararPropagacao}>
                  {podeEditar ? (
                    <input key={`d-${l.id}-${l.data_deposito}`} type="date" defaultValue={l.data_deposito || ''} onBlur={aoSair(l, 'data_deposito', 'texto')} className={`${campo} min-w-[122px]`} />
                  ) : (
                    l.data_deposito ? fmtDate(l.data_deposito) : '—'
                  )}
                </td>
                {veValores && <td className="px-3 py-2 border-b border-linha text-right font-mono">{fmtBRL(l.total)}</td>}
                {veMargem && (
                  <>
                    <td className="px-3 py-2 border-b border-linha" onClick={pararPropagacao}>
                      {podeEditar ? (
                        <span className="inline-flex items-center gap-0.5">
                          <input key={`p-${l.id}-${l.comissao}`} type="number" min="0" max="100" step="0.5" defaultValue={l.comissao} onBlur={aoSair(l, 'comissao_percentual', 'numero')} className={`${campo} w-14`} />%
                        </span>
                      ) : (
                        `${l.comissao}%`
                      )}
                    </td>
                    <td className="px-3 py-2 border-b border-linha text-right font-mono">{fmtBRL(l.valorImob)}</td>
                    <td className="px-3 py-2 border-b border-linha text-right font-mono">{fmtBRL(l.valorPrest)}</td>
                  </>
                )}
                <td className="px-3 py-2 border-b border-linha">{l.prestador || '—'}</td>
                <td className="px-3 py-2 border-b border-linha" onClick={pararPropagacao}>
                  {podeEditar ? (
                    <input key={`i-${l.id}-${l.data_inicio}`} type="date" defaultValue={l.data_inicio || ''} onBlur={aoSair(l, 'data_inicio', 'texto')} className={`${campo} min-w-[122px]`} />
                  ) : (
                    l.data_inicio ? fmtDate(l.data_inicio) : '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtradas.length === 0 && (
          <div className="p-8 text-center text-marinho/50">
            {linhas.length === 0 ? 'Nenhum orçamento ainda.' : 'Nenhum resultado para essa busca.'}
          </div>
        )}
      </div>
    </div>
  );
}
