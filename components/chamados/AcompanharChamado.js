'use client';
import { useCallback, useEffect, useState } from 'react';
import MensagensChamado from './MensagensChamado';
import EnviarMensagem from './EnviarMensagem';
import { COR_STATUS_CHAMADO } from '@/lib/chamadosTextos';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

export default function AcompanharChamado({ token }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [decidindo, setDecidindo] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/chamados/externo/${token}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j.error || 'Link inválido.'); return; }
      setDados(j); setErro('');
    } catch (e) {}
  }, [token]);

  useEffect(() => { carregar(); const t = setInterval(carregar, 20000); return () => clearInterval(t); }, [carregar]);

  async function decidir(decisao) {
    if (!confirm(decisao === 'aprovado' ? 'Confirmar a APROVAÇÃO do orçamento?' : 'Confirmar que você RECUSA o orçamento?')) return;
    setDecidindo(true);
    const r = await fetch(`/api/chamados/externo/${token}/aprovar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisao }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) alert(j.error || 'Não foi possível registrar.');
    setDecidindo(false); carregar();
  }

  if (erro) return <div className="bg-white border border-linha rounded-lg p-8 text-center text-marinho">{erro}</div>;
  if (!dados) return <div className="text-center text-marinho/60 py-10">Carregando…</div>;
  const { chamado: c, mensagens, orcamento: o } = dados;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-linha rounded-lg p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-marinho/50">{c.numero} · {c.imobiliaria}</div>
            <h1 className="font-slab text-2xl font-bold text-marinho">{c.titulo}</h1>
          </div>
          <span className={`text-sm font-semibold rounded-full px-3 py-1 ${COR_STATUS_CHAMADO[c.status] || ''}`}>{c.status_rotulo}</span>
        </div>
        <p className="text-sm text-marinho/70 mt-2">📍 {c.endereco}</p>
        <p className="text-sm text-marinho mt-2 whitespace-pre-wrap">{c.descricao}</p>
        <p className="text-xs text-marinho/50 mt-2">Aberto em {fmtDataHoraSP(c.criado_em)}</p>
      </div>

      {o && (
        <div className="bg-white border-2 border-marinho/30 rounded-lg p-5">
          <h2 className="font-slab text-xl font-bold text-marinho">Orçamento {o.numero}</h2>
          <ul className="mt-2 text-sm text-marinho list-disc pl-5 space-y-0.5">
            {o.itens.map((it, i) => <li key={i}><strong>{it.ambiente}</strong> — {it.servico}</li>)}
          </ul>
          <div className="mt-3 text-2xl font-bold text-marinho">{fmtBRL(o.total)}</div>
          <p className="text-xs text-marinho/60">{o.forma_pagamento} · válido por {o.validade_dias} dias</p>
          {o.pode_responder ? (
            <div className="flex gap-2 mt-4 flex-wrap">
              <button disabled={decidindo} onClick={() => decidir('aprovado')} className="bg-sucesso text-white font-semibold rounded-md px-5 py-2 disabled:opacity-50">Aprovar orçamento</button>
              <button disabled={decidindo} onClick={() => decidir('rejeitado')} className="border border-erro text-erro font-semibold rounded-md px-5 py-2 disabled:opacity-50">Recusar</button>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold text-marinho">{o.status === 'rejeitado' ? 'Orçamento recusado.' : o.status === 'enviado' ? 'Resposta já registrada.' : 'Orçamento aprovado.'}</p>
          )}
        </div>
      )}

      <div className="bg-white border border-linha rounded-lg p-5">
        <h2 className="font-slab text-lg font-bold text-marinho mb-2">Conversa e histórico</h2>
        <MensagensChamado mensagens={mensagens} meuTipo="externo" />
        <EnviarMensagem url={`/api/chamados/externo/${token}/mensagem`} onEnviado={carregar} />
      </div>
    </div>
  );
}
