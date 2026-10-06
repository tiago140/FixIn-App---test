'use client';
import { useState } from 'react';
import { Printer, Download, ExternalLink, Loader2 } from 'lucide-react';

// Imprimir / baixar / abrir o PDF do orçamento (imobiliária). Disponível desde o envio e depois da aprovação.
export default function BotoesPdfOrcamento({ pdfUrl, nomeArquivo }) {
  const [imprimindo, setImprimindo] = useState(false);
  const [baixando, setBaixando] = useState(false);
  if (!pdfUrl) return null;

  async function obterBlob() {
    const r = await fetch(pdfUrl, { cache: 'no-store' });
    if (!r.ok) throw new Error('falha');
    return await r.blob();
  }

  async function imprimir() {
    setImprimindo(true);
    try {
      const blob = await obterBlob();
      const url = URL.createObjectURL(blob);
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      f.src = url;
      f.onload = () => {
        try { f.contentWindow.focus(); f.contentWindow.print(); }
        catch { window.open(url, '_blank'); }
        setTimeout(() => { URL.revokeObjectURL(url); f.remove(); }, 60000);
      };
      document.body.appendChild(f);
    } catch {
      window.open(pdfUrl, '_blank');
    } finally {
      setImprimindo(false);
    }
  }

  async function baixar() {
    setBaixando(true);
    try {
      const blob = await obterBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo || 'orcamento.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      window.open(pdfUrl, '_blank');
    } finally {
      setBaixando(false);
    }
  }

  const btn = 'inline-flex items-center justify-center gap-2 rounded-lg border border-marinho/30 bg-white px-4 py-2.5 text-sm font-semibold text-marinho hover:bg-marinho/5 disabled:opacity-60';
  return (
    <div className="flex flex-wrap gap-2 mt-4 print:hidden">
      <button type="button" onClick={imprimir} disabled={imprimindo} className={btn}>
        {imprimindo ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Imprimir orçamento
      </button>
      <button type="button" onClick={baixar} disabled={baixando} className={btn}>
        {baixando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Baixar PDF
      </button>
      <a href={pdfUrl} target="_blank" rel="noreferrer" className={btn}>
        <ExternalLink size={16} /> Abrir
      </a>
    </div>
  );
}
