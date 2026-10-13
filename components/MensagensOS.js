'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';

// Conversa curta sobre a ordem entre prestador e equipe. lado: quem está vendo ('prestador' ou 'equipe').
export default function MensagensOS({ osId, mensagens, lado, api }) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setErro(''); setOcupado(true);
    const res = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível enviar');
    setTexto(''); router.refresh();
  }
  return (
    <div className="card p-5 rounded-xl space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><MessageSquare size={17} /> {lado === 'prestador' ? 'Dúvidas com a FixIn' : 'Conversa com o prestador'}</h3>
        <p className="text-xs text-marinho/50">{lado === 'prestador' ? 'Pergunte aqui sobre esta ordem. A equipe é avisada e responde por aqui.' : 'O prestador é avisado por e-mail e pelo celular.'}</p>
      </div>
      {mensagens.length > 0 && (
        <ul className="space-y-2">
          {mensagens.map((m) => (
            <li key={m.id} className={`flex ${m.lado === lado ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.lado === lado ? 'bg-marinho text-white' : 'bg-papel border border-linha'}`}>
                <div className={`text-[11px] mb-0.5 ${m.lado === lado ? 'text-white/70' : 'text-marinho/50'}`}>{m.lado === 'equipe' ? 'FixIn' : (m.autor_nome || 'Prestador')} · {new Date(m.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="whitespace-pre-wrap">{m.texto}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {erro && <div className="text-sm text-erro">{erro}</div>}
      <form onSubmit={enviar} className="flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} placeholder="Escreva sua mensagem" className={ent} />
        <button disabled={ocupado || !texto.trim()} className="bg-marinho text-white rounded-lg px-4 text-sm font-semibold disabled:opacity-40">{ocupado ? '…' : 'Enviar'}</button>
      </form>
    </div>
  );
}
