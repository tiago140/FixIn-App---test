'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtBRL } from '@/lib/format';

export default function AvisosList({ visitas, atrasos, mensagens }) {
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
      } catch (e) {}
      return novo;
    });
  }

  const visitasVisiveis = (visitas || []).filter((v) => !vistos[v.key]);
  const atrasosVisiveis = (atrasos || []).filter((a) => !vistos[a.key]);
  const mensagensVisiveis = (mensagens || []).filter((m) => !vistos[m.key]);

  if (visitasVisiveis.length === 0 && atrasosVisiveis.length === 0 && mensagensVisiveis.length === 0) {
    return <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum aviso no momento. Tudo em dia.</div>;
  }

  return (
    <div>
      {mensagensVisiveis.length > 0 && (
        <>
          <h2 className="font-semibold text-sm mb-2">Novas mensagens no chat</h2>
          {mensagensVisiveis.map((m) => (
            <div key={m.key} onClick={() => dispensar(m.key)} className="card p-4 mb-3 cursor-pointer border-l-4 border-l-info">
              <div className="text-[11px] font-mono text-marinho/50">{m.subtitulo}</div>
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
          <h2 className="font-semibold text-sm mb-2 mt-5">Visitas aguardando aprovação</h2>
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
          <h2 className="font-semibold text-sm mb-2 mt-5">Pagamentos em atraso</h2>
          {atrasosVisiveis.map((a) => (
            <div key={a.key} onClick={() => dispensar(a.key)} className="card p-4 mb-3 cursor-pointer border-l-4 border-l-erro">
              <div className="flex justify-between">
                <div>
                  <div className="text-[11px] font-mono text-marinho/50">{a.subtitulo}</div>
                  <div className="font-semibold">{a.titulo}</div>
                  <div className="text-xs text-marinho/50">{a.detalhe}</div>
                </div>
                <div className="text-erro font-mono text-sm font-semibold">{fmtBRL(a.valor)} pendente</div>
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
