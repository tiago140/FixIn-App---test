'use client';

// Baixa a tabela como CSV (abre direto no Excel em português: separador ";" e vírgula decimal).
export default function ExportarCsv({ nome, cabecalho, linhas, rotulo = 'Baixar planilha (CSV)' }) {
  function baixar() {
    const num = (v) => (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : String(v ?? '').replace(/;/g, ','));
    const txt = [cabecalho, ...linhas].map((l) => l.map(num).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${nome}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" onClick={baixar} className="rounded-full px-4 py-1.5 border border-linha bg-white text-marinho text-sm font-medium hover:border-marinho">{rotulo}</button>;
}
