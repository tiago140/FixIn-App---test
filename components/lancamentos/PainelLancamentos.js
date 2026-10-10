'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownCircle, ArrowUpCircle, AlertTriangle, Scale } from 'lucide-react';
import KpiCard from '@/components/KpiCard';
import { fmtBRL, fmtDate } from '@/lib/format';
import { STATUS_LANC, CATEGORIAS_RECEBER, CATEGORIAS_PAGAR, emAberto, saldoAberto, vencido } from '@/lib/lancamentos';

const FILTROS = [
  ['aberto', 'Em aberto'], ['vencidos', 'Vencidos'], ['pagos', 'Pagos'], ['cancelados', 'Cancelados'], ['todos', 'Todos'],
];
const campo = 'border border-linha rounded px-3 py-2 bg-papel text-sm w-full';

export default function PainelLancamentos({ lancamentos, clientes, prestadores, hoje }) {
  const router = useRouter();
  const [aba, setAba] = useState('receber');
  const [filtro, setFiltro] = useState('aberto');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(false);
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [pagando, setPagando] = useState(null); // { id, valor, data }

  const pagarDoOrcamento = useMemo(() => {
    const m = {};
    lancamentos.forEach((x) => { if (x.tipo === 'pagar' && x.orcamento_id && x.status !== 'cancelado') m[x.orcamento_id] = x; });
    return m;
  }, [lancamentos]);

  const soma = (tipo, fn) => lancamentos.filter((l) => l.tipo === tipo && fn(l)).reduce((a, l) => a + saldoAberto(l), 0);
  const receberAberto = soma('receber', () => true);
  const receberVencido = soma('receber', (l) => vencido(l, hoje));
  const pagarAberto = soma('pagar', () => true);
  const pagarVencido = soma('pagar', (l) => vencido(l, hoje));

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lancamentos.filter((l) => {
      if (l.tipo !== aba) return false;
      if (filtro === 'aberto' && !emAberto(l)) return false;
      if (filtro === 'vencidos' && !vencido(l, hoje)) return false;
      if (filtro === 'pagos' && l.status !== 'pago') return false;
      if (filtro === 'cancelados' && l.status !== 'cancelado') return false;
      if (q) {
        const alvo = `${l.descricao} ${l.categoria || ''} ${l.clientes?.nome_empresa || ''} ${l.prestadores?.nome || ''}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [lancamentos, aba, filtro, busca, hoje]);

  async function acao(id, corpo) {
    setOcupado(id); setMsg('');
    try {
      const r = await fetch(`/api/lancamentos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || 'Não foi possível concluir.');
      else {
        setPagando(null);
        const origem = lancamentos.find((x) => x.id === id);
        const filha = origem && origem.tipo === 'receber' && corpo.acao === 'pagar' ? pagarDoOrcamento[origem.orcamento_id] : null;
        if (filha && filha.status === 'previsto' && confirm(`Recebido! Enviar agora para Contas a pagar: ${filha.prestadores?.nome || 'prestador'} · ${fmtBRL(filha.valor)}?`)) {
          await fetch(`/api/lancamentos/${filha.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'aprovar' }) });
        }
        router.refresh();
      }
    } catch (e) { setMsg('Falha de conexão. Tente de novo.'); }
    setOcupado('');
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icone={ArrowDownCircle} cor="#3F7A5E" num={fmtBRL(receberAberto)} lbl="A receber em aberto" />
        <KpiCard icone={AlertTriangle} cor="#B45309" num={fmtBRL(receberVencido)} lbl="Vencido a receber" />
        <KpiCard icone={ArrowUpCircle} cor="#182F50" num={fmtBRL(pagarAberto)} lbl="A pagar em aberto" sub={pagarVencido > 0 ? `${fmtBRL(pagarVencido)} vencido` : undefined} />
        <KpiCard icone={Scale} cor={receberAberto - pagarAberto >= 0 ? '#3F7A5E' : '#B91C1C'} num={fmtBRL(receberAberto - pagarAberto)} lbl="Saldo previsto" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[['receber', 'A receber'], ['pagar', 'A pagar']].map(([k, t]) => (
          <button key={k} onClick={() => { setAba(k); setNovo(false); }} className={`px-4 py-2 rounded-lg text-sm font-semibold border ${aba === k ? 'bg-marinho text-white border-marinho' : 'bg-white border-linha text-marinho'}`}>{t}</button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setNovo(!novo)} className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded-lg">{novo ? 'Fechar' : '+ Novo lançamento'}</button>
      </div>

      {novo && <NovoLancamento tipo={aba} clientes={clientes} prestadores={prestadores} hoje={hoje} onFeito={() => { setNovo(false); router.refresh(); }} />}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {FILTROS.map(([k, t]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1 rounded-full text-xs font-semibold border ${filtro === k ? 'bg-verde text-white border-verde' : 'bg-white border-linha text-marinho/70'}`}>{t}</button>
        ))}
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="border border-linha rounded px-3 py-1.5 bg-papel text-sm ml-auto w-full sm:w-56" />
      </div>

      {msg && <p className="text-sm text-red-700 mb-3">{msg}</p>}

      {lista.length === 0 ? (
        <div className="card p-6 text-sm text-marinho/60">Nenhum lançamento aqui.</div>
      ) : (
        <div className="space-y-2">
          {lista.map((l) => {
            const atrasado = vencido(l, hoje);
            const quem = l.tipo === 'receber' ? l.clientes?.nome_empresa : l.prestadores?.nome;
            return (
              <div key={l.id} className={`card p-4 border-l-4 ${atrasado ? 'border-l-red-600' : l.status === 'pago' ? 'border-l-verde' : 'border-l-linha'}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-marinho break-words">{l.descricao}</div>
                    <div className="text-xs text-marinho/60 mt-0.5">
                      {[quem, l.categoria].filter(Boolean).join(' · ')}{quem || l.categoria ? ' · ' : ''}vence {fmtDate(l.vencimento)}
                      {l.origem !== 'manual' && ' · automático'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{fmtBRL(l.valor)}</div>
                    {Number(l.valor_pago) > 0 && l.status !== 'pago' && <div className="text-xs text-marinho/60">pago {fmtBRL(l.valor_pago)}</div>}
                    <span className={`inline-block mt-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${atrasado ? 'bg-red-100 text-red-700' : l.status === 'pago' ? 'bg-verde/15 text-verde' : 'bg-marinho/10 text-marinho'}`}>
                      {atrasado ? 'Vencido' : STATUS_LANC[l.status]}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {l.tipo === 'pagar' && l.status === 'previsto' && <Btn onClick={() => acao(l.id, { acao: 'aprovar' })} off={ocupado === l.id}>Aprovar para pagar</Btn>}
                  {emAberto(l) && !(l.tipo === 'pagar' && l.status !== 'aprovado') && (
                    <Btn onClick={() => setPagando({ id: l.id, valor: String(saldoAberto(l)).replace('.', ','), data: hoje })} off={ocupado === l.id}>{l.tipo === 'receber' ? 'Marcar recebido' : 'Marcar pago'}</Btn>
                  )}
                  {l.tipo === 'receber' && l.status === 'pago' && pagarDoOrcamento[l.orcamento_id]?.status === 'previsto' && (
                    <Btn onClick={() => acao(pagarDoOrcamento[l.orcamento_id].id, { acao: 'aprovar' })} off={ocupado === pagarDoOrcamento[l.orcamento_id].id}>Enviar para contas a pagar</Btn>
                  )}
                  {emAberto(l) && <Btn suave onClick={() => confirm('Cancelar este lançamento?') && acao(l.id, { acao: 'cancelar' })} off={ocupado === l.id}>Cancelar</Btn>}
                  {!emAberto(l) && <Btn suave onClick={() => acao(l.id, { acao: 'reabrir' })} off={ocupado === l.id}>Reabrir</Btn>}
                </div>

                {l.tipo === 'pagar' && l.status === 'previsto' && l.orcamento_id && (
                  <p className="text-xs text-marinho/60 mt-2">Aguarda o recebimento da imobiliária para ser enviada ao pagamento (ou aprove manualmente).</p>
                )}

                {pagando?.id === l.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 bg-papel rounded p-3">
                    <label className="text-xs">Valor (R$)<input className={campo + ' mt-1'} value={pagando.valor} onChange={(e) => setPagando({ ...pagando, valor: e.target.value })} inputMode="decimal" /></label>
                    <label className="text-xs">Data<input type="date" className={campo + ' mt-1'} value={pagando.data} onChange={(e) => setPagando({ ...pagando, data: e.target.value })} /></label>
                    <Btn onClick={() => acao(l.id, { acao: 'pagar', valor: pagando.valor, data: pagando.data })} off={ocupado === l.id}>Confirmar</Btn>
                    <Btn suave onClick={() => setPagando(null)}>Fechar</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Btn({ children, suave, off, ...p }) {
  return (
    <button disabled={off} {...p} className={`text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-50 ${suave ? 'border border-linha text-marinho bg-white' : 'bg-marinho text-white'}`}>{children}</button>
  );
}

function NovoLancamento({ tipo, clientes, prestadores, hoje, onFeito }) {
  const [f, setF] = useState({ descricao: '', valor: '', vencimento: hoje, categoria: '', quem: '', observacao: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const cats = tipo === 'receber' ? CATEGORIAS_RECEBER : CATEGORIAS_PAGAR;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function salvar(e) {
    e.preventDefault();
    setErro(''); setSalvando(true);
    try {
      const r = await fetch('/api/lancamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descricao: f.descricao, valor: f.valor, vencimento: f.vencimento, categoria: f.categoria, observacao: f.observacao, cliente_id: tipo === 'receber' ? f.quem : null, prestador_id: tipo === 'pagar' ? f.quem : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErro(j.error || 'Não foi possível salvar.');
      else onFeito();
    } catch (e2) { setErro('Falha de conexão.'); }
    setSalvando(false);
  }

  return (
    <form onSubmit={salvar} className="card p-4 mb-4 grid sm:grid-cols-2 gap-3">
      <label className="text-xs sm:col-span-2">Descrição<input className={campo + ' mt-1'} value={f.descricao} onChange={set('descricao')} maxLength={300} required /></label>
      <label className="text-xs">Valor (R$)<input className={campo + ' mt-1'} value={f.valor} onChange={set('valor')} inputMode="decimal" required /></label>
      <label className="text-xs">Vencimento<input type="date" className={campo + ' mt-1'} value={f.vencimento} onChange={set('vencimento')} required /></label>
      <label className="text-xs">Categoria
        <select className={campo + ' mt-1'} value={f.categoria} onChange={set('categoria')}><option value="">—</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <label className="text-xs">{tipo === 'receber' ? 'Cliente (imobiliária)' : 'Prestador'}
        <select className={campo + ' mt-1'} value={f.quem} onChange={set('quem')}>
          <option value="">—</option>
          {(tipo === 'receber' ? clientes.map((c) => [c.id, c.nome_empresa]) : prestadores.map((p) => [p.id, p.nome])).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      </label>
      <label className="text-xs sm:col-span-2">Observação<input className={campo + ' mt-1'} value={f.observacao} onChange={set('observacao')} maxLength={500} /></label>
      {erro && <p className="text-sm text-red-700 sm:col-span-2">{erro}</p>}
      <div className="sm:col-span-2"><button disabled={salvando} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">{salvando ? 'Salvando…' : 'Salvar lançamento'}</button></div>
    </form>
  );
}
