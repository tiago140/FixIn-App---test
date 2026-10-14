'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownCircle, ArrowUpCircle, AlertTriangle, Scale, FileCheck2, CheckCircle2 } from 'lucide-react';
import KpiCard from '@/components/KpiCard';
import { fmtBRL, fmtDate } from '@/lib/format';
import { STATUS_LANC, CATEGORIAS_RECEBER, CATEGORIAS_PAGAR, emAberto, saldoAberto, vencido, somarDias } from '@/lib/lancamentos';

const FILTROS = [
  ['aberto', 'Em aberto'], ['conferir', 'Para conferir'], ['liberados', 'Liberados'], ['vencidos', 'Vencidos'], ['pagos', 'Pagos'], ['cancelados', 'Cancelados'], ['todos', 'Todos'],
];
const campo = 'border border-linha rounded px-3 py-2 bg-papel text-sm w-full';

export default function PainelLancamentos({ lancamentos, clientes, prestadores, comprovantes = [], cobrancas = [], asaasPronto = false, tikpagPronto = false, ambiente = 'sandbox', hoje }) {
  const router = useRouter();
  const [aba, setAba] = useState('receber');
  const [filtro, setFiltro] = useState('aberto');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(false);
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [atribuindo, setAtribuindo] = useState(null); // { id, prestador_id, valor }
  const [pagando, setPagando] = useState(null);
  const [copiado, setCopiado] = useState('');
  const [gerando, setGerando] = useState(null); // { id, parcela, avulso, nome, documento, email } // { id, valor, data }

  const pagarDoOrcamento = useMemo(() => {
    const m = {};
    lancamentos.forEach((x) => { if (x.tipo === 'pagar' && x.orcamento_id && x.status !== 'cancelado') m[x.orcamento_id] = x; });
    return m;
  }, [lancamentos]);

  const compsDoOrc = useMemo(() => {
    const m = {};
    comprovantes.forEach((c) => { (m[c.orcamento_id] = m[c.orcamento_id] || []).push(c); });
    return m;
  }, [comprovantes]);
  const pendentesConferir = comprovantes.filter((c) => !c.verificado && lancamentos.some((l) => l.orcamento_id === c.orcamento_id && l.tipo === 'receber' && l.status !== 'cancelado'));
  const nomeDoOrc = (id) => lancamentos.find((l) => l.orcamento_id === id && l.tipo === 'receber')?.descricao || 'Orçamento';

  // Confere o comprovante: usa o mesmo caminho que a tela do orçamento (valor pago acumulado e status).
  async function conferir(c) {
    const rec = lancamentos.find((l) => l.orcamento_id === c.orcamento_id && l.tipo === 'receber' && l.status !== 'cancelado');
    if (!rec) return;
    const jaConferido = (compsDoOrc[c.orcamento_id] || []).filter((x) => x.verificado).reduce((a, x) => a + Number(x.valor || 0), 0);
    const acumulado = Math.min(Number(rec.valor), Math.round((jaConferido + Number(c.valor || 0)) * 100) / 100);
    if (!confirm(`Confirmar que ${fmtBRL(c.valor)} entraram? O recebido deste orçamento ficará em ${fmtBRL(acumulado)}.`)) return;
    setOcupado(c.id); setMsg('');
    try {
      const r = await fetch(`/api/orcamentos/${c.orcamento_id}/comprovantes`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comprovante_id: c.id, valor_pago: acumulado, pagamento_cliente_status: acumulado >= Number(rec.valor) ? 'pago_total' : 'entrada_paga' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j.error || 'Não foi possível confirmar.'); }
      else {
        const filha = pagarDoOrcamento[c.orcamento_id];
        if (filha && filha.status === 'previsto' && confirm(`Recebido! Enviar agora para Contas a pagar: ${filha.prestadores?.nome || 'prestador'} · ${fmtBRL(filha.valor)}?`)) {
          await fetch(`/api/lancamentos/${filha.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'aprovar' }) });
        }
        router.refresh();
      }
    } catch (e) { setMsg('Falha de conexão. Tente de novo.'); }
    setOcupado('');
  }

  const cobrDoLanc = useMemo(() => {
    const m = {};
    cobrancas.forEach((c) => { (m[c.lancamento_id] = m[c.lancamento_id] || []).push(c); });
    return m;
  }, [cobrancas]);

  async function gerarCobranca(id, parcela, pagador, provedor = 'asaas') {
    setOcupado(id); setMsg('');
    try {
      const r = await fetch(`/api/lancamentos/${id}/${provedor === 'tikpag' ? 'tikpag' : 'cobranca'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parcela, pagador }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || 'Não foi possível gerar a cobrança.');
      else { setGerando(null); router.refresh(); }
    } catch (e) { setMsg('Falha de conexão. Tente de novo.'); }
    setOcupado('');
  }
  async function cancelarCobranca(id) {
    if (!confirm('Cancelar a cobrança em aberto?')) return;
    setOcupado(id); setMsg('');
    try {
      const r = await fetch(`/api/lancamentos/${id}/cobranca`, { method: 'DELETE' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || 'Não foi possível cancelar.');
      else router.refresh();
    } catch (e) { setMsg('Falha de conexão.'); }
    setOcupado('');
  }
  async function ligarAvisos() {
    setOcupado('aviso'); setMsg('');
    try {
      const r = await fetch('/api/asaas/webhook', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      setMsg(r.ok ? 'Avisos do Asaas ligados. Pode gerar uma cobrança de teste.' : (j.error || 'Não foi possível ligar.'));
    } catch (e) { setMsg('Falha de conexão.'); }
    setOcupado('');
  }
  async function copiar(url) {
    try { await navigator.clipboard.writeText(url); setCopiado(url); setTimeout(() => setCopiado(''), 2000); } catch (e) { window.prompt('Copie o link:', url); }
  }

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
      if (filtro === 'conferir' && !(l.tipo === 'receber' && (compsDoOrc[l.orcamento_id] || []).some((c) => !c.verificado))) return false;
      if (filtro === 'liberados' && !(l.tipo === 'pagar' && l.status === 'previsto' && lancamentos.some((r) => r.orcamento_id && r.orcamento_id === l.orcamento_id && r.tipo === 'receber' && r.status === 'pago'))) return false;
      if (filtro === 'pagos' && l.status !== 'pago') return false;
      if (filtro === 'cancelados' && l.status !== 'cancelado') return false;
      if (q) {
        const alvo = `${l.descricao} ${l.categoria || ''} ${l.clientes?.nome_empresa || ''} ${l.prestadores?.nome || ''}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [lancamentos, aba, filtro, busca, hoje, compsDoOrc]);

  async function acao(id, corpo) {
    setOcupado(id); setMsg('');
    try {
      const r = await fetch(`/api/lancamentos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || 'Não foi possível concluir.');
      else {
        setPagando(null); setAtribuindo(null);
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


      {asaasPronto && (
        <div className="card p-3 mb-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold">Asaas ({ambiente === 'producao' ? 'produção' : 'teste'})</span>
          <span className="text-marinho/60">Para o "No caixa" automático, o Asaas precisa avisar o sistema quando alguém pagar.</span>
          <Btn onClick={ligarAvisos} off={ocupado === 'aviso'}>Ligar avisos do Asaas</Btn>
        </div>
      )}
      <PainelHoje
        pendentes={pendentesConferir}
        nomeDoOrc={nomeDoOrc}
        aprovar={lancamentos.filter((l) => l.tipo === 'pagar' && l.status === 'previsto' && lancamentos.some((r) => r.orcamento_id && r.orcamento_id === l.orcamento_id && r.tipo === 'receber' && r.status === 'pago'))}
        vencidosReceber={lancamentos.filter((l) => l.tipo === 'receber' && vencido(l, hoje))}
        vencidosPagar={lancamentos.filter((l) => l.tipo === 'pagar' && vencido(l, hoje))}
        ir={(tipo, f) => { setAba(tipo); setFiltro(f); setNovo(false); setTimeout(() => document.getElementById('lista-contas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
      />
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <PorOrcamento lancamentos={lancamentos} pagarDoOrcamento={pagarDoOrcamento} />
        <Proximos30 lancamentos={lancamentos} hoje={hoje} />
      </div>

      <div id="lista-contas" className="scroll-mt-4" />
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

                {l.tipo === 'receber' && Number(l.valor) > 0 && (
                  <div className="mt-3">
                    <div className="h-2 rounded bg-marinho/10 overflow-hidden"><div className="h-2 bg-verde" style={{ width: `${Math.min(100, (Number(l.valor_pago || 0) / Number(l.valor)) * 100)}%` }} /></div>
                    <div className="text-[11px] text-marinho/60 mt-1">Entrada 50% {fmtBRL(Number(l.valor) / 2)} · Saldo 50% {fmtBRL(Number(l.valor) / 2)} · recebido {fmtBRL(l.valor_pago || 0)}</div>
                  </div>
                )}
                {l.tipo === 'receber' && (compsDoOrc[l.orcamento_id] || []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {compsDoOrc[l.orcamento_id].map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-2 text-xs border border-linha rounded px-2 py-1.5">
                        <a href={c.url} target="_blank" rel="noreferrer" className="underline text-marinho">Comprovante — {c.tipo_pagamento === 'integral' ? 'integral' : 'entrada 50%'}</a>
                        <span className="text-marinho/60">{fmtBRL(c.valor)} · pago em {fmtDate(c.data_pagamento)}</span>
                        <span className="flex-1" />
                        {c.verificado
                          ? <span className="text-verde font-semibold">✓ Conferido</span>
                          : <><span className="text-amber-700 font-semibold">Aguardando conferência</span><Btn onClick={() => conferir(c)} off={ocupado === c.id}>Conferir e confirmar</Btn></>}
                      </div>
                    ))}
                  </div>
                )}

                {l.tipo === 'receber' && asaasPronto && l.orcamento_id && (
                  <div className="mt-2 space-y-1">
                    {(cobrDoLanc[l.id] || []).map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-2 text-xs border border-linha rounded px-2 py-1.5">
                        <span className="font-semibold">Cobrança {c.parcela === 'entrada' ? 'entrada 50%' : c.parcela === 'saldo' ? 'saldo' : 'integral'}</span>
                        <span className="text-marinho/60">{fmtBRL(c.valor)} · vence {fmtDate(c.vencimento)}</span>
                        <span className="flex-1" />
                        {c.status === 'no_caixa' && <span className="text-verde font-semibold">✓ No caixa</span>}
                        {c.status === 'aprovado' && <span className="text-verde font-semibold">Aprovado (aguardando repasse)</span>}
                        {c.status === 'pendente' && (<>
                          <span className="text-amber-700 font-semibold">Cobrança enviada</span>
                          {c.url && <><Btn onClick={() => copiar(c.url)}>{copiado === c.url ? 'Copiado!' : 'Copiar link'}</Btn><a href={c.url} target="_blank" rel="noreferrer" className="underline text-marinho">Abrir</a></>}
                          <Btn suave onClick={() => cancelarCobranca(l.id)} off={ocupado === l.id}>Cancelar</Btn>
                        </>)}
                        {['vencida', 'cancelada', 'estornada'].includes(c.status) && <span className="text-marinho/50">{c.status}</span>}
                      </div>
                    ))}
                    {emAberto(l) && !(cobrDoLanc[l.id] || []).some((c) => c.status === 'pendente') && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[11px] text-marinho/60">Gerar cobrança{ambiente === 'sandbox' ? ' (teste)' : ''}:</span>
                        {Number(l.valor_pago || 0) === 0 && <Btn onClick={() => setGerando({ id: l.id, parcela: 'entrada', avulso: false, nome: '', documento: '', email: '' })} off={ocupado === l.id}>Entrada 50%</Btn>}
                        {Number(l.valor_pago || 0) > 0 && <Btn onClick={() => setGerando({ id: l.id, parcela: 'saldo', avulso: false, nome: '', documento: '', email: '' })} off={ocupado === l.id}>Saldo</Btn>}
                        {Number(l.valor_pago || 0) === 0 && <Btn onClick={() => setGerando({ id: l.id, parcela: 'total', avulso: false, nome: '', documento: '', email: '' })} off={ocupado === l.id}>100%</Btn>}
                      </div>
                    )}
                  </div>
                )}

                {gerando?.id === l.id && (
                  <div className="mt-2 bg-papel rounded p-3 space-y-2 text-xs">
                    <div className="font-semibold">Gerar cobrança — {gerando.parcela === 'entrada' ? 'entrada 50%' : gerando.parcela === 'saldo' ? 'saldo' : '100%'}</div>
                    <label className="flex items-center gap-2"><input type="radio" checked={!gerando.avulso} onChange={() => setGerando({ ...gerando, avulso: false })} /> Quem paga é a imobiliária{l.clientes?.nome_empresa ? ` (${l.clientes.nome_empresa})` : ''}</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={gerando.avulso} onChange={() => setGerando({ ...gerando, avulso: true })} /> Quem paga é outra pessoa ou empresa</label>
                    {gerando.avulso && (
                      <div className="grid sm:grid-cols-3 gap-2">
                        <label>Nome<input className={campo + ' mt-1'} value={gerando.nome} onChange={(e) => setGerando({ ...gerando, nome: e.target.value })} /></label>
                        <label>CPF ou CNPJ<input className={campo + ' mt-1'} value={gerando.documento} onChange={(e) => setGerando({ ...gerando, documento: e.target.value })} inputMode="numeric" /></label>
                        <label>E-mail (opcional)<input className={campo + ' mt-1'} value={gerando.email} onChange={(e) => setGerando({ ...gerando, email: e.target.value })} /></label>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Btn onClick={() => gerarCobranca(l.id, gerando.parcela, gerando.avulso ? { nome: gerando.nome, documento: gerando.documento, email: gerando.email } : undefined)} off={ocupado === l.id}>Gerar link (Pix, boleto ou cartão)</Btn>
                      <BotaoTikpag pronto={tikpagPronto} off={ocupado === l.id} onClick={() => gerarCobranca(l.id, gerando.parcela, gerando.avulso ? { nome: gerando.nome, documento: gerando.documento, email: gerando.email } : undefined, 'tikpag')} />
                      <Btn suave onClick={() => setGerando(null)}>Fechar</Btn>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {l.tipo === 'pagar' && l.status === 'previsto' && <Btn onClick={() => acao(l.id, { acao: 'aprovar' })} off={ocupado === l.id}>Aprovar para pagar</Btn>}
                  {emAberto(l) && !(l.tipo === 'pagar' && l.status !== 'aprovado') && (
                    <Btn onClick={() => setPagando({ id: l.id, valor: String(saldoAberto(l)).replace('.', ','), data: hoje })} off={ocupado === l.id}>{l.tipo === 'receber' ? 'Marcar recebido' : 'Marcar pago'}</Btn>
                  )}
                  {l.tipo === 'receber' && l.status !== 'cancelado' && (
                    <Btn suave onClick={() => setAtribuindo({ id: l.id, prestador_id: pagarDoOrcamento[l.orcamento_id]?.prestador_id || '', valor: pagarDoOrcamento[l.orcamento_id] ? String(pagarDoOrcamento[l.orcamento_id].valor).replace('.', ',') : '' })}>
                      {pagarDoOrcamento[l.orcamento_id] ? 'Alterar prestador' : 'Atribuir prestador'}
                    </Btn>
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

                {atribuindo?.id === l.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 bg-papel rounded p-3">
                    <label className="text-xs">Prestador
                      <select className={campo + ' mt-1'} value={atribuindo.prestador_id} onChange={(e) => setAtribuindo({ ...atribuindo, prestador_id: e.target.value })}>
                        <option value="">—</option>{prestadores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    </label>
                    <label className="text-xs">Valor que ele cobra (R$)<input className={campo + ' mt-1'} value={atribuindo.valor} onChange={(e) => setAtribuindo({ ...atribuindo, valor: e.target.value })} inputMode="decimal" /></label>
                    <Btn onClick={() => acao(l.id, { acao: 'atribuir', prestador_id: atribuindo.prestador_id, valor: atribuindo.valor })} off={ocupado === l.id}>Salvar</Btn>
                    <Btn suave onClick={() => setAtribuindo(null)}>Fechar</Btn>
                  </div>
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


function PainelHoje({ pendentes, nomeDoOrc, aprovar, vencidosReceber, vencidosPagar, ir }) {
  const itens = [
    pendentes.length > 0 && { k: 'c', t: `${pendentes.length} comprovante${pendentes.length > 1 ? 's' : ''} para conferir`, d: pendentes.slice(0, 2).map((c) => nomeDoOrc(c.orcamento_id)).join(' · '), a: () => ir('receber', 'conferir'), cor: 'text-amber-700' },
    aprovar.length > 0 && { k: 'p', t: `${aprovar.length} pagamento${aprovar.length > 1 ? 's' : ''} ao prestador liberado${aprovar.length > 1 ? 's' : ''} (cliente já pagou)`, d: 'Dinheiro entrou: aprove para pagar', a: () => ir('pagar', 'liberados'), cor: 'text-marinho' },
    vencidosReceber.length > 0 && { k: 'vr', t: `${vencidosReceber.length} recebimento${vencidosReceber.length > 1 ? 's' : ''} vencido${vencidosReceber.length > 1 ? 's' : ''}`, d: '', a: () => ir('receber', 'vencidos'), cor: 'text-red-700' },
    vencidosPagar.length > 0 && { k: 'vp', t: `${vencidosPagar.length} conta${vencidosPagar.length > 1 ? 's' : ''} a pagar vencida${vencidosPagar.length > 1 ? 's' : ''}`, d: '', a: () => ir('pagar', 'vencidos'), cor: 'text-red-700' },
  ].filter(Boolean);
  return (
    <div className="card p-4 mb-6 border-l-4 border-l-accent">
      <div className="flex items-center gap-2 font-semibold text-sm mb-2"><FileCheck2 size={18} /> Precisa de você hoje</div>
      {itens.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-verde"><CheckCircle2 size={18} /> Tudo em dia. Nada esperando por você.</div>
      ) : (
        <div className="space-y-1">
          {itens.map((i) => (
            <button key={i.k} onClick={i.a} className="w-full text-left flex flex-wrap items-baseline gap-2 py-1.5 border-b border-linha last:border-0 hover:bg-papel">
              <span className={`text-sm font-semibold ${i.cor}`}>{i.t}</span>
              {i.d && <span className="text-xs text-marinho/60">{i.d}</span>}
              <span className="ml-auto text-xs text-marinho/50">ver →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PorOrcamento({ lancamentos, pagarDoOrcamento }) {
  const todas = lancamentos
    .filter((l) => l.tipo === 'receber' && l.orcamento_id && l.status !== 'cancelado' && l.status !== 'pago')
    .map((l) => {
      const valor = Number(l.valor) || 0;
      const pago = Number(l.valor_pago) || 0;
      const [num, ...resto] = String(l.descricao || '').replace(/^Orçamento\s*/, '').split(/\s+[—–]\s+/);
      return { l, valor, pago, falta: Math.max(0, valor - pago), pct: valor > 0 ? Math.min(100, Math.round((pago / valor) * 100)) : 0, num: resto.length ? num : '', endereco: resto.length ? resto.join(' — ') : num };
    })
    .sort((x, y) => y.falta - x.falta);
  const linhas = todas.slice(0, 6);
  const totalFalta = todas.reduce((t, x) => t + x.falta, 0);
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-marinho">Obras em andamento</h3>
        <p className="mt-0.5 text-xs text-marinho/60">
          {todas.length === 0 ? 'Nada em aberto.' : <>Falta receber <b className="text-marinho">{fmtBRL(totalFalta)}</b> em {todas.length} orçamento{todas.length > 1 ? 's' : ''}</>}
        </p>
      </div>
      {linhas.length === 0 ? <p className="text-sm text-marinho/60">Nenhum orçamento com valor em aberto.</p> : (
        <ul className="divide-y divide-linha">
          {linhas.map(({ l, valor, pago, falta, pct, num, endereco }) => {
            const p = pagarDoOrcamento[l.orcamento_id];
            return (
              <li key={l.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {num && <div className="text-[11px] font-semibold tracking-wide text-marinho/45">{num}</div>}
                    <div className="truncate text-sm font-semibold text-marinho" title={endereco}>{endereco}</div>
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-marinho">{fmtBRL(falta)}</div>
                    <div className="text-[11px] text-marinho/50">falta receber</div>
                  </div>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-marinho/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-verde" style={{ width: `${pago > 0 ? Math.max(pct, 3) : 0}%` }} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-marinho/60">
                  <span>Recebido {fmtBRL(pago)} de {fmtBRL(valor)} · {pct}%</span>
                  {p
                    ? <span>{p.prestadores?.nome || 'Prestador'} {fmtBRL(p.valor)} · margem {fmtBRL(valor - Number(p.valor))}</span>
                    : <span className="rounded-full bg-alerta/15 px-2 py-0.5 font-semibold text-alerta">Sem prestador</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {todas.length > linhas.length && <p className="mt-3 text-[11px] text-marinho/50">Mais {todas.length - linhas.length} em aberto. A lista completa está logo abaixo, em "A receber".</p>}
    </div>
  );
}

function Proximos30({ lancamentos, hoje }) {
  const fim = somarDias(hoje, 30);
  const faixas = [0, 1, 2, 3].map((i) => ({ de: somarDias(hoje, i * 7 + (i ? 1 : 0)), ate: i === 3 ? fim : somarDias(hoje, i * 7 + 7), rot: i === 0 ? 'Esta semana' : i === 3 ? 'Dias 22 a 30' : `Dias ${i * 7 + 1} a ${i * 7 + 7}`, ent: 0, sai: 0 }));
  lancamentos.filter(emAberto).forEach((l) => {
    const venc = l.vencimento < hoje ? hoje : l.vencimento;
    const f = faixas.find((x) => venc >= x.de && venc <= x.ate);
    if (!f) return;
    if (l.tipo === 'receber') f.ent += saldoAberto(l); else f.sai += saldoAberto(l);
  });
  const max = Math.max(1, ...faixas.map((f) => Math.max(f.ent, f.sai)));
  const totEnt = faixas.reduce((t, f) => t + f.ent, 0);
  const totSai = faixas.reduce((t, f) => t + f.sai, 0);
  const saldo = totEnt - totSai;
  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-marinho">Próximos 30 dias</h3>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-verde/10 px-3 py-2"><div className="text-[11px] font-semibold text-verde">Entra</div><div className="text-sm font-semibold text-marinho">{fmtBRL(totEnt)}</div></div>
        <div className="rounded-lg bg-marinho/10 px-3 py-2"><div className="text-[11px] font-semibold text-marinho/70">Sai</div><div className="text-sm font-semibold text-marinho">{fmtBRL(totSai)}</div></div>
        <div className={`rounded-lg px-3 py-2 ${saldo < 0 ? 'bg-erro/10' : 'bg-sucesso/10'}`}><div className={`text-[11px] font-semibold ${saldo < 0 ? 'text-erro' : 'text-sucesso'}`}>Saldo</div><div className="text-sm font-semibold text-marinho">{fmtBRL(saldo)}</div></div>
      </div>
      <ul className="mt-4 space-y-3">
        {faixas.map((f) => {
          const vazio = f.ent === 0 && f.sai === 0;
          return (
            <li key={f.rot} className="grid grid-cols-[88px_1fr] items-center gap-3">
              <div className={`text-xs font-semibold ${vazio ? 'text-marinho/35' : 'text-marinho'}`}>{f.rot}</div>
              {vazio ? <div className="text-[11px] text-marinho/35">Sem movimento</div> : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 rounded-full bg-marinho/5"><div className="h-full rounded-full bg-verde" style={{ width: `${f.ent > 0 ? Math.max((f.ent / max) * 100, 2) : 0}%` }} /></div>
                    <span className="w-24 text-right text-[11px] font-medium text-verde">{f.ent > 0 ? `+ ${fmtBRL(f.ent)}` : '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 rounded-full bg-marinho/5"><div className="h-full rounded-full bg-marinho" style={{ width: `${f.sai > 0 ? Math.max((f.sai / max) * 100, 2) : 0}%` }} /></div>
                    <span className="w-24 text-right text-[11px] font-medium text-marinho">{f.sai > 0 ? `− ${fmtBRL(f.sai)}` : '—'}</span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11px] text-marinho/45">Atrasados entram em "Esta semana". Verde = entra, azul = sai.</p>
    </div>
  );
}


// "Pague com o TikPag". O logo é o arquivo public/tikpag-logo.png (se faltar, aparece o nome em texto).
function BotaoTikpag({ pronto, off, onClick }) {
  const [semLogo, setSemLogo] = useState(false);
  return (
    <button type="button" onClick={pronto ? onClick : undefined} disabled={!pronto || off}
      title={pronto ? 'Pagar com cartão pelo TikPag' : 'TikPag: aguardando a documentação do checkout'}
      className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded border border-linha bg-white text-marinho disabled:opacity-60">
      <span>Pague com o</span>
      {semLogo
        ? <span className="font-bold tracking-tight">TikPag</span>
        : <img src="/tikpag-logo.png" alt="TikPag" height="16" style={{ height: 16, width: 'auto' }} onError={() => setSemLogo(true)} />}
      {!pronto && <span className="text-[10px] font-normal text-marinho/50">(em breve)</span>}
    </button>
  );
}
