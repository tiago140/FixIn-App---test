'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PIX_TIPOS } from '@/lib/estornos';

const campo = 'w-full border border-linha rounded px-3 py-2 bg-papel';

export default function EstornoForm({ orcamentos = [] }) {
  const router = useRouter();
  const [f, setF] = useState({ orcamento_id: '', valor: '', motivo: '', favorecido: '', documento: '', pix_tipo: 'cpf', pix_chave: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setSalvando(true);
    try {
      const res = await fetch('/api/estornos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErro(d.error || 'Não foi possível enviar o pedido.'); return; }
      router.push('/imobiliaria/estornos'); router.refresh();
    } finally { setSalvando(false); }
  }

  return (
    <form onSubmit={enviar} className="card p-5 space-y-5 max-w-xl">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}

      <div>
        <div className="mb-2 text-sm font-bold text-marinho">1. De qual serviço é o estorno?</div>
        <select value={f.orcamento_id} onChange={set('orcamento_id')} className={campo}>
          <option value="">Não é de um orçamento específico</option>
          {orcamentos.map((o) => <option key={o.id} value={o.id}>{o.numero} · {o.endereco}</option>)}
        </select>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold text-marinho">2. Quanto e por quê?</div>
        <label className="block text-xs text-marinho/60 mb-1">Valor a estornar (R$)</label>
        <input inputMode="decimal" required value={f.valor} onChange={set('valor')} placeholder="0,00" className={`${campo} mb-3`} />
        <label className="block text-xs text-marinho/60 mb-1">Motivo do estorno</label>
        <textarea required rows={3} value={f.motivo} onChange={set('motivo')} placeholder="Explique o que aconteceu" className={campo} />
      </div>

      <div>
        <div className="mb-2 text-sm font-bold text-marinho">3. Para quem devolver (Pix)</div>
        <label className="block text-xs text-marinho/60 mb-1">Nome de quem vai receber</label>
        <input required value={f.favorecido} onChange={set('favorecido')} className={`${campo} mb-3`} />
        <label className="block text-xs text-marinho/60 mb-1">CPF ou CNPJ de quem vai receber (opcional)</label>
        <input value={f.documento} onChange={set('documento')} className={`${campo} mb-3`} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Tipo da chave</label>
            <select value={f.pix_tipo} onChange={set('pix_tipo')} className={campo}>
              {Object.entries(PIX_TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-marinho/60 mb-1">Chave Pix</label>
            <input required value={f.pix_chave} onChange={set('pix_chave')} className={campo} />
          </div>
        </div>
      </div>

      <div className="text-xs text-marinho/50">A FixIn analisa o pedido e responde por aqui e por e-mail. Se for aprovado, o pagamento é feito no Pix informado.</div>
      <button disabled={salvando} className="bg-verde text-white rounded px-4 py-2.5 text-sm font-semibold disabled:opacity-50 w-full">{salvando ? 'Enviando…' : 'Enviar pedido de estorno'}</button>
    </form>
  );
}
