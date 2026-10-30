'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Copy, Link2, MessageCircle, Send } from 'lucide-react';
import { enviarFotos } from '@/lib/reduzirImagem';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';
const ETAPAS = [
  ['aprovado', 'Aprovado'], ['iniciada', 'Obra iniciada'], ['em_execucao', 'Em execução'], ['aguardando_material', 'Aguardando material'], ['concluida', 'Concluída'],
];

// Painel da equipe FixIn: lança etapa/percentual, anotações e fotos, e controla o link externo do locador.
// interessados: [{ nome, whatsapp }] já cadastrados nas ordens do orçamento.
export default function AcompanhamentoEquipe({ acomp, link, mensagem, interessados = [] }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(acomp.etapa);
  const [pct, setPct] = useState(String(acomp.percentual));
  const [texto, setTexto] = useState('');
  const [nota, setNota] = useState('');
  const [notaPublica, setNotaPublica] = useState(true);
  const [legenda, setLegenda] = useState('');
  const [fone, setFone] = useState(interessados.find((i) => i.whatsapp)?.whatsapp || '');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function chamar(url, metodo, corpo) {
    setErro(''); setMsg(''); setOcupado(true);
    let r; try { r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }); } catch (e) { setOcupado(false); setErro('Sem conexão.'); return null; }
    const d = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) { setErro(d.error || 'Não foi possível salvar.'); return null; }
    return d;
  }
  async function salvarEtapa(e) {
    e.preventDefault();
    const d = await chamar(`/api/acompanhamento/${acomp.id}`, 'PATCH', { etapa, percentual: pct, texto });
    if (d) { setTexto(''); setMsg('Andamento atualizado.'); router.refresh(); }
  }
  async function salvarNota(e) {
    e.preventDefault();
    const d = await chamar(`/api/acompanhamento/${acomp.id}/eventos`, 'POST', { texto: nota, publico: notaPublica });
    if (d) { setNota(''); setMsg('Anotação registrada.'); router.refresh(); }
  }
  async function subirFotos(ev) {
    const arquivos = Array.from(ev.target.files || []);
    ev.target.value = '';
    if (!arquivos.length) return;
    setErro(''); setMsg(''); setOcupado(true);
    const r = await enviarFotos(`/api/acompanhamento/${acomp.id}/eventos`, arquivos, { legenda }, (i, n) => setMsg(`Enviando foto ${i} de ${n}…`));
    setOcupado(false);
    if (r.erro) setErro(r.erro); else { setMsg(`${r.enviadas} foto(s) adicionada(s).`); setLegenda(''); }
    router.refresh();
  }
  async function linkLigado(ligado, novo = false) {
    const d = await chamar(`/api/acompanhamento/${acomp.id}`, 'PATCH', { link_ativo: ligado, novo_token: novo });
    if (d) { setMsg(ligado ? 'Link do locador ativado.' : 'Link do locador desativado.'); router.refresh(); }
  }
  async function copiar(t) { try { await navigator.clipboard.writeText(t); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch (e) {} }

  const digitos = fone.replace(/\D/g, '');
  const num = digitos && !digitos.startsWith('55') && digitos.length <= 11 ? `55${digitos}` : digitos;
  const wa = link ? `https://wa.me/${num}?text=${encodeURIComponent(mensagem)}` : null;

  return (
    <div className="space-y-5">
      <form onSubmit={salvarEtapa} className="card rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Etapa e andamento</h3>
        <div className="grid sm:grid-cols-[1fr_120px] gap-3">
          <label className="text-xs text-marinho/60">Etapa
            <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className={`${ent} mt-1`}>{ETAPAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="text-xs text-marinho/60">% concluído
            <input type="number" min="0" max="100" value={etapa === 'concluida' ? 100 : pct} onChange={(e) => setPct(e.target.value)} className={`${ent} mt-1`} />
          </label>
        </div>
        <input type="range" min="0" max="100" step="5" value={etapa === 'concluida' ? 100 : (Number(pct) || 0)} onChange={(e) => setPct(e.target.value)} className="w-full accent-verde" aria-label="Percentual" />
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="O que foi feito (opcional) — o locador lê esta frase" className={ent} />
        <button disabled={ocupado} className="bg-verde text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50">Atualizar andamento</button>
      </form>

      <div className="card rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Camera size={15} /> Fotos</h3>
        <input value={legenda} onChange={(e) => setLegenda(e.target.value)} maxLength={200} placeholder="Legenda (ex.: Banheiro — massa corrida aplicada)" className={ent} />
        <label className="inline-flex items-center gap-2 bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-2 cursor-pointer">
          <Camera size={15} /> Adicionar fotos
          <input type="file" accept="image/*" multiple onChange={subirFotos} disabled={ocupado} className="hidden" />
        </label>
        <p className="text-xs text-marinho/50">A legenda vale para as fotos escolhidas agora. As fotos que o prestador manda pelo app já entram na linha do tempo sozinhas.</p>
      </div>

      <form onSubmit={salvarNota} className="card rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Anotação do que foi feito</h3>
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} placeholder="Ex.: Finalizamos a pintura da sala e iniciamos o piso do quarto." className={ent} />
        <label className="flex items-center gap-2 text-xs text-marinho/70"><input type="checkbox" checked={notaPublica} onChange={(e) => setNotaPublica(e.target.checked)} /> Mostrar ao locador (desmarque para nota só da equipe e da imobiliária)</label>
        <button disabled={ocupado} className="bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50 inline-flex items-center gap-2"><Send size={14} /> Registrar anotação</button>
      </form>

      <div className="card rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Link2 size={15} /> Link do locador (sem login)</h3>
        {link ? (
          <>
            <div className="flex gap-2"><input readOnly value={link} className={`${ent} font-mono text-xs`} onFocus={(e) => e.target.select()} /><button type="button" onClick={() => copiar(link)} className="border border-linha rounded-lg px-3 text-sm inline-flex items-center gap-1"><Copy size={14} />{copiado ? 'Copiado' : 'Copiar'}</button></div>
            <div className="grid sm:grid-cols-[1fr_auto] gap-2">
              <input value={fone} onChange={(e) => setFone(e.target.value)} placeholder="WhatsApp com DDD" list="fones-obra" className={ent} />
              <a href={digitos.length >= 10 ? wa : undefined} target="_blank" rel="noreferrer" aria-disabled={digitos.length < 10} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${digitos.length >= 10 ? 'bg-verde' : 'bg-marinho/30 pointer-events-none'}`}><MessageCircle size={15} /> Enviar pelo WhatsApp</a>
            </div>
            <datalist id="fones-obra">{interessados.filter((i) => i.whatsapp).map((i) => <option key={i.whatsapp} value={i.whatsapp}>{i.nome}</option>)}</datalist>
            <details className="text-xs text-marinho/60"><summary className="cursor-pointer">Ver mensagem pronta</summary><p className="mt-2 whitespace-pre-wrap rounded-lg bg-papel border border-linha p-2">{mensagem}</p></details>
            <div className="flex gap-4 text-xs">
              <button type="button" onClick={() => linkLigado(false)} className="text-erro underline">Desativar link</button>
              <button type="button" onClick={() => { if (window.confirm('O link antigo deixa de funcionar. Gerar um novo?')) linkLigado(true, true); }} className="text-marinho/60 underline">Gerar novo link</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-marinho/60">Ative para o locador acompanhar fotos e andamento por um link privado. Ele não vê valores nem dados do prestador.</p>
            <button type="button" disabled={ocupado} onClick={() => linkLigado(true)} className="bg-verde text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50">Ativar link do locador</button>
          </>
        )}
      </div>
      {msg && <p className="text-sm text-sucesso">{msg}</p>}
      {erro && <p className="text-sm text-erro">{erro}</p>}
    </div>
  );
}
