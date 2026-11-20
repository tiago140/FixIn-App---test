'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ROT = { SCHEDULED: ['Agendada', 'bg-amber-100 text-amber-800'], SYNCHRONIZED: ['Na prefeitura', 'bg-amber-100 text-amber-800'], AUTHORIZED: ['Emitida', 'bg-emerald-100 text-emerald-800'], ERROR: ['Erro', 'bg-red-100 text-red-800'], ERRO: ['Erro', 'bg-red-100 text-red-800'], PROCESSING_CANCELLATION: ['Cancelando', 'bg-amber-100 text-amber-800'], CANCELED: ['Cancelada', 'bg-gray-200 text-gray-700'], CANCELLATION_DENIED: ['Cancelamento negado', 'bg-red-100 text-red-800'] };
const inp = 'w-full rounded-lg border border-linha px-3 py-2 text-sm bg-white';
const btn = 'rounded-full px-4 py-1.5 text-sm font-medium border border-linha bg-white text-marinho hover:border-marinho disabled:opacity-50';
const btnP = 'rounded-full px-5 py-2 text-sm font-semibold bg-marinho text-white disabled:opacity-50';

async function chamar(corpo) {
  const r = await fetch('/api/nfse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  return r.json().catch(() => ({ error: 'Falha de rede.' }));
}

export default function NotasFiscais({ cfg, opcoes, notas, ambiente, orcInicial }) {
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [c, setC] = useState({ nf_ativo: false, nf_retem_iss: false, ...cfg });
  const [orc, setOrc] = useState(opcoes.some((o) => o.id === orcInicial) ? orcInicial : '');
  const o = opcoes.find((x) => x.id === orc);
  const [t, setT] = useState({});
  const [valor, setValor] = useState('');
  const [desc, setDesc] = useState('');

  function escolher(id) {
    setOrc(id); setMsg(null);
    const x = opcoes.find((y) => y.id === id);
    setT(x?.tomador || { nome: x?.cliente || '' }); setValor(x ? String(x.mo.toFixed(2)).replace('.', ',') : ''); setDesc('');
  }
  async function rodar(fn) { setBusy(true); setMsg(null); try { await fn(); } finally { setBusy(false); } }
  const salvarCfg = () => rodar(async () => { const r = await chamar({ acao: 'config', ...c }); setMsg(r.ok ? { ok: 'Configuração salva.' } : { erro: r.error }); if (r.ok) router.refresh(); });
  const emitir = () => rodar(async () => {
    const r = await chamar({ acao: 'emitir', orcamento_id: orc, tomador: t, valor, descricao: desc });
    if (r.ja_tem && confirm(r.error + '\n\nEmitir outra mesmo assim?')) { const r2 = await chamar({ acao: 'emitir', orcamento_id: orc, tomador: t, valor, descricao: desc, confirmar_outra: true }); return fim(r2); }
    fim(r);
  });
  function fim(r) { if (r.ok) { setMsg({ ok: 'Nota pedida. A prefeitura responde em instantes; use "Atualizar".' }); setOrc(''); router.refresh(); } else { setMsg({ erro: r.error || 'Não foi possível emitir.' }); router.refresh(); } }
  const acao = (a, id) => rodar(async () => { if (a === 'cancelar' && !confirm('Cancelar esta nota fiscal?')) return; const r = await chamar({ acao: a, id }); setMsg(r.error ? { erro: r.error } : { ok: a === 'atualizar' ? `Atualizado (${r.mudou ?? 0} mudança(s)).` : a === 'cancelar' ? 'Cancelamento pedido.' : 'Pedido enviado.' }); router.refresh(); });

  const pronto = c.nf_ativo && c.nf_servico_nome && (c.nf_servico_id || c.nf_servico_codigo);
  const setCt = (k) => (e) => setC({ ...c, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setTt = (k) => (e) => setT({ ...t, [k]: e.target.value });

  return (
    <div className="space-y-6 mt-4">
      {msg && <div className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{msg.ok || msg.erro}</div>}
      {ambiente === 'producao' && <div className="rounded-lg bg-amber-50 text-amber-900 text-sm px-4 py-2">O Asaas está em <b>produção</b>: nota emitida aqui vale de verdade e vai para a prefeitura. Só ligue a emissão depois que o contador confirmar os códigos fiscais.</div>}

      <section className="card p-4">
        <h2 className="font-semibold text-marinho mb-3">Emitir nota (só mão de obra)</h2>
        {!pronto && <p className="text-sm text-gray-600 mb-3">Antes de emitir, preencha e ligue a configuração abaixo.</p>}
        <select className={inp} value={orc} onChange={(e) => escolher(e.target.value)} disabled={!pronto}>
          <option value="">Escolha o orçamento aprovado…</option>
          {opcoes.map((x) => <option key={x.id} value={x.id}>{x.numero} · {x.cliente} · {x.endereco}</option>)}
        </select>
        {o && (
          <div className="mt-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-emerald-50 p-3"><div className="text-gray-600">NFS-e (mão de obra)</div><div className="text-lg font-bold text-marinho">{brl(o.mo)}</div></div>
              <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-600">Material · NF-e de produto</div><div className="text-lg font-bold text-gray-700">{brl(o.ma)}</div><div className="text-xs text-gray-500">fora desta nota</div></div>
              <div><label className="text-gray-600">Valor da nota (até {brl(o.mo)})</label><input className={inp} value={valor} onChange={(e) => setValor(e.target.value)} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-600">Tomador (nome / razão social)</label><input className={inp} value={t.nome || ''} onChange={setTt('nome')} /></div>
              <div><label className="text-xs text-gray-600">CPF ou CNPJ</label><input className={inp} value={t.cpf_cnpj || ''} onChange={setTt('cpf_cnpj')} /></div>
              <div><label className="text-xs text-gray-600">E-mail</label><input className={inp} value={t.email || ''} onChange={setTt('email')} /></div>
              <div><label className="text-xs text-gray-600">Telefone</label><input className={inp} value={t.telefone || ''} onChange={setTt('telefone')} /></div>
              <div><label className="text-xs text-gray-600">CEP *</label><input className={inp} value={t.cep || ''} onChange={setTt('cep')} /></div>
              <div><label className="text-xs text-gray-600">Rua *</label><input className={inp} value={t.endereco || ''} onChange={setTt('endereco')} /></div>
              <div><label className="text-xs text-gray-600">Número *</label><input className={inp} value={t.numero || ''} onChange={setTt('numero')} /></div>
              <div><label className="text-xs text-gray-600">Bairro</label><input className={inp} value={t.bairro || ''} onChange={setTt('bairro')} /></div>
            </div>
            <div><label className="text-xs text-gray-600">Descrição do serviço (opcional — se vazio, usa um texto padrão)</label><textarea className={inp} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <button className={btnP} disabled={busy} onClick={emitir}>{busy ? 'Enviando…' : 'Emitir NFS-e'}</button>
          </div>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold text-marinho">Notas emitidas</h2>
          <button className={btn} disabled={busy} onClick={() => acao('atualizar')}>Atualizar todas</button>
        </div>
        {notas.length === 0 ? <p className="text-sm text-gray-500">Nenhuma nota ainda.</p> : (
          <div className="divide-y divide-linha">
            {notas.map((n) => {
              const st = n.nota_fiscal?.status || 'ERRO'; const [rot, cor] = ROT[st] || [st, 'bg-gray-100 text-gray-700'];
              return (
                <div key={n.id} className="py-3 flex flex-wrap items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-marinho">{n.numero_orc || 'Orçamento'} · {n.tomador?.nome} · {brl(n.valor)}</div>
                    <div className="text-xs text-gray-500">{new Date(n.criado_em).toLocaleDateString('pt-BR')}{n.nota_fiscal?.numero ? ` · nº ${n.nota_fiscal.numero}` : ''}{n.nota_fiscal?.erro ? ` · ${n.nota_fiscal.erro}` : ''}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cor}`}>{rot}</span>
                  <div className="flex gap-2 flex-wrap">
                    {['ERROR', 'ERRO'].includes(st) && <button className={btn} disabled={busy} onClick={() => acao('emitir', n.id)}>Tentar de novo</button>}
                    {n.nota_fiscal?.id && <button className={btn} disabled={busy} onClick={() => acao('atualizar', n.id)}>Atualizar</button>}
                    {n.nota_fiscal?.pdf && <a className={btn} href={n.nota_fiscal.pdf} target="_blank" rel="noreferrer">PDF</a>}
                    {n.nota_fiscal?.xml && <a className={btn} href={n.nota_fiscal.xml} target="_blank" rel="noreferrer">XML</a>}
                    {!['CANCELED', 'PROCESSING_CANCELLATION'].includes(st) && n.nota_fiscal?.id && <button className={btn} disabled={busy} onClick={() => acao('cancelar', n.id)}>Cancelar</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-marinho mb-1">Configuração fiscal</h2>
        <p className="text-xs text-gray-500 mb-3">Estes códigos vêm do contador. Ative a nota fiscal no Asaas e confira a série do DPS antes de ligar.</p>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={!!c.nf_ativo} onChange={setCt('nf_ativo')} /> Emissão ligada</label>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-600">Nome do serviço municipal</label><input className={inp} value={c.nf_servico_nome || ''} onChange={setCt('nf_servico_nome')} /></div>
          <div><label className="text-xs text-gray-600">Código do serviço municipal</label><input className={inp} value={c.nf_servico_codigo || ''} onChange={setCt('nf_servico_codigo')} /></div>
          <div><label className="text-xs text-gray-600">ID do serviço no Asaas (se tiver)</label><input className={inp} value={c.nf_servico_id || ''} onChange={setCt('nf_servico_id')} /></div>
          <div><label className="text-xs text-gray-600">Observações padrão</label><input className={inp} value={c.nf_obs || ''} onChange={setCt('nf_obs')} /></div>
          {[['nf_iss', 'ISS %'], ['nf_cofins', 'COFINS %'], ['nf_csll', 'CSLL %'], ['nf_inss', 'INSS %'], ['nf_ir', 'IR %'], ['nf_pis', 'PIS %'], ['nf_nbs', 'NBS'], ['nf_cst', 'CST'], ['nf_class_trib', 'Class. tributária'], ['nf_ind_op', 'Ind. operação']].map(([k, l]) => (
            <div key={k}><label className="text-xs text-gray-600">{l}</label><input className={inp} value={c[k] ?? ''} onChange={setCt(k)} /></div>
          ))}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!c.nf_retem_iss} onChange={setCt('nf_retem_iss')} /> Tomador retém ISS</label>
        </div>
        <button className={`${btnP} mt-4`} disabled={busy} onClick={salvarCfg}>Salvar configuração</button>
      </section>
    </div>
  );
}
