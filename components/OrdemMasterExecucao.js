'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, Copy, Link2, MessageCircle, XCircle } from 'lucide-react';
import { enviarFotos } from '@/lib/reduzirImagem';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';

// Equipe FixIn: link de fotos da rua e revisão da conclusão (aprovar ou reprovar com descritivo e fotos).
export default function OrdemMasterExecucao({ os, linkAtual = null, telefone = '' }) {
  const router = useRouter();
  const input = useRef(null);
  const [link, setLink] = useState(linkAtual);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [reprovando, setReprovando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [arquivos, setArquivos] = useState([]);
  const [copiado, setCopiado] = useState(false);

  async function patch(corpo) {
    const res = await fetch(`/api/ordens/${os.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Não foi possível concluir');
    return d;
  }

  async function gerarLink() {
    if (link && !window.confirm('Gerar um link novo? O anterior deixa de funcionar.')) return;
    setErro(''); setOcupado(true);
    try { const d = await patch({ acao: 'gerar_link' }); setLink(d.url); } catch (e) { setErro(e.message); }
    setOcupado(false);
  }
  async function copiar() { try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch (e) {} }
  const tel = String(telefone || '').replace(/\D/g, '');
  const whats = link ? `https://wa.me/${tel ? (tel.startsWith('55') ? tel : '55' + tel) : ''}?text=${encodeURIComponent(`Olá! Segue o link para enviar as fotos do serviço (${os.endereco}): ${link}`)}` : '';

  async function aprovar() {
    if (!window.confirm('Aprovar a conclusão deste serviço?')) return;
    setErro(''); setOcupado(true);
    try { await patch({ acao: 'aprovar_conclusao' }); router.refresh(); } catch (e) { setErro(e.message); }
    setOcupado(false);
  }

  async function reprovar() {
    setErro(''); setOcupado(true);
    try {
      if (arquivos.length) {
        const r = await enviarFotos(`/api/ordens/${os.id}/fotos`, arquivos, {});
        if (r.erro) throw new Error(r.erro);
      }
      await patch({ acao: 'reprovar_conclusao', motivo });
      setReprovando(false); setMotivo(''); setArquivos([]);
      router.refresh();
    } catch (e) { setErro(e.message); }
    setOcupado(false);
  }

  const aceitou = !['enviada', 'recusada', 'cancelada'].includes(os.status);
  return (
    <div className="space-y-4">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}

      {aceitou && (
        <div className="card p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm"><Link2 size={16} /> Link de fotos (app da rua)</div>
          <p className="text-xs text-marinho/55">O prestador abre no celular, sem login, e envia as fotos e a conclusão. Vale 90 dias.</p>
          {link && (
            <div className="space-y-2">
              <input readOnly value={link} className={`${ent} font-mono text-xs`} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copiar} className="border border-linha bg-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1"><Copy size={14} /> {copiado ? 'Copiado' : 'Copiar'}</button>
                <a href={whats} target="_blank" rel="noreferrer" className="bg-[#3F7A5E] text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1"><MessageCircle size={14} /> Enviar por WhatsApp</a>
              </div>
            </div>
          )}
          <button type="button" disabled={ocupado} onClick={gerarLink} className="text-sm underline text-marinho/70 disabled:opacity-50">{link ? 'Gerar link novo' : 'Gerar link de fotos'}</button>
        </div>
      )}

      {os.status === 'conclusao_pendente' && !reprovando && (
        <div className="card p-4 rounded-xl border-l-4 border-l-alerta space-y-3">
          <p className="text-sm font-semibold">O prestador enviou a conclusão. Confira as fotos e decida.</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={ocupado} onClick={aprovar} className="bg-verde text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><CheckCircle2 size={16} /> Aprovar</button>
            <button disabled={ocupado} onClick={() => setReprovando(true)} className="border border-erro text-erro rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2"><XCircle size={16} /> Reprovar</button>
          </div>
        </div>
      )}

      {reprovando && (
        <div className="card p-4 rounded-xl border-l-4 border-l-erro space-y-3">
          <p className="text-sm font-semibold">O que precisa ser ajustado?</p>
          <textarea rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={ent} placeholder="Descreva o problema: o que está errado e onde." />
          <div>
            <button type="button" onClick={() => input.current?.click()} className="border border-linha bg-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-2"><Camera size={15} /> Anexar fotos do problema{arquivos.length ? ` (${arquivos.length})` : ''}</button>
            <input ref={input} type="file" accept="image/*" multiple onChange={(e) => setArquivos((a) => [...a, ...Array.from(e.target.files || [])])} className="hidden" />
          </div>
          <div className="flex gap-2">
            <button disabled={ocupado || !motivo.trim()} onClick={reprovar} className="bg-erro text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">{ocupado ? 'Enviando…' : 'Devolver ao prestador'}</button>
            <button disabled={ocupado} onClick={() => setReprovando(false)} className="border border-linha rounded-lg px-4 py-2 text-sm">Voltar</button>
          </div>
        </div>
      )}
    </div>
  );
}
