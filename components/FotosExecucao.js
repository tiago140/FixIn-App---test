'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, Copy, Smartphone, Trash2 } from 'lucide-react';
import { enviarFotos } from '@/lib/reduzirImagem';
import { urlArquivo } from '@/lib/arquivos';
import { ETAPAS_FOTO, ROTULO_ETAPA } from '@/lib/etapasObra';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';

// Portal do prestador: fotos antes/depois, link da rua e botão de concluir o serviço.
export default function FotosExecucao({ os, fotos, linkFotos = null }) {
  const router = useRouter();
  const input = useRef(null);
  const [tipo, setTipo] = useState('depois');
  const [prog, setProg] = useState(null);
  const [erro, setErro] = useState('');
  const [obs, setObs] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const aberta = ['em_execucao', 'reprovada'].includes(os.status);
  const qtdDepois = fotos.filter((f) => f.tipo === 'depois').length;

  async function subir(e) {
    const arquivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!arquivos.length) return;
    setErro(''); setProg('Enviando…');
    const r = await enviarFotos(`/api/prestador/ordens/${os.id}/fotos`, arquivos, { tipo }, (i, n) => setProg(`Enviando ${i} de ${n}…`));
    setProg(null);
    if (r.erro) setErro(r.erro);
    router.refresh();
  }

  async function remover(id) {
    if (!window.confirm('Remover esta foto?')) return;
    await fetch(`/api/prestador/ordens/${os.id}/fotos?foto=${id}`, { method: 'DELETE' });
    router.refresh();
  }

  async function concluir() {
    if (!window.confirm('Enviar a conclusão para a FixIn analisar? Depois disso você não altera as fotos.')) return;
    setErro(''); setOcupado(true);
    const res = await fetch(`/api/prestador/ordens/${os.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'concluir', obs }) });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível concluir');
    router.refresh();
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(linkFotos); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch (e) {}
  }

  return (
    <div className="card p-5 rounded-xl space-y-4">
      <div>
        <h3 className="font-semibold">Fotos do serviço</h3>
        <p className="text-xs text-marinho/50">Registre a obra em três momentos: Início, Execução (quantas quiser, durante o serviço) e Final. Para concluir é preciso ao menos uma foto do serviço pronto.</p>
      </div>
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}

      {aberta && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-linha overflow-hidden text-sm">
              {ETAPAS_FOTO.map(([v, r]) => (
                <button key={v} type="button" onClick={() => setTipo(v)} className={`px-4 py-2 ${tipo === v ? 'bg-marinho text-white font-semibold' : 'bg-white'}`}>{r}</button>
              ))}
            </div>
            <button type="button" disabled={!!prog} onClick={() => input.current?.click()} className="bg-verde text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Camera size={17} /> {prog || 'Tirar ou escolher fotos'}</button>
            <input ref={input} type="file" accept="image/*" capture="environment" multiple onChange={subir} className="hidden" />
          </div>
          {linkFotos && (
            <div className="rounded-xl bg-papel border border-linha p-3 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold"><Smartphone size={16} /> App da rua (sem login)</div>
              <p className="text-xs text-marinho/60">Abra este link no celular, no local do serviço. Dá para instalar na tela inicial e tirar as fotos direto.</p>
              <div className="flex gap-2"><input readOnly value={linkFotos} className={`${ent} font-mono text-xs`} /><button type="button" onClick={copiar} className="border border-linha bg-white rounded-lg px-3 text-sm flex items-center gap-1"><Copy size={14} /> {copiado ? 'Copiado' : 'Copiar'}</button></div>
            </div>
          )}
        </>
      )}

      {fotos.length === 0 ? <p className="text-sm text-marinho/50">Nenhuma foto enviada nesta rodada.</p> : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative">
              <a href={urlArquivo('ordens-arquivos', f.path)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlArquivo('ordens-arquivos', f.path)} alt={f.tipo} loading="lazy" className="w-full aspect-square object-cover rounded-lg border border-linha" />
              </a>
              <span className="absolute left-1 top-1 text-[10px] font-bold uppercase bg-marinho/80 text-white rounded px-1.5 py-0.5">{ROTULO_ETAPA[f.tipo]}</span>
              {aberta && <button type="button" onClick={() => remover(f.id)} className="absolute right-1 top-1 bg-white/90 text-erro rounded p-1" aria-label="Remover foto"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}

      {aberta && (
        <div className="border-t border-linha pt-4 space-y-3">
          <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações da conclusão (opcional)" className={ent} />
          <button disabled={ocupado || qtdDepois === 0} onClick={concluir} className="bg-marinho text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-40">
            <CheckCircle2 size={17} /> {ocupado ? 'Enviando…' : os.status === 'reprovada' ? 'Reenviar conclusão' : 'Concluir serviço'}
          </button>
          {qtdDepois === 0 && <p className="text-xs text-marinho/50">Envie ao menos uma foto &quot;Final&quot; para liberar o botão.</p>}
        </div>
      )}
    </div>
  );
}
