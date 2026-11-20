'use client';
import { useState } from 'react';

const inp = 'w-full rounded-lg border border-linha px-3 py-2 text-sm bg-white';
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

import { useRouter } from 'next/navigation';

export default function ReciboForm({ historico = [] }) {
  const router = useRouter();
  const [f, setF] = useState({ titulo: 'RECIBO DE VALOR RECEBIDO - MANUTENÇÃO', recebedor: 'Fixin Reformas', pagador: '', valor: '', descricao: 'ao reparo na fiação elétrica', detalhe: 'rompimento do cabo', data: hoje(), cidade: 'Sorocaba', empresa: 'Fixin Gestão de Serviços Imobiliarios LTDA', endereco: 'Rua Miranda Azevedo 304, centro - Sorocaba' });
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function gerar() {
    setBusy(true); setErro('');
    try {
      const r = await fetch('/api/recibos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErro(j.error || 'Não foi possível gerar.'); return; }
      const url = URL.createObjectURL(await r.blob());
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      router.refresh();
    } finally { setBusy(false); }
  }
  async function reabrir(id) {
    const r = await fetch('/api/recibos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reabrir: id }) });
    if (!r.ok) { setErro('Não foi possível abrir.'); return; }
    window.open(URL.createObjectURL(await r.blob()), '_blank');
  }
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const campo = (k, l, extra = '') => <div className={extra}><label className="text-xs text-gray-600">{l}</label><input className={inp} value={f[k]} onChange={set(k)} /></div>;
  return (
    <section className="card p-4 mt-4 space-y-3">
      <h2 className="font-semibold text-marinho">Gerar recibo</h2>
      <p className="text-xs text-gray-500">O valor por extenso sai sozinho. O texto fica: &quot;A empresa … recebeu o valor de R$ … (extenso), correspondente a … (destaque).&quot;</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {campo('titulo', 'Título', 'sm:col-span-2')}
        {campo('valor', 'Valor (R$)')}
        <div><label className="text-xs text-gray-600">Data</label><input type="date" className={inp} value={f.data} onChange={set('data')} /></div>
        {campo('recebedor', 'Quem recebeu (empresa)')}
        {campo('pagador', 'Recebido de (opcional)')}
        {campo('descricao', 'Correspondente a… (ex.: ao reparo na fiação elétrica)', 'sm:col-span-2')}
        {campo('detalhe', 'Destaque entre parênteses, em negrito (opcional)', 'sm:col-span-2')}
        {campo('cidade', 'Cidade')}
        {campo('empresa', 'Razão social (assinatura)')}
        {campo('endereco', 'Endereço', 'sm:col-span-2')}
      </div>
      {erro && <div className="text-sm text-red-700">{erro}</div>}
      <button onClick={gerar} disabled={busy} className="rounded-full px-5 py-2 text-sm font-semibold bg-marinho text-white disabled:opacity-50">{busy ? 'Gerando…' : 'Gerar recibo em PDF'}</button>
      <div className="border-t border-linha pt-4 mt-2">
        <h3 className="font-semibold text-marinho mb-2">Últimos 30 dias</h3>
        {historico.length === 0 ? <p className="text-sm text-gray-500">Nenhum recibo gerado ainda.</p> : (
          <div className="divide-y divide-linha">
            {historico.map((h) => (
              <div key={h.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-marinho">{brl(h.valor)} · {h.dados?.descricao || h.dados?.titulo}{h.dados?.detalhe ? ` (${h.dados.detalhe})` : ''}</div>
                  <div className="text-xs text-gray-500">{new Date(h.criado_em).toLocaleDateString('pt-BR')}{h.dados?.pagador ? ` · ${h.dados.pagador}` : ''}</div>
                </div>
                <button type="button" onClick={() => reabrir(h.id)} className="rounded-full px-4 py-1.5 text-sm font-medium border border-linha bg-white text-marinho hover:border-marinho">Abrir PDF</button>
                <button type="button" onClick={() => setF({ ...f, ...h.dados, valor: String(h.dados.valor).replace('.', ','), data: hoje() })} className="rounded-full px-4 py-1.5 text-sm font-medium border border-linha bg-white text-marinho hover:border-marinho">Usar como base</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
