'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
import { fmtBRL } from '@/lib/format';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';
const vazio = () => ({ ambiente: '', servico: '', descricao: '', mo: '', ma: '' });
const n = (v) => Number(String(v ?? '').replace(',', '.')) || 0;

// Aceite, recusa e envio de valores por item (mão de obra e material). Nunca mostra margem da FixIn.
export default function OrdemPrestadorAcoes({ os, itensIniciais = [] }) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [itens, setItens] = useState(itensIniciais.length ? itensIniciais.map((i) => ({ ambiente: i.ambiente || '', servico: i.servico, descricao: i.descricao || '', mo: String(i.mo ?? ''), ma: String(i.ma ?? '') })) : [vazio()]);

  async function enviar(corpo) {
    setErro(''); setOcupado(true);
    const res = await fetch(`/api/prestador/ordens/${os.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const data = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(data.error || 'Não foi possível concluir');
    setRecusando(false);
    router.refresh();
  }

  const set = (i, c) => (e) => setItens((l) => l.map((x, k) => (k === i ? { ...x, [c]: e.target.value } : x)));
  const total = itens.reduce((s, i) => s + n(i.mo) + n(i.ma), 0);

  return (
    <div className="space-y-4">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}

      {os.status === 'enviada' && !recusando && (
        <div className="card p-5 rounded-xl border-l-4 border-l-alerta">
          <h3 className="font-semibold mb-1">Você aceita esta ordem?</h3>
          <p className="text-sm text-marinho/60 mb-3">Ao aceitar, você vai ao local, tira as fotos e envia os valores por item.</p>
          <div className="flex gap-2">
            <button disabled={ocupado} onClick={() => enviar({ acao: 'aceitar' })} className="bg-verde text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><CheckCircle2 size={17} /> Aceitar</button>
            <button disabled={ocupado} onClick={() => setRecusando(true)} className="border border-linha rounded-lg px-5 py-2.5 text-sm flex items-center gap-2"><XCircle size={17} /> Recusar</button>
          </div>
        </div>
      )}

      {recusando && (
        <div className="card p-5 rounded-xl space-y-3">
          <h3 className="font-semibold">Motivo da recusa</h3>
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={ent} placeholder="Ex.: agenda cheia nessa semana, fora da minha região…" />
          <div className="flex gap-2">
            <button disabled={ocupado} onClick={() => enviar({ acao: 'recusar', motivo })} className="bg-erro text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">Confirmar recusa</button>
            <button onClick={() => setRecusando(false)} className="border border-linha rounded-lg px-4 py-2 text-sm">Voltar</button>
          </div>
        </div>
      )}

      {['aceita', 'orcada'].includes(os.status) && (
        <div className="card p-5 rounded-xl space-y-4">
          <div>
            <h3 className="font-semibold">Valores por item</h3>
            <p className="text-xs text-marinho/50">Informe quanto você cobra de mão de obra e de material em cada serviço. {os.status === 'orcada' ? 'Você pode ajustar enquanto a FixIn não aplicou ao orçamento.' : ''}</p>
          </div>
          {itens.map((it, i) => (
            <div key={i} className="border border-linha rounded-xl p-3 space-y-2 bg-papel/50">
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={it.ambiente} onChange={set(i, 'ambiente')} placeholder="Ambiente (ex.: Sala)" className={ent} />
                <input value={it.servico} onChange={set(i, 'servico')} placeholder="Serviço *" className={ent} />
              </div>
              <input value={it.descricao} onChange={set(i, 'descricao')} placeholder="Detalhes (opcional)" className={ent} />
              <div className="grid grid-cols-2 gap-2 items-end">
                <label className="text-xs text-marinho/60">Mão de obra (R$)<input inputMode="decimal" value={it.mo} onChange={set(i, 'mo')} className={`${ent} mt-1`} placeholder="0,00" /></label>
                <label className="text-xs text-marinho/60">Material (R$)<input inputMode="decimal" value={it.ma} onChange={set(i, 'ma')} className={`${ent} mt-1`} placeholder="0,00" /></label>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-marinho/60">Subtotal <b className="text-marinho font-mono">{fmtBRL(n(it.mo) + n(it.ma))}</b></span>
                {itens.length > 1 && <button type="button" onClick={() => setItens((l) => l.filter((_, k) => k !== i))} className="text-erro flex items-center gap-1 text-xs"><Trash2 size={14} /> Remover</button>}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setItens((l) => [...l, vazio()])} className="text-sm flex items-center gap-1 text-marinho font-semibold"><Plus size={16} /> Adicionar item</button>
          <div className="flex items-center justify-between border-t border-linha pt-3">
            <span className="text-sm text-marinho/60">Total que você está orçando</span>
            <span className="text-xl font-bold font-mono">{fmtBRL(total)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={ocupado} onClick={() => enviar({ acao: 'enviar_valores', itens })} className="bg-verde text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{ocupado ? 'Enviando…' : os.status === 'orcada' ? 'Reenviar valores' : 'Enviar valores'}</button>
            {os.status === 'aceita' && <button disabled={ocupado} onClick={() => setRecusando(true)} className="border border-linha rounded-lg px-4 py-2.5 text-sm">Desistir da ordem</button>}
          </div>
        </div>
      )}
    </div>
  );
}
