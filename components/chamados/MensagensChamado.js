'use client';
import { useEffect, useRef } from 'react';
import { fmtDataHoraSP } from '@/lib/format';

const ROTULO = { externo: 'Solicitante', imobiliaria: 'Imobiliária', fixin: 'FixIn', sistema: '' };

// Lista de mensagens (com fotos/arquivos). "meuTipo" decide de que lado aparece a mensagem.
export default function MensagensChamado({ mensagens, meuTipo }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [mensagens.length]);
  return (
    <div ref={ref} className="border border-linha rounded-lg bg-fundo/50 p-3 space-y-2 max-h-[420px] overflow-y-auto">
      {mensagens.length === 0 && <p className="text-sm text-marinho/50 text-center py-6">Nenhuma mensagem ainda.</p>}
      {mensagens.map((m) => {
        if (m.autor_tipo === 'sistema') {
          return <p key={m.id} className="text-center text-xs text-marinho/50">{m.texto} · {fmtDataHoraSP(m.criado_em)}</p>;
        }
        const minha = m.autor_tipo === meuTipo;
        return (
          <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${minha ? 'bg-marinho text-white' : 'bg-white border border-linha text-marinho'}`}>
              <div className={`text-[11px] mb-0.5 ${minha ? 'text-white/70' : 'text-marinho/50'}`}>{m.autor_nome} · {ROTULO[m.autor_tipo]} · {fmtDataHoraSP(m.criado_em)}</div>
              {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
              {m.anexo_url && (m.anexo_tipo || '').startsWith('image/') && (
                <a href={m.anexo_url} target="_blank" rel="noopener noreferrer"><img src={m.anexo_url} alt="Anexo" className="mt-1 rounded max-h-56" /></a>
              )}
              {m.anexo_url && !(m.anexo_tipo || '').startsWith('image/') && (
                <a href={m.anexo_url} target="_blank" rel="noopener noreferrer" className="underline">📎 Abrir arquivo (PDF)</a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
