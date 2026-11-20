'use client';
import { useState } from 'react';

const inp = 'w-full rounded-lg border border-linha px-3 py-2 text-sm bg-white';
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

export default function ReciboForm() {
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
    } finally { setBusy(false); }
  }
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
    </section>
  );
}
