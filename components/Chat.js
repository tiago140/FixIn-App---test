'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

import { fmtDataHoraSP } from '@/lib/format';
import { tocarSomAviso } from '@/lib/somAviso';

const fmtHora = fmtDataHoraSP; // data e hora completas em cada mensagem

export default function Chat({ orcamentoId, profile, mensagensIniciais }) {
  const supabase = createClient();
  const [mensagens, setMensagens] = useState(mensagensIniciais || []);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const canal = supabase
      .channel(`mensagens-${orcamentoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `orcamento_id=eq.${orcamentoId}` },
        (payload) => {
          setMensagens((atual) => {
            if (atual.some((m) => m.id === payload.new.id)) return atual;
            if (payload.new.autor_id !== profile.id) tocarSomAviso();
            return [...atual, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoId]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [mensagens.length]);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    const { error } = await supabase.from('mensagens').insert({
      orcamento_id: orcamentoId,
      autor_id: profile.id,
      autor_nome: profile.nome_completo,
      autor_role: profile.role,
      texto: texto.trim(),
    });
    setEnviando(false);
    if (!error) setTexto('');
  }

  async function anexar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    const caminho = `${orcamentoId}/${Date.now()}-${file.name}`;
    const { error: erroUpload } = await supabase.storage.from('chat-anexos').upload(caminho, file, { contentType: file.type });
    if (!erroUpload) {
      await supabase.from('mensagens').insert({
        orcamento_id: orcamentoId,
        autor_id: profile.id,
        autor_nome: profile.nome_completo,
        autor_role: profile.role,
        texto: '',
        anexo_path: caminho,
        anexo_tipo: file.type,
      });
    }
    setEnviando(false);
    e.target.value = '';
  }

  function urlAnexo(path) {
    return supabase.storage.from('chat-anexos').getPublicUrl(path).data.publicUrl;
  }

  return (
    <div className="card p-4" id="chat">
      <h3 className="font-semibold text-sm mb-3">Chat deste orçamento</h3>
      <div ref={boxRef} className="max-h-72 overflow-y-auto space-y-2 mb-3 pr-1">
        {mensagens.length === 0 && <div className="text-xs text-marinho/40">Nenhuma mensagem ainda.</div>}
        {mensagens.map((m) => (
          <div key={m.id} className={`text-sm ${m.autor_id === profile.id ? 'text-right' : ''}`}>
            <div
              className={`inline-block px-3 py-1.5 rounded max-w-[80%] text-left ${
                m.autor_id === profile.id ? 'bg-marinho text-white' : 'bg-papel border border-linha'
              }`}
            >
              <div className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: m.autor_role === 'master' ? '#253728' : '#3B6B8C' }}
                />
                {m.autor_nome} · {fmtHora(m.criado_em)}
              </div>
              {m.texto}
              {m.anexo_path && (
                m.anexo_tipo?.startsWith('image') ? (
                  <a href={urlAnexo(m.anexo_path)} target="_blank" rel="noreferrer">
                    <img src={urlAnexo(m.anexo_path)} alt="anexo" className="max-w-[180px] rounded mt-1 block" />
                  </a>
                ) : (
                  <a href={urlAnexo(m.anexo_path)} target="_blank" rel="noreferrer" className="underline block mt-1">
                    📎 Abrir anexo
                  </a>
                )
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} className="flex gap-2 items-center">
        <label className="border border-linha rounded px-2.5 py-2 text-sm cursor-pointer">
          📎
          <input type="file" accept="image/*,application/pdf" onChange={anexar} disabled={enviando} className="hidden" />
        </label>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem…"
          className="flex-1 border border-linha rounded px-3 py-2 bg-papel text-sm"
        />
        <button disabled={enviando} className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
          Enviar
        </button>
      </form>
    </div>
  );
}
