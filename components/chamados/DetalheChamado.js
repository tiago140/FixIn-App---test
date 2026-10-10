'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MensagensChamado from './MensagensChamado';
import EnviarMensagem from './EnviarMensagem';
import { STATUS_CHAMADO, PRIORIDADES, COR_STATUS_CHAMADO } from '@/lib/chamadosTextos';
import { fmtDataHoraSP } from '@/lib/format';

export default function DetalheChamado({ chamado: c, mensagens, meuTipo, orcamentoHref, empresa }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [link, setLink] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { const t = setInterval(() => router.refresh(), 20000); return () => clearInterval(t); }, [router]);

  async function patch(campos) {
    setOcupado(true);
    const r = await fetch(`/api/chamados/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campos) });
    const j = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) setMsg(j.error || 'Erro ao salvar.'); else { setMsg(''); router.refresh(); }
  }
  async function criarOrcamento() {
    setOcupado(true);
    const r = await fetch(`/api/chamados/${c.id}/orcamento`, { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) { setMsg(j.error || 'Erro ao criar orçamento.'); return; }
    router.push(`${orcamentoHref}/${j.id}`);
  }
  async function novoLink() {
    if (!confirm('Gerar um link novo? O link atual do solicitante deixa de funcionar.')) return;
    setOcupado(true);
    const r = await fetch(`/api/chamados/${c.id}/novo-link`, { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    setOcupado(false);
    if (r.ok) setLink(`${window.location.origin}/c/${j.token}`); else setMsg(j.error || 'Erro.');
  }

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-linha rounded-lg p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs text-marinho/50">{c.numero}{empresa ? ` · ${empresa}` : ''}</div>
              <h2 className="font-slab text-2xl font-bold text-marinho">{c.titulo}</h2>
            </div>
            <span className={`text-sm font-semibold rounded-full px-3 py-1 ${COR_STATUS_CHAMADO[c.status] || ''}`}>{STATUS_CHAMADO[c.status]}</span>
          </div>
          <p className="text-sm text-marinho/70 mt-2">📍 {c.endereco}</p>
          <p className="text-sm text-marinho mt-2 whitespace-pre-wrap">{c.descricao}</p>
          <p className="text-xs text-marinho/50 mt-2">Aberto em {fmtDataHoraSP(c.criado_em)}</p>
        </div>
        <div className="bg-white border border-linha rounded-lg p-5">
          <h3 className="font-slab text-lg font-bold text-marinho mb-2">Conversa com o solicitante</h3>
          <MensagensChamado mensagens={mensagens} meuTipo={meuTipo} />
          <EnviarMensagem url={`/api/chamados/${c.id}/mensagem`} onEnviado={() => router.refresh()} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-linha rounded-lg p-5 space-y-3">
          <div>
            <div className="text-xs font-semibold text-marinho/60">Solicitante</div>
            <div className="text-sm text-marinho">{c.solicitante_nome} ({c.solicitante_tipo === 'locador' ? 'locador' : 'locatário'})</div>
            {c.solicitante_telefone && <div className="text-sm text-marinho/70">📞 {c.solicitante_telefone}</div>}
            {c.solicitante_email && <div className="text-sm text-marinho/70 break-all">✉ {c.solicitante_email}</div>}
          </div>
          <div>
            <label className="text-xs font-semibold text-marinho/60">Status</label>
            <select disabled={ocupado} value={c.status} onChange={(e) => patch({ status: e.target.value })} className="w-full border border-linha rounded-md px-2 py-1.5 text-sm">
              {Object.entries(STATUS_CHAMADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-marinho/60">Prioridade</label>
            <select disabled={ocupado} value={c.prioridade || 'normal'} onChange={(e) => patch({ prioridade: e.target.value })} className="w-full border border-linha rounded-md px-2 py-1.5 text-sm">
              {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {c.orcamento_id ? (
            <Link href={`${orcamentoHref}/${c.orcamento_id}`} className="block text-center bg-marinho text-white font-semibold rounded-md px-3 py-2 text-sm">Abrir orçamento do chamado</Link>
          ) : (
            <button disabled={ocupado} onClick={criarOrcamento} className="w-full bg-marinho text-white font-semibold rounded-md px-3 py-2 text-sm disabled:opacity-50">Criar orçamento deste chamado</button>
          )}
          {c.aprovado_externo_em && <p className="text-sm text-sucesso font-semibold">Respondido por {c.aprovado_externo_nome} em {fmtDataHoraSP(c.aprovado_externo_em)}</p>}
          <button disabled={ocupado} onClick={novoLink} className="w-full border border-linha rounded-md px-3 py-2 text-sm hover:bg-fundo">Gerar novo link para o solicitante</button>
          {link && (
            <div className="text-xs break-all bg-fundo border border-linha rounded p-2">
              {link}
              <button onClick={() => navigator.clipboard?.writeText(link)} className="block underline mt-1">Copiar</button>
              <p className="text-erro mt-1">Mostrado só agora. Envie ao solicitante.</p>
            </div>
          )}
          {msg && <p className="text-sm text-erro">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
