'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fmtBRL, fmtDate, STATUS_LABEL, KANBAN_COLS } from '@/lib/format';

const CLASSE_STATUS = {
  rejeitado: 'bg-erro/15 text-erro',
  aprovado: 'bg-sucesso/15 text-sucesso',
  em_execucao: 'bg-sucesso/15 text-sucesso',
  finalizado: 'bg-sucesso/15 text-sucesso',
};

const selFiltro = 'border border-linha rounded px-2 py-1.5 bg-white text-[12.5px] font-normal normal-case tracking-normal text-marinho max-w-[190px]';
const numeroCsv = (n) => Number(n || 0).toFixed(2).replace('.', ',');

// Comissão e valor da imobiliária são internos da FixIn — só o dono vê.
export default function ControleTabela({ linhas, role = 'master', podeEditar = true, veValores = true, veComissao = true }) {
  const veMargem = role === 'master' && veComissao;
  const basePath = role === 'master' ? '/master/orcamentos' : '/imobiliaria/orcamentos';
  const router = useRouter();
  const [salvando, setSalvando] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const CHAVE = `controle-filtros-${role}`;

  const VAZIO = { status: '', imob: '', orc: '', prestador: '', deposito: '', depDe: '', depAte: '', inicio: '', iniDe: '', iniAte: '' };
  const [f, setF] = useState(VAZIO);
  const setCampo = (k) => (e) => setF((a) => ({ ...a, [k]: e.target.value }));
  const [lido, setLido] = useState(false);
  // Guarda busca e filtros: ao abrir um orçamento e voltar, a lista continua filtrada.
  useEffect(() => {
    try {
      const salvo = JSON.parse(sessionStorage.getItem(CHAVE) || 'null');
      if (salvo) { setF({ ...VAZIO, ...salvo.f }); setBusca(salvo.busca || ''); }
    } catch (_) {}
    setLido(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!lido) return;
    try { sessionStorage.setItem(CHAVE, JSON.stringify({ f, busca })); } catch (_) {}
  }, [f, busca, lido]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtrosAtivos = Object.values(f).some(Boolean);

  const imobs = useMemo(() => [...new Set(linhas.map((l) => l.cliente).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [linhas]);
  const prestadores = useMemo(() => [...new Set(linhas.map((l) => l.prestador).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [linhas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const dia = (v) => (v ? String(v).slice(0, 10) : '');
    return linhas.filter((l) => {
      if (q && ![l.cliente, l.numero_contrato, l.endereco, l.prestador, STATUS_LABEL[l.status]].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))) return false;
      if (f.status && l.status !== f.status) return false;
      if (f.imob && l.cliente !== f.imob) return false;
      if (f.orc && (f.orc === 'sim') !== !!l.temItens) return false;
      if (f.prestador === '__sem' ? !!l.prestador : f.prestador && l.prestador !== f.prestador) return false;
      const dep = dia(l.data_deposito);
      if (f.deposito === 'com' && !dep) return false;
      if (f.deposito === 'sem' && dep) return false;
      if (f.depDe && (!dep || dep < f.depDe)) return false;
      if (f.depAte && (!dep || dep > f.depAte)) return false;
      const ini = dia(l.data_inicio);
      if (f.inicio === 'com' && !ini) return false;
      if (f.inicio === 'sem' && ini) return false;
      if (f.iniDe && (!ini || ini < f.iniDe)) return false;
      if (f.iniAte && (!ini || ini > f.iniAte)) return false;
      return true;
    });
  }, [linhas, busca, f]);

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

      <div className="flex items-end gap-2 mb-3 flex-wrap">
        {[
          ['Situação', <select key="s" value={f.status} onChange={setCampo('status')} className={selFiltro}><option value="">Todas</option>{KANBAN_COLS.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}</select>],
          ['Imobiliária', <select key="i" value={f.imob} onChange={setCampo('imob')} className={selFiltro}><option value="">Todas</option>{imobs.map((n) => <option key={n} value={n}>{n}</option>)}</select>],
          ['Orçamento', <select key="o" value={f.orc} onChange={setCampo('orc')} className={selFiltro}><option value="">Todos</option><option value="sim">SIM (com itens)</option><option value="nao">NÃO (sem itens)</option></select>],
          ['Prestador', <select key="p" value={f.prestador} onChange={setCampo('prestador')} className={selFiltro}><option value="">Todos</option><option value="__sem">Sem prestador</option>{prestadores.map((n) => <option key={n} value={n}>{n}</option>)}</select>],
          ['Depósito', <select key="d" value={f.deposito} onChange={setCampo('deposito')} className={selFiltro}><option value="">Todos</option><option value="com">Com data</option><option value="sem">Sem data</option></select>],
          ['Depósito de', <input key="dd" type="date" value={f.depDe} onChange={setCampo('depDe')} className={selFiltro} />],
          ['até', <input key="da" type="date" value={f.depAte} onChange={setCampo('depAte')} className={selFiltro} />],
          ['Início', <select key="n" value={f.inicio} onChange={setCampo('inicio')} className={selFiltro}><option value="">Todos</option><option value="com">Com data</option><option value="sem">Sem data</option></select>],
          ['Início de', <input key="nd" type="date" value={f.iniDe} onChange={setCampo('iniDe')} className={selFiltro} />],
          ['até', <input key="na" type="date" value={f.iniAte} onChange={setCampo('iniAte')} className={selFiltro} />],
        ].map(([rot, el], i) => (
          <label key={i} className="text-[10.5px] uppercase tracking-wide font-semibold text-marinho/60 flex flex-col gap-0.5">
            {rot}
            {el}
          </label>
        ))}
        {filtrosAtivos && (
          <button onClick={() => setF(VAZIO)} className="text-xs font-medium text-marinho underline pb-2">
            Limpar filtros
          </button>
        )}
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
                onClick={() => router.push(`${basePath}/${l.id}?de=controle`)}
                className="group odd:bg-white even:bg-papel hover:bg-info/10 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2 border-b border-r border-linha sticky left-0 z-10 group-odd:bg-white group-even:bg-papel group-hover:bg-[#ECF1F5]">
                  <Link href={`${basePath}/${l.id}?de=controle`} onClick={pararPropagacao} className="font-medium text-marinho hover:underline">
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
            {linhas.length === 0 ? 'Nenhum orçamento ainda.' : 'Nenhum resultado para esses filtros.'}
          </div>
        )}
      </div>
    </div>
  );
}
