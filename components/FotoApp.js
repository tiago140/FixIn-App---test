'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Download } from 'lucide-react';
import { enviarFotos } from '@/lib/reduzirImagem';

// App da rua: o prestador abre o link no celular, tira as fotos e conclui. Sem login (o link é o acesso).
export default function FotoApp({ token }) {
  const input = useRef(null);
  const [dados, setDados] = useState(null);
  const [erroGeral, setErroGeral] = useState('');
  const [tipo, setTipo] = useState('depois');
  const [prog, setProg] = useState(null);
  const [erro, setErro] = useState('');
  const [obs, setObs] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [instalar, setInstalar] = useState(null);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/foto/${token}`, { cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setErroGeral(d.error || 'Link inválido.');
    setDados(d);
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw-foto.js', { scope: `/foto/${token}` }).catch(() => {});
    const h = (e) => { e.preventDefault(); setInstalar(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, [token]);

  async function subir(e) {
    const arquivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!arquivos.length) return;
    setErro(''); setProg('Enviando…');
    const r = await enviarFotos(`/api/foto/${token}`, arquivos, { tipo }, (i, n) => setProg(`Enviando ${i} de ${n}…`));
    setProg(null);
    if (r.erro) setErro(r.erro);
    carregar();
  }

  async function concluir() {
    if (!window.confirm('Enviar a conclusão para a FixIn analisar?')) return;
    setErro(''); setOcupado(true);
    const res = await fetch(`/api/foto/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'concluir', obs }) });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível concluir');
    carregar();
  }

  const casca = (filhos) => (
    <main className="min-h-screen bg-[#F3F4F0] text-[#182F50]">
      <header className="bg-[#182F50] text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-baseline justify-between">
          <span><b className="text-2xl">FixIn</b> <span className="text-xs tracking-[0.25em] opacity-80">REFORMAS</span></span>
          {instalar && <button onClick={() => instalar.prompt()} className="text-xs bg-white/15 border border-white/30 rounded-lg px-3 py-1.5 flex items-center gap-1"><Download size={14} /> Instalar app</button>}
        </div>
      </header>
      <div className="max-w-xl mx-auto p-4 space-y-4">{filhos}</div>
    </main>
  );

  if (erroGeral) return casca(<div className="bg-white border border-[#E4E6DF] rounded-xl p-6 text-center"><p className="font-semibold">Link indisponível</p><p className="text-sm text-[#182F50]/60 mt-1">{erroGeral}</p></div>);
  if (!dados) return casca(<p className="text-center text-sm text-[#182F50]/60 py-10">Carregando…</p>);

  const execucao = dados.fotos.filter((f) => f.tipo !== 'reprovacao');
  const reprov = dados.fotos.filter((f) => f.tipo === 'reprovacao');
  const qtdDepois = execucao.filter((f) => f.tipo === 'depois').length;

  return casca(
    <>
      <div className="bg-white border border-[#E4E6DF] rounded-xl p-4">
        <p className="text-xs text-[#182F50]/55">{dados.numero}</p>
        <p className="font-semibold text-lg leading-tight">{dados.endereco}</p>
        {dados.prestador && <p className="text-xs text-[#182F50]/55 mt-1">Prestador: {dados.prestador}</p>}
      </div>

      {dados.reprovacao_motivo && (
        <div className="rounded-xl border border-[#A63A2D]/40 bg-[#A63A2D]/10 p-4 text-sm space-y-2">
          <p className="font-bold text-[#A63A2D]">A FixIn pediu ajustes</p>
          <p className="whitespace-pre-wrap">{dados.reprovacao_motivo}</p>
          {reprov.length > 0 && <div className="grid grid-cols-3 gap-2">{reprov.map((f) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={f.id} src={f.url} alt="Problema apontado" className="w-full aspect-square object-cover rounded-lg" />)}</div>}
        </div>
      )}

      {dados.status === 'conclusao_pendente' && <div className="rounded-xl border border-[#3F7A5E]/40 bg-[#3F7A5E]/10 p-4 text-sm flex gap-2"><CheckCircle2 size={18} className="shrink-0 text-[#3F7A5E]" /> Conclusão enviada. A FixIn está analisando as fotos.</div>}
      {['aprovada', 'paga'].includes(dados.status) && <div className="rounded-xl border border-[#3F7A5E]/40 bg-[#3F7A5E]/10 p-4 text-sm flex gap-2"><CheckCircle2 size={18} className="shrink-0 text-[#3F7A5E]" /> Serviço aprovado. Obrigado!</div>}
      {!dados.aberta && !['conclusao_pendente', 'aprovada', 'paga'].includes(dados.status) && <div className="rounded-xl border border-[#E4E6DF] bg-white p-4 text-sm">Esta ordem não está aberta para envio de fotos agora.</div>}

      {dados.aberta && (
        <div className="bg-white border border-[#E4E6DF] rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            {[['antes', 'Início'], ['durante', 'Execução'], ['depois', 'Final']].map(([v, r]) => (
              <button key={v} onClick={() => setTipo(v)} className={`flex-1 py-3 rounded-xl text-base font-semibold border ${tipo === v ? 'bg-[#182F50] text-white border-[#182F50]' : 'bg-white border-[#E4E6DF]'}`}>{r}</button>
            ))}
          </div>
          <button disabled={!!prog} onClick={() => input.current?.click()} className="w-full bg-[#3F7A5E] text-white rounded-xl py-4 text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60"><Camera size={22} /> {prog || 'Tirar foto'}</button>
          <input ref={input} type="file" accept="image/*" capture="environment" multiple onChange={subir} className="hidden" />
          {erro && <div className="text-sm bg-[#A63A2D]/10 border border-[#A63A2D] text-[#A63A2D] px-3 py-2 rounded-lg">{erro}</div>}
        </div>
      )}

      {execucao.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {execucao.map((f) => (
            <div key={f.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.tipo} className="w-full aspect-square object-cover rounded-lg border border-[#E4E6DF]" />
              <span className="absolute left-1 top-1 text-[10px] font-bold uppercase bg-[#182F50]/80 text-white rounded px-1.5 py-0.5">{{ antes: 'Início', durante: 'Execução', depois: 'Final' }[f.tipo]}</span>
            </div>
          ))}
        </div>
      )}

      {dados.aberta && (
        <div className="bg-white border border-[#E4E6DF] rounded-xl p-4 space-y-3">
          <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações (opcional)" className="w-full border border-[#E4E6DF] rounded-lg px-3 py-2 text-sm bg-[#F3F4F0]" />
          <button disabled={ocupado || qtdDepois === 0} onClick={concluir} className="w-full bg-[#182F50] text-white rounded-xl py-4 text-base font-bold disabled:opacity-40">{ocupado ? 'Enviando…' : 'Concluir serviço'}</button>
          {qtdDepois === 0 && <p className="text-xs text-center text-[#182F50]/55">Tire ao menos uma foto &quot;Depois&quot; para concluir.</p>}
        </div>
      )}
    </>
  );
}
