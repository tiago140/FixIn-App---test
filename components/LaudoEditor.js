'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ImagePlus, Trash2, ArrowLeft, ArrowRight, FileDown, Send, EyeOff, Loader2, Undo2, Save } from 'lucide-react';
import TextoLaudo from '@/components/TextoLaudo';

// Nunca lança erro e nunca fica pendurado: sempre devolve { data } ou { erro }.
async function chamar(url, opcoes = {}, ms = 58000) {
  const controle = new AbortController();
  const t = setTimeout(() => controle.abort(), ms);
  try {
    const res = await fetch(url, { ...opcoes, signal: controle.signal });
    const txt = await res.text();
    let data = null;
    try { data = JSON.parse(txt); } catch (e) {}
    if (!res.ok) return { erro: data?.error || (res.status === 504 || res.status === 502 ? 'O servidor demorou demais. Tente de novo.' : `Não foi possível concluir (erro ${res.status}).`) };
    return { data: data || {} };
  } catch (e) {
    return { erro: e?.name === 'AbortError' ? 'Demorou demais para responder. Tente de novo.' : 'Sem conexão com o servidor. Confira a internet e tente de novo.' };
  } finally {
    clearTimeout(t);
  }
}

// Reduz a foto no próprio navegador (lado maior 1600px, JPEG): envio rápido e PDF leve.
export async function reduzirImagem(arquivo, maxLado = 1600, qualidade = 0.82) {
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * escala));
  canvas.height = Math.max(1, Math.round(bmp.height * escala));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', qualidade));
  if (!blob) throw new Error('falha ao reduzir');
  return blob;
}

const campo = 'mt-1 w-full border border-linha rounded px-3 py-2 bg-papel text-sm text-marinho';
const botao = 'inline-flex items-center gap-1.5 text-sm font-semibold border border-linha bg-white rounded-lg px-3 py-1.5 hover:bg-papel disabled:opacity-50';

export default function LaudoEditor({ laudo, clienteNome, orcamentos = [], emailsDestino = [] }) {
  const router = useRouter();
  const inputFotos = useRef(null);
  const [form, setForm] = useState({
    endereco: laudo.endereco || '', titulo: laudo.titulo || 'Laudo de Inspeção', data_inspecao: laudo.data_inspecao || '', orcamento_id: laudo.orcamento_id || '',
    descricao_original: laudo.descricao_original || '', texto_tecnico: laudo.texto_tecnico || '',
  });
  const [fotos, setFotos] = useState(laudo.fotos || []);
  const [publicado, setPublicado] = useState(!!laudo.publicado);
  const [temPdf, setTemPdf] = useState(!!laudo.pdf_gerado_em);
  const [sujo, setSujo] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const [msg, setMsg] = useState(null);
  const [avisosIA, setAvisosIA] = useState([]);
  const [textoAnterior, setTextoAnterior] = useState(null);
  const [envios, setEnvios] = useState([]);
  const [painel, setPainel] = useState(null); // 'publicar' | 'despublicar' | 'excluir'
  const [avisarEmail, setAvisarEmail] = useState(false);

  const alterar = (c) => (e) => { setForm((f) => ({ ...f, [c]: e.target.value })); setSujo(true); };
  const info = (tipo, texto) => setMsg({ tipo, texto });

  async function salvar(silencioso = false) {
    setOcupado('salvar');
    const { data, erro } = await chamar(`/api/laudos/${laudo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, orcamento_id: form.orcamento_id || null, fotos: fotos.map(({ id, legenda }) => ({ id, legenda: legenda || '' })) }),
    });
    setOcupado(null);
    if (erro) { info('erro', erro); return false; }
    setSujo(false);
    if (!silencioso) info('ok', data.aviso || 'Laudo salvo.');
    return true;
  }

  async function melhorarComIA() {
    if (form.descricao_original.trim().length < 15) return info('erro', 'Descreva primeiro o que foi observado (pelo menos uma frase).');
    setOcupado('ia'); setMsg(null); setAvisosIA([]);
    const { data, erro } = await chamar('/api/laudos/melhorar-texto', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao: form.descricao_original, endereco: form.endereco, cliente: clienteNome }),
    });
    setOcupado(null);
    if (erro) return info('erro', erro);
    setTextoAnterior(form.texto_tecnico);
    setForm((f) => ({ ...f, texto_tecnico: data.texto }));
    setAvisosIA(data.avisos || []);
    setSujo(true);
    info('ok', 'Texto técnico gerado abaixo. Leia, ajuste o que quiser e salve: nada vai para a imobiliária até você publicar.');
  }

  function desfazerIA() {
    setForm((f) => ({ ...f, texto_tecnico: textoAnterior ?? '' }));
    setTextoAnterior(null); setAvisosIA([]); setSujo(true);
    info('info', 'Desfeito: o texto técnico voltou como estava.');
  }

  async function adicionarFotos(lista) {
    const arquivos = Array.from(lista || []);
    if (!arquivos.length) return;
    setOcupado('fotos'); setMsg(null);
    const estado = arquivos.map((a) => ({ nome: a.name, situacao: 'esperando' }));
    setEnvios(estado.map((x) => ({ ...x })));
    for (let i = 0; i < arquivos.length; i++) {
      estado[i].situacao = 'enviando'; setEnvios(estado.map((x) => ({ ...x })));
      try {
        const blob = await reduzirImagem(arquivos[i]);
        const fd = new FormData();
        fd.append('arquivo', blob, 'foto.jpg');
        const { data, erro } = await chamar(`/api/laudos/${laudo.id}/fotos`, { method: 'POST', body: fd });
        if (erro) { estado[i].situacao = 'erro'; estado[i].erro = erro; }
        else { estado[i].situacao = 'ok'; setFotos((f) => [...f, { id: data.foto.id, legenda: '' }]); }
      } catch (e) {
        estado[i].situacao = 'erro'; estado[i].erro = 'Não consegui abrir esta imagem (use JPG ou PNG).';
      }
      setEnvios(estado.map((x) => ({ ...x })));
    }
    setOcupado(null);
    if (inputFotos.current) inputFotos.current.value = '';
    const falhas = estado.filter((x) => x.situacao === 'erro').length;
    info(falhas ? 'erro' : 'ok', falhas ? `${falhas} foto(s) não foram enviadas. As demais estão no laudo.` : `${arquivos.length} foto(s) adicionada(s). Escreva a legenda de cada uma e salve.`);
  }

  async function removerFoto(id) {
    setOcupado('fotos');
    const { erro } = await chamar(`/api/laudos/${laudo.id}/fotos/${id}`, { method: 'DELETE' });
    setOcupado(null);
    if (erro) return info('erro', erro);
    setFotos((f) => f.filter((x) => x.id !== id));
  }

  function mover(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= fotos.length) return;
    const nova = [...fotos];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setFotos(nova); setSujo(true);
  }

  async function gerarPdf() {
    if (!(await salvar(true))) return;
    setOcupado('pdf');
    const { erro } = await chamar(`/api/laudos/${laudo.id}/pdf`, { method: 'POST' });
    setOcupado(null);
    if (erro) return info('erro', erro);
    setTemPdf(true);
    info('ok', 'PDF gerado com o que está salvo. Use "Abrir o PDF" para conferir.');
    router.refresh();
  }

  async function publicar() {
    if (!(await salvar(true))) return;
    setOcupado('publicar');
    const { data, erro } = await chamar(`/api/laudos/${laudo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'publicar', avisar_email: avisarEmail }) });
    setOcupado(null);
    if (erro) return info('erro', erro);
    setPublicado(true); setTemPdf(true); setPainel(null);
    const e = data.email;
    info(e && !e.enviado ? 'erro' : 'ok', `Laudo publicado: a imobiliária já pode ler e ver o PDF.${e ? (e.enviado ? ` E-mail enviado para ${e.para.join(', ')}.` : ` Mas o e-mail NÃO foi enviado: ${e.motivo}`) : ''}`);
    router.refresh();
  }

  async function despublicar() {
    setOcupado('publicar');
    const { erro } = await chamar(`/api/laudos/${laudo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'despublicar' }) });
    setOcupado(null);
    if (erro) return info('erro', erro);
    setPublicado(false); setPainel(null);
    info('ok', 'Laudo despublicado: a imobiliária não o enxerga mais.');
    router.refresh();
  }

  async function excluir() {
    setOcupado('excluir');
    const { erro } = await chamar(`/api/laudos/${laudo.id}`, { method: 'DELETE' });
    setOcupado(null);
    if (erro) return info('erro', erro);
    router.push('/master/laudos');
  }

  const cor = { ok: 'bg-sucesso/10 border-sucesso text-sucesso', erro: 'bg-erro/10 border-erro text-erro', info: 'bg-info/10 border-info text-info' };
  const ocup = !!ocupado;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-bold uppercase tracking-wide rounded px-2.5 py-1 text-white ${publicado ? 'bg-sucesso' : 'bg-[#6B7280]'}`}>{publicado ? 'Publicado para a imobiliária' : 'Rascunho (só você vê)'}</span>
        {sujo && <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-alerta/20 text-alerta">Alterações não salvas</span>}
        <div className="ml-auto flex gap-2 flex-wrap">
          <button type="button" className={botao} disabled={ocup} onClick={() => salvar(false)}>{ocupado === 'salvar' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar</button>
          <button type="button" className={botao} disabled={ocup} onClick={gerarPdf}>{ocupado === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Gerar PDF</button>
          {temPdf && <a href={`/api/laudos/${laudo.id}/arquivo?tipo=pdf`} target="_blank" rel="noreferrer" className={botao}>Abrir o PDF</a>}
        </div>
      </div>

      {msg && <div role="status" className={`text-sm border rounded-lg px-4 py-3 ${cor[msg.tipo]}`}>{msg.texto}</div>}

      <div className="card p-5 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 text-sm text-marinho/60">Laudo <b className="text-marinho">{laudo.numero}</b> · {clienteNome}</div>
        <label className="block text-xs text-marinho/60 sm:col-span-2">Endereço do imóvel<input value={form.endereco} onChange={alterar('endereco')} maxLength={200} className={campo} /></label>
        <label className="block text-xs text-marinho/60">Data da inspeção<input type="date" value={form.data_inspecao} onChange={alterar('data_inspecao')} className={campo} /></label>
        <label className="block text-xs text-marinho/60">Orçamento relacionado
          <select value={form.orcamento_id} onChange={alterar('orcamento_id')} className={campo}>
            <option value="">Nenhum</option>
            {orcamentos.map((o) => <option key={o.id} value={o.id}>{o.numero} — {o.endereco}</option>)}
          </select>
        </label>
      </div>

      <div className="card p-5">
        <h3 className="font-slab text-xl font-bold text-marinho">1. Descreva o que está acontecendo</h3>
        <p className="text-sm text-marinho/60 mt-1">Escreva do seu jeito, como se estivesse contando. A IA organiza e deixa em linguagem técnica, <b>sem acrescentar nada que você não escreveu</b>.</p>
        <textarea aria-label="Sua descrição" value={form.descricao_original} onChange={alterar('descricao_original')} rows={7} className={`${campo} mt-3`} placeholder="Ex.: no quarto da suíte tem mancha de umidade no teto, uns 80 por 60, a tinta tá descascando; na sala uma trinca na parede lateral de 1,20 m..." />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button type="button" onClick={melhorarComIA} disabled={ocup} className="inline-flex items-center gap-2 bg-marinho text-white rounded-lg px-5 py-2.5 text-sm font-bold shadow disabled:opacity-50">
            {ocupado === 'ia' ? <><Loader2 size={16} className="animate-spin" /> Escrevendo…</> : <><Sparkles size={16} /> Melhorar com IA (texto técnico)</>}
          </button>
          {textoAnterior !== null && <button type="button" onClick={desfazerIA} className={botao}><Undo2 size={15} /> Desfazer</button>}
        </div>
        {avisosIA.map((a, i) => <div key={i} className="mt-3 text-sm bg-alerta/10 border border-alerta text-marinho rounded-lg px-4 py-2.5">⚠ {a}</div>)}
      </div>

      <div className="card p-5">
        <h3 className="font-slab text-xl font-bold text-marinho">2. Texto técnico do laudo <span className="text-xs font-normal text-marinho/50">(é este que vai para o PDF)</span></h3>
        <p className="text-sm text-marinho/60 mt-1">Pode editar à mão. Use <code># Título</code> para criar uma seção e <code>- </code> no começo da linha para fazer uma lista. Se deixar em branco, vai a sua descrição.</p>
        <div className="grid lg:grid-cols-2 gap-4 mt-3">
          <textarea aria-label="Texto técnico" value={form.texto_tecnico} onChange={alterar('texto_tecnico')} rows={14} className={`${campo} mt-0 font-mono text-[13px]`} placeholder="# Constatações&#10;Texto corrido...&#10;&#10;# Itens verificados&#10;- Item 1&#10;- Item 2" />
          <div className="border border-linha rounded-lg p-4 bg-white max-h-[22rem] overflow-auto" aria-label="Pré-visualização">
            <div className="text-[11px] uppercase tracking-wide text-marinho/40 mb-2">Pré-visualização</div>
            <TextoLaudo texto={form.texto_tecnico || form.descricao_original} vazio="O texto aparece aqui." />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-slab text-xl font-bold text-marinho">3. Fotos <span className="text-xs font-normal text-marinho/50">({fotos.length} de 24)</span></h3>
        <p className="text-sm text-marinho/60 mt-1">Escolha as fotos (várias de uma vez). Elas são reduzidas automaticamente. A ordem e as legendas valem para o PDF.</p>
        <div className="mt-3">
          <input ref={inputFotos} type="file" accept="image/*" multiple className="hidden" onChange={(e) => adicionarFotos(e.target.files)} aria-label="Escolher fotos" />
          <button type="button" disabled={ocup || fotos.length >= 24} onClick={() => inputFotos.current?.click()} className="inline-flex items-center gap-2 border border-marinho text-marinho bg-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-papel disabled:opacity-50">
            {ocupado === 'fotos' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} Adicionar fotos
          </button>
        </div>
        {envios.length > 0 && ocupado === 'fotos' && (
          <ul className="mt-3 text-xs text-marinho/70 space-y-0.5">{envios.map((e, i) => <li key={i}>{e.situacao === 'ok' ? '✓' : e.situacao === 'erro' ? '✗' : '…'} {e.nome} {e.erro ? `— ${e.erro}` : ''}</li>)}</ul>
        )}
        {fotos.length > 0 && (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fotos.map((f, i) => (
              <div key={f.id} data-foto={f.id} className="border border-linha rounded-lg overflow-hidden bg-white">
                <div className="aspect-[4/3] bg-papel flex items-center justify-center">
                  <img src={`/api/laudos/${laudo.id}/arquivo?foto=${f.id}`} alt={`Foto ${i + 1}`} loading="lazy" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="p-2 space-y-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-marinho">Foto {i + 1}</span>
                    <span className="ml-auto flex gap-1">
                      <button type="button" aria-label="Mover para antes" disabled={i === 0 || ocup} onClick={() => mover(i, -1)} className="p-1 rounded hover:bg-papel disabled:opacity-30"><ArrowLeft size={15} /></button>
                      <button type="button" aria-label="Mover para depois" disabled={i === fotos.length - 1 || ocup} onClick={() => mover(i, 1)} className="p-1 rounded hover:bg-papel disabled:opacity-30"><ArrowRight size={15} /></button>
                      <button type="button" aria-label="Remover foto" disabled={ocup} onClick={() => removerFoto(f.id)} className="p-1 rounded text-erro hover:bg-erro/10 disabled:opacity-30"><Trash2 size={15} /></button>
                    </span>
                  </div>
                  <textarea aria-label={`Legenda da foto ${i + 1}`} value={f.legenda || ''} maxLength={300} rows={2} onChange={(e) => { setFotos((l) => l.map((x) => (x.id === f.id ? { ...x, legenda: e.target.value } : x))); setSujo(true); }} className="w-full border border-linha rounded px-2 py-1.5 bg-papel text-xs" placeholder="Legenda (o que a foto mostra)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 border-l-4 border-l-marinho">
        <h3 className="font-slab text-xl font-bold text-marinho">4. Publicar para a imobiliária</h3>
        {!publicado ? (
          <>
            <p className="text-sm text-marinho/60 mt-1">Enquanto estiver como rascunho, só você vê. Ao publicar, <b>{clienteNome}</b> poderá <b>ler o laudo e abrir o PDF</b> na aba Laudos (sem poder editar nada).</p>
            {painel !== 'publicar' ? (
              <button type="button" disabled={ocup} onClick={() => setPainel('publicar')} className="mt-3 inline-flex items-center gap-2 bg-verde text-white rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-50"><Send size={16} /> Publicar…</button>
            ) : (
              <div className="mt-3 rounded-lg border border-marinho/30 bg-marinho/5 p-4 space-y-3 text-sm">
                <div>O sistema <b>salva o que está na tela</b>, gera o PDF atualizado e libera para a imobiliária.</div>
                <label className="flex items-start gap-2"><input type="checkbox" checked={avisarEmail} onChange={(e) => setAvisarEmail(e.target.checked)} className="mt-1" /><span>Avisar por e-mail (com o PDF anexo)<br /><span className="text-xs text-marinho/60">{emailsDestino.length ? `Para: ${emailsDestino.join(', ')}` : 'Esta imobiliária não tem e-mail de usuário ativo cadastrado.'}</span></span></label>
                <div className="flex gap-2 justify-end"><button type="button" className={botao} onClick={() => setPainel(null)}>Cancelar</button><button type="button" disabled={ocup} onClick={publicar} className="bg-verde text-white text-sm font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50">{ocupado === 'publicar' ? 'Publicando…' : 'Sim, publicar'}</button></div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-marinho/60 mt-1">A imobiliária está vendo este laudo. Se você editar e salvar, o PDF publicado é atualizado automaticamente.</p>
            {painel !== 'despublicar' ? (
              <button type="button" disabled={ocup} onClick={() => setPainel('despublicar')} className={`${botao} mt-3`}><EyeOff size={15} /> Despublicar…</button>
            ) : (
              <div className="mt-3 flex items-center gap-2 flex-wrap text-sm"><span>Esconder o laudo da imobiliária?</span><button type="button" className={botao} onClick={() => setPainel(null)}>Cancelar</button><button type="button" disabled={ocup} onClick={despublicar} className="bg-erro text-white text-sm font-semibold rounded-lg px-4 py-1.5">Sim, despublicar</button></div>
            )}
          </>
        )}
      </div>

      <div className="text-right">
        {painel !== 'excluir' ? (
          <button type="button" disabled={ocup} onClick={() => setPainel('excluir')} className="text-sm text-erro underline disabled:opacity-50">Excluir este laudo</button>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm flex-wrap justify-end">Excluir {laudo.numero} com as fotos e o PDF? <b>Não dá para desfazer.</b>
            <button type="button" className={botao} onClick={() => setPainel(null)}>Cancelar</button>
            <button type="button" disabled={ocup} onClick={excluir} className="bg-erro text-white text-sm font-semibold rounded-lg px-4 py-1.5">Sim, excluir</button>
          </span>
        )}
      </div>
    </div>
  );
}
