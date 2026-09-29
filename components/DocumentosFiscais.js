'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DocumentosFiscais({ orcamentoId, documentos, role }) {
  const router = useRouter();
  const [tipo, setTipo] = useState('nf');
  const [numero, setNumero] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [copiadoId, setCopiadoId] = useState(null);

  async function enviarArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    const fd = new FormData();
    fd.append('arquivo', file);
    fd.append('tipo', tipo);
    fd.append('numero', numero);
    await fetch(`/api/orcamentos/${orcamentoId}/documentos`, { method: 'POST', body: fd });
    setEnviando(false);
    setNumero('');
    e.target.value = '';
    router.refresh();
  }

  function copiarLink(url, id) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 1500);
    });
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm mb-3">Notas fiscais e boletos</h3>

      {role === 'master' && (
        <div className="flex flex-wrap gap-2 mb-4 items-end">
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="border border-linha rounded px-2 py-1.5 bg-papel text-sm">
              <option value="nf">Nota Fiscal</option>
              <option value="boleto">Boleto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Número/referência</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: NF 1234" className="border border-linha rounded px-2 py-1.5 bg-papel text-sm" />
          </div>
          <label className="border border-dashed border-linha rounded px-3 py-1.5 text-sm cursor-pointer text-marinho/70">
            {enviando ? 'Enviando…' : 'Selecionar arquivo'}
            <input type="file" accept="application/pdf,image/*" onChange={enviarArquivo} disabled={enviando} className="hidden" />
          </label>
        </div>
      )}

      {(!documentos || documentos.length === 0) ? (
        <div className="text-xs text-marinho/50">Nenhum documento adicionado ainda.</div>
      ) : (
        documentos.map((d) => (
          <div key={d.id} className="flex justify-between items-center py-2 border-b border-linha text-sm">
            <div>
              <span className="font-mono text-[10px] text-marinho/50">{d.tipo === 'nf' ? 'NOTA FISCAL' : 'BOLETO'}</span>
              <div className="font-medium">{d.numero || '—'}</div>
            </div>
            <div className="flex gap-2">
              <a href={d.url} target="_blank" rel="noreferrer" className="border border-linha rounded px-2 py-1 text-xs">Abrir</a>
              <button onClick={() => copiarLink(d.url, d.id)} className="border border-linha rounded px-2 py-1 text-xs">
                {copiadoId === d.id ? 'Copiado!' : 'Copiar link'}
              </button>
            </div>
          </div>
        ))
      )}
      {role === 'imobiliaria' && documentos?.length > 0 && (
        <div className="text-xs text-marinho/50 mt-2">Use &quot;Copiar link&quot; para enviar ao seu cliente por WhatsApp, e-mail, etc.</div>
      )}
    </div>
  );
}
