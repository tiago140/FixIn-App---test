'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';
const ORIGENS = [
  ['visita', 'Visita'], ['chamado', 'Chamado'], ['orcamento', 'Orçamento'], ['avulsa', 'Avulsa'],
];

export default function NovaOrdemForm({ prestadores, visitas, chamados, orcamentos, clientes, inicial = {} }) {
  const router = useRouter();
  const [f, setF] = useState({
    prestador_id: inicial.prestador_id || '', origem: inicial.origem || 'visita',
    visita_id: inicial.visita_id || '', chamado_id: inicial.chamado_id || '', orcamento_id: inicial.orcamento_id || '',
    cliente_id: '', endereco: '', descricao: '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (c) => (e) => setF((x) => ({ ...x, [c]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setSalvando(true);
    const res = await fetch('/api/ordens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const data = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) return setErro(data.error || 'Erro ao criar a ordem');
    router.push(`/master/ordens/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="card p-5 rounded-xl max-w-2xl space-y-4">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
      <label className="block">
        <span className="block text-xs font-semibold text-marinho/70 mb-1">Prestador</span>
        <select required value={f.prestador_id} onChange={set('prestador_id')} className={ent}>
          <option value="">Escolha…</option>
          {prestadores.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.tem_acesso ? '' : ' (sem acesso ao portal)'}</option>)}
        </select>
      </label>

      <div>
        <span className="block text-xs font-semibold text-marinho/70 mb-1">De onde vem a ordem</span>
        <div className="flex flex-wrap gap-2">
          {ORIGENS.map(([v, r]) => (
            <button key={v} type="button" onClick={() => setF((x) => ({ ...x, origem: v }))}
              className={`px-3 py-1.5 rounded-full text-sm border ${f.origem === v ? 'bg-marinho text-white border-marinho' : 'border-linha hover:bg-papel'}`}>{r}</button>
          ))}
        </div>
      </div>

      {f.origem === 'visita' && (
        <select required value={f.visita_id} onChange={set('visita_id')} className={ent}>
          <option value="">Escolha a visita…</option>
          {visitas.map((v) => <option key={v.id} value={v.id}>{v.rotulo}</option>)}
        </select>
      )}
      {f.origem === 'chamado' && (
        <select required value={f.chamado_id} onChange={set('chamado_id')} className={ent}>
          <option value="">Escolha o chamado…</option>
          {chamados.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
        </select>
      )}
      {f.origem === 'orcamento' && (
        <>
          <select required value={f.orcamento_id} onChange={set('orcamento_id')} className={ent}>
            <option value="">Escolha o orçamento…</option>
            {orcamentos.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
          </select>
          <p className="text-xs text-marinho/50">Os itens e valores do orçamento (custo do prestador) vão junto na ordem. Se o orçamento já está aprovado, a ordem sai liberada para execução.</p>
        </>
      )}
      {f.origem === 'avulsa' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <select value={f.cliente_id} onChange={set('cliente_id')} className={ent}>
            <option value="">Imobiliária (opcional)</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
          </select>
          <input required value={f.endereco} onChange={set('endereco')} placeholder="Endereço do serviço" className={ent} />
        </div>
      )}

      <label className="block">
        <span className="block text-xs font-semibold text-marinho/70 mb-1">Instruções para o prestador (opcional)</span>
        <textarea rows={4} value={f.descricao} onChange={set('descricao')} className={ent} placeholder="O que precisa ser visto ou feito, contato no local, horários…" />
      </label>

      <button disabled={salvando} className="bg-verde text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
        {salvando ? 'Enviando…' : 'Enviar para o prestador'}
      </button>
    </form>
  );
}
