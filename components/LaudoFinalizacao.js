'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eraser } from 'lucide-react';

// Laudo de finalização: o prestador desenha a assinatura no quadro e confirma. Em execução, assinar também conclui o serviço.
export default function LaudoFinalizacao({ osId, status, nomePadrao, docPadrao, assinado, temFotoFinal }) {
  const router = useRouter();
  const cv = useRef(null);
  const [desenhou, setDesenhou] = useState(false);
  const [nome, setNome] = useState(nomePadrao || '');
  const [doc, setDoc] = useState(docPadrao || '');
  const [obs, setObs] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = cv.current; if (!c || assinado) return;
    const r = window.devicePixelRatio || 1; const w = c.clientWidth;
    c.width = w * r; c.height = 180 * r;
    const g = c.getContext('2d'); g.scale(r, r); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#182f50';
    let on = false;
    const pt = (e) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    const down = (e) => { e.preventDefault(); on = true; c.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.1, y + 0.1); g.stroke(); setDesenhou(true); };
    const move = (e) => { if (!on) return; e.preventDefault(); const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); };
    const up = () => { on = false; };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); };
  }, [assinado]);

  function limpar() { const c = cv.current; const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.restore(); setDesenhou(false); }

  async function enviar() {
    setErro('');
    if (!desenhou) return setErro('Faça sua assinatura no quadro.');
    setBusy(true);
    const r = await fetch(`/api/prestador/ordens/${osId}/laudo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, doc, obs, aceite, assinatura: cv.current.toDataURL('image/png') }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErro(j.error || 'Não foi possível assinar.');
    router.refresh();
  }

  if (assinado) return (
    <div className="card p-5 rounded-xl flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold">Laudo de finalização assinado</h3><p className="text-xs text-marinho/60">Fica registrado com data, hora e código de verificação.</p></div>
      <a href={`/api/ordens/${osId}/laudo-final`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-marinho text-white px-5 py-2.5 text-sm font-semibold"><FileText size={16} /> Abrir laudo (PDF)</a>
    </div>
  );

  const emExecucao = ['em_execucao', 'reprovada'].includes(status);
  return (
    <div className="card p-5 rounded-xl space-y-3" id="laudo">
      <div>
        <h3 className="font-semibold">Laudo de finalização</h3>
        <p className="text-xs text-marinho/60">{emExecucao ? 'Ao assinar, o serviço é concluído e enviado para a FixIn conferir.' : 'Assine para registrar a entrega do serviço.'} O laudo reúne os dados da ordem, o serviço executado, as fotos finais e a sua assinatura.</p>
      </div>
      {!temFotoFinal && <div className="text-sm bg-alerta/10 border border-alerta/40 rounded-lg px-3 py-2">Envie antes pelo menos uma foto do serviço pronto (etapa Final).</div>}
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-xs font-semibold text-marinho/70">Nome completo<input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full border border-linha rounded-lg px-3 py-2.5 text-sm font-normal text-marinho" /></label>
        <label className="block text-xs font-semibold text-marinho/70">CPF ou CNPJ<input value={doc} onChange={(e) => setDoc(e.target.value)} className="mt-1 w-full border border-linha rounded-lg px-3 py-2.5 text-sm font-normal text-marinho" /></label>
      </div>
      <label className="block text-xs font-semibold text-marinho/70">Observações finais (opcional)<textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} className="mt-1 w-full border border-linha rounded-lg px-3 py-2.5 text-sm font-normal text-marinho" /></label>
      <div>
        <div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold text-marinho/70">Assinatura (desenhe com o dedo)</span><button type="button" onClick={limpar} className="text-xs inline-flex items-center gap-1 underline"><Eraser size={13} /> Limpar</button></div>
        <canvas ref={cv} style={{ width: '100%', height: 180, touchAction: 'none' }} className="border-2 border-dashed border-linha rounded-xl bg-white" />
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1" /> Declaro que executei o serviço conforme o combinado, que o imóvel foi entregue limpo e em condições de uso, e que as informações e fotos enviadas são verdadeiras.</label>
      <button type="button" disabled={busy || !temFotoFinal || !aceite} onClick={enviar} className="w-full sm:w-auto rounded-full bg-verde text-white px-6 py-3 font-semibold disabled:opacity-50">{busy ? 'Assinando…' : emExecucao ? 'Assinar e concluir o serviço' : 'Assinar laudo'}</button>
    </div>
  );
}
