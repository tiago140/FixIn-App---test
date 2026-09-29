'use client';

import Link from 'next/link';
import { fmtDataHora } from '@/lib/format';

export default function AuditoriaLista({ registros }) {
  function exportarCsv() {
    const dados = [['Data/hora', 'Autor', 'Papel', 'Ação', 'Detalhe']];
    registros.forEach((r) => dados.push([fmtDataHora(r.criado_em), r.autor_nome, r.autor_role, r.acao, r.detalhe || '']));
    const csv = dados.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auditoria-fixin.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <div>
      <button onClick={exportarCsv} className="border border-linha bg-white text-sm font-medium px-3 py-1.5 rounded hover:bg-papel mb-4">
        Exportar CSV
      </button>
      {registros.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum registro ainda.</div>
      ) : (
        registros.map((r) => (
          <div key={r.id} className="py-3 border-b border-linha">
            <span className="block text-[11px] font-mono text-marinho/50">
              {fmtDataHora(r.criado_em)} · {r.autor_nome} ({r.autor_role === 'master' ? 'master' : r.autor_role})
            </span>
            <span className="font-semibold">
              {r.acao}
              {r.alvo_tipo === 'orcamento' && r.alvo_id && r.alvo_id !== 'x' && (
                <Link href={`/master/orcamentos/${r.alvo_id}`} className="ml-1 text-xs text-marinho/50 underline hover:text-marinho">abrir</Link>
              )}
            </span>
            {r.detalhe && <div className="text-xs text-marinho/60">{r.detalhe}</div>}
          </div>
        ))
      )}
    </div>
  );
}
