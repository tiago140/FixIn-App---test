'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Split } from 'lucide-react';
import { fmtBRL } from '@/lib/format';

const ent = 'border border-linha rounded-lg px-2 py-1.5 bg-papel text-sm';

// Divide os itens do orçamento entre 2 ou mais prestadores: uma ordem de serviço para cada um.
// itens: [{ id, ambiente, servico, mo, ma }]; prestadores: [{ id, nome }]; ordens: ordens já criadas deste orçamento.
export default function DividirOrdens({ orcamentoId, itens, prestadores, ordens = [] }) {
  const router = useRouter();
  const [escolhidos, setEscolhidos] = useState([]); // ids de prestadores na divisão
  const [atrib, setAtrib] = useState({}); // itemId -> prestadorId
  const [marcados, setMarcados] = useState(new Set());
  const [alvo, setAlvo] = useState('');
  const [instr, setInstr] = useState({});
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [feito, setFeito] = useState(null);

  const nome = (id) => prestadores.find((p) => p.id === id)?.nome || '—';
  const custo = (i) => (Number(i.mo) || 0) + (Number(i.ma) || 0);
  const ambientes = useMemo(() => { const m = new Map(); itens.forEach((i) => { const k = i.ambiente || 'Geral'; m.set(k, [...(m.get(k) || []), i]); }); return [...m.entries()]; }, [itens]);
  const porPrestador = escolhidos.map((id) => { const its = itens.filter((i) => atrib[i.id] === id); return { id, its, total: its.reduce((s, i) => s + custo(i), 0) }; });
  const semDono = itens.filter((i) => !atrib[i.id]);

  function adicionar(id) { if (id && !escolhidos.includes(id)) { setEscolhidos([...escolhidos, id]); if (!alvo) setAlvo(id); } }
  function remover(id) { setEscolhidos(escolhidos.filter((x) => x !== id)); setAtrib(Object.fromEntries(Object.entries(atrib).filter(([, v]) => v !== id))); if (alvo === id) setAlvo(''); }
  function marcar(id, on) { const s = new Set(marcados); on ? s.add(id) : s.delete(id); setMarcados(s); }
  function marcarAmb(its, on) { const s = new Set(marcados); its.forEach((i) => (on ? s.add(i.id) : s.delete(i.id))); setMarcados(s); }
  function atribuirMarcados() {
    if (!alvo || !marcados.size) return;
    const a = { ...atrib }; marcados.forEach((id) => { a[id] = alvo; }); setAtrib(a); setMarcados(new Set());
  }
  function limparMarcados() { const a = { ...atrib }; marcados.forEach((id) => { delete a[id]; }); setAtrib(a); setMarcados(new Set()); }

  async function criar() {
    setErro(''); setOcupado(true);
    const divisao = porPrestador.filter((g) => g.its.length).map((g) => ({ prestador_id: g.id, item_ids: g.its.map((i) => i.id), descricao: instr[g.id] || '' }));
    if (divisao.length < 1) { setOcupado(false); return setErro('Atribua itens a pelo menos um prestador.'); }
    const r = await fetch('/api/ordens/dividir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orcamento_id: orcamentoId, divisao }) });
    const d = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) { if (d.criadas?.length) setFeito(d.criadas); return setErro(d.error || 'Não foi possível criar as ordens.'); }
    setFeito(d.criadas); router.refresh();
  }

  const disponiveis = prestadores.filter((p) => !escolhidos.includes(p.id));
  return (
    <div className="space-y-4">
      {ordens.length > 0 && <p className="text-xs rounded-lg bg-alerta/10 text-alerta px-3 py-2">Este orçamento já tem {ordens.length} ordem(ns) de serviço ({ordens.map((o) => o.numero).join(', ')}). Dividir cria ordens NOVAS: confira para não repetir itens.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Prestadores da divisão:</span>
        {escolhidos.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-marinho text-white text-xs font-semibold pl-3 pr-1.5 py-1">{nome(id)}<button type="button" onClick={() => remover(id)} className="px-1" aria-label={`Tirar ${nome(id)}`}>×</button></span>
        ))}
        <select value="" onChange={(e) => adicionar(e.target.value)} className={ent}><option value="">+ Adicionar prestador</option>{disponiveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
      </div>

      {escolhidos.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-papel border border-linha px-3 py-2 text-sm">
            <b>{marcados.size}</b> item(ns) marcado(s) →
            <select value={alvo} onChange={(e) => setAlvo(e.target.value)} className={ent}>{escolhidos.map((id) => <option key={id} value={id}>{nome(id)}</option>)}</select>
            <button type="button" onClick={atribuirMarcados} disabled={!marcados.size || !alvo} className="bg-verde text-white font-semibold rounded-lg px-3 py-1.5 disabled:opacity-40">Atribuir</button>
            <button type="button" onClick={limparMarcados} disabled={!marcados.size} className="border border-linha rounded-lg px-3 py-1.5 disabled:opacity-40">Tirar atribuição</button>
            <button type="button" onClick={() => setMarcados(new Set(semDono.map((i) => i.id)))} className="ml-auto text-xs underline text-marinho/60">Marcar os sem prestador</button>
          </div>

          <div className="rounded-lg border border-linha divide-y divide-linha">
            {ambientes.map(([amb, its]) => (
              <div key={amb}>
                <label className="flex items-center gap-2 bg-papel px-3 py-1.5 text-xs font-semibold text-marinho/70"><input type="checkbox" checked={its.every((i) => marcados.has(i.id))} onChange={(e) => marcarAmb(its, e.target.checked)} /> {amb} <span className="font-normal text-marinho/45">({its.length})</span></label>
                {its.map((i) => (
                  <label key={i.id} className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={marcados.has(i.id)} onChange={(e) => marcar(i.id, e.target.checked)} />
                    <span className="flex-1 min-w-0">{i.servico}</span>
                    <span className="text-xs text-marinho/50 whitespace-nowrap">{fmtBRL(custo(i))}</span>
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${atrib[i.id] ? 'bg-sucesso/15 text-sucesso' : 'bg-linha text-marinho/50'}`}>{atrib[i.id] ? nome(atrib[i.id]) : 'sem prestador'}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {porPrestador.map((g) => (
              <div key={g.id} className="card rounded-xl p-3 text-sm">
                <div className="flex justify-between gap-2"><b>{nome(g.id)}</b><span className="text-marinho/60">{g.its.length} item(ns) · {fmtBRL(g.total)}</span></div>
                <textarea value={instr[g.id] || ''} onChange={(e) => setInstr({ ...instr, [g.id]: e.target.value })} rows={2} placeholder="Instruções para este prestador (opcional)" className={`${ent} w-full mt-2`} />
              </div>
            ))}
          </div>
          {semDono.length > 0 && <p className="text-xs text-marinho/60">{semDono.length} item(ns) ficam de fora (sem prestador) e não entram em nenhuma ordem.</p>}
          <button type="button" onClick={criar} disabled={ocupado || !porPrestador.some((g) => g.its.length)} className="bg-verde text-white font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-40 inline-flex items-center gap-2"><Split size={15} />{ocupado ? 'Criando…' : `Criar ${porPrestador.filter((g) => g.its.length).length} ordem(ns) de serviço`}</button>
        </>
      )}
      {erro && <p className="text-sm text-erro">{erro}</p>}
      {feito && (
        <div className="rounded-lg border border-sucesso/40 bg-sucesso/10 p-3 text-sm">
          <b>Ordens criadas e enviadas aos prestadores:</b>
          <ul className="mt-1">{feito.map((o) => <li key={o.id}><Link href={`/master/ordens/${o.id}`} className="underline">{o.numero}</Link> · {o.prestador} · {o.itens} item(ns)</li>)}</ul>
        </div>
      )}
    </div>
  );
}
