'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

export default function AvisosList({ solicitacoes = [], visitas, atrasos, mensagens }) {
  const [vistos, setVistos] = useState({});

  useEffect(() => {
    try {
      setVistos(JSON.parse(localStorage.getItem('fixin_avisos_vistos') || '{}'));
    } catch (e) {
      setVistos({});
    }
  }, []);

  function dispensar(key) {
    setVistos((v) => {
      const novo = { ...v, [key]: true };
      try {
        localStorage.setItem('fixin_avisos_vistos', JSON.stringify(novo));
        window.dispatchEvent(new Event('fixin-avisos'));
      } catch (e) {}
      return novo;
    });
  }

  const solicitacoesVisiveis = (solicitacoes || []).filter((s) => !vistos[s.key]);
  const visitasVisiveis = (visitas || []).filter((v) => !vistos[v.key]);
  const atrasosVisiveis = (atrasos || []).filter((a) => !vistos[a.key]);
  const mensagensVisiveis = (mensagens || []).filter((m) => !vistos[m.key]);

  if (solicitacoesVisiveis.length === 0 && visitasVisiveis.length === 0 && atrasosVisiveis.length === 0 && mensagensVisiveis.length === 0) {
    return <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum aviso no momento. Tudo em dia.</div>;
  }

  return (
    <div>
      {solicitacoesVisiveis.length > 0 && (
        <>
          <h2 className="font-semibold text-xl mb-2">Novos orçamentos solicitados</h2>
          {solicitacoesVisiveis.map((s) => (
            <div key={s.key} className="card p-4 mb-3 border-l-4 border-l-marinho">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-marinho text-white">Novo</span>
                    <span className="text-[11px] font-mono text-marinho/50">{s.subtitulo}</span>
                    {s.criado_em && <span className="text-[11px] text-marinho/50">· {fmtDataHoraSP(s.criado_em)}</span>}
                  </div>
                  <div className="font-semibold text-lg mt-1">{s.titulo}</div>
                  <div className="text-xs text-marinho/60 mt-0.5">{s.detalhe}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <Link href={s.link} className="bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-2">Abrir e orçar</Link>
                  <button type="button" onClick={() => dispensar(s.key)} className="text-xs text-marinho/50 underline">dispensar aviso</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {mensagensVisiveis.length > 0 && (
        <>
          <h2 className="font-semibold text-xl mb-2 mt-5">Novas mensagens no chat</h2>
          {mensagensVisiveis.map((m) => (
            <div key={m.key} onClick={() => dispensar(m.key)} className="card p-4 mb-3 cursor-pointer border-l-4 border-l-info">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-mono text-marinho/50">{m.subtitulo}</div>
                {m.criado_em && <div className="text-[11px] font-semibold text-marinho/60">{fmtDataHoraSP(m.criado_em)}</div>}
              </div>
              <div className="font-semibold">{m.titulo}</div>
              <div className="text-xs text-marinho/60 mt-1">{m.detalhe}</div>
              <div className="text-xs text-marinho/50 mt-1.5">
                <Link href={m.link} className="underline" onClick={(e) => e.stopPropagation()}>
                  Abrir conversa
                </Link>{' '}
                · clique aqui para dispensar
              </div>
            </div>
          ))}
        </>
      )}
      {visitasVisiveis.length > 0 && (
        <>
          <h2 className="font-semibold text-xl mb-2 mt-5">Visitas aguardando aprovação</h2>
          {visitasVisiveis.map((v) => (
            <div key={v.key} onClick={() => dispensar(v.key)} className="card p-4 mb-3 cursor-pointer border-l-4 border-l-alerta">
              <div className="font-semibold">{v.titulo}</div>
              <div className="text-xs text-marinho/50">
                {v.subtitulo} {v.detalhe ? `· ${v.detalhe}` : ''}
              </div>
              <div className="text-xs text-marinho/50 mt-1.5">
                <Link href={v.link} className="underline" onClick={(e) => e.stopPropagation()}>
                  Abrir
                </Link>{' '}
                · clique aqui para dispensar
              </div>
            </div>
          ))}
        </>
      )}
      {atrasosVisiveis.length > 0 && (
        <>
          <h2 className="font-semibold text-xl mb-2 mt-5">Pagamentos em atraso</h2>
          {atrasosVisiveis.map((a) => (
            <div key={a.key} onClick={() => dispensar(a.key)} className="card p-4 mb-3 cursor-pointer border-l-4 border-l-erro">
              <div className="flex justify-between">
                <div>
                  <div className="text-[11px] font-mono text-marinho/50">{a.subtitulo}</div>
                  <div className="font-semibold">{a.titulo}</div>
                  <div className="text-xs text-marinho/50">{a.detalhe}</div>
                </div>
                {a.valor != null && <div className="text-erro font-mono text-sm font-semibold">{fmtBRL(a.valor)} pendente</div>}
              </div>
              <div className="text-xs text-marinho/50 mt-1.5">
                <Link href={a.link} className="underline" onClick={(e) => e.stopPropagation()}>
                  Abrir orçamento
                </Link>{' '}
                · clique aqui para dispensar
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
