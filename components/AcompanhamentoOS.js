'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Link2 } from 'lucide-react';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm font-mono text-xs';

// Equipe: liga/desliga o link da linha do tempo da obra (para o cliente acompanhar sem login).
export default function AcompanhamentoOS({ osId, status, linkAtual = null, ativo = false }) {
  const router = useRouter();
  const [link, setLink] = useState(linkAtual);
  const [on, setOn] = useState(ativo);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  if (['enviada', 'recusada', 'cancelada'].includes(status)) return null;

  async function acao(a) {
    setErro(''); setOcupado(true);
    const res = await fetch(`/api/ordens/${osId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: a }) });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível concluir');
    if (a === 'gerar_acompanhamento') { setLink(d.url); setOn(true); } else setOn(false);
    router.refresh();
  }
  async function copiar() { try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch (e) {} }

  return (
    <div className="card p-5 rounded-xl space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Link2 size={17} /> Acompanhamento para o cliente</h3>
        <p className="text-xs text-marinho/55">Um link com a linha do tempo da obra: Início, Execução e Final, com as fotos. Não mostra valores nem dados do prestador. As fotos finais só aparecem depois que você aprova a conclusão.</p>
      </div>
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
      {on && link && (
        <div className="flex gap-2"><input readOnly value={link} className={ent} /><button type="button" onClick={copiar} className="border border-linha bg-white rounded-lg px-3 text-sm flex items-center gap-1"><Copy size={14} /> {copiado ? 'Copiado' : 'Copiar'}</button></div>
      )}
      <div className="flex gap-4">
        <button type="button" disabled={ocupado} onClick={() => acao('gerar_acompanhamento')} className="text-sm underline disabled:opacity-50">{on ? 'Mostrar link' : 'Ativar link de acompanhamento'}</button>
        {on && <button type="button" disabled={ocupado} onClick={() => window.confirm('Desativar? Quem tem o link deixa de ver a obra.') && acao('desativar_acompanhamento')} className="text-sm underline text-erro disabled:opacity-50">Desativar</button>}
      </div>
    </div>
  );
}
