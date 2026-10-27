import { STATUS_ESTORNO, COR_ESTORNO, PIX_TIPOS } from '@/lib/estornos';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

// Cartão de um pedido de estorno. Usado pela imobiliária (só leitura) e pela FixIn (com ações em `children`).
export default function EstornoCartao({ e, mostrarImobiliaria = false, mostrarPix = true, children }) {
  const st = STATUS_ESTORNO[e.status] || STATUS_ESTORNO.solicitado;
  return (
    <div className="rounded-xl border border-linha bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-60">
          <div className="text-xs font-mono text-marinho/50">
            {e.numero}{mostrarImobiliaria && e.clientes?.nome_empresa ? ` · ${e.clientes.nome_empresa}` : ''} · pedido em {fmtDataHoraSP(e.criado_em)}{e.solicitado_por ? ` por ${e.solicitado_por}` : ''}
          </div>
          <div className="mt-1 text-2xl font-bold leading-none text-marinho">{fmtBRL(e.valor)}</div>
          {e.endereco && <div className="mt-1 text-base font-semibold text-marinho break-words">{e.endereco}</div>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${COR_ESTORNO[st.cor]}`}>{st.rotulo}</span>
      </div>
      <div className="mt-3 rounded-lg bg-papel px-3 py-2 text-sm text-marinho/80"><b className="text-marinho">Motivo:</b> {e.motivo}</div>
      {mostrarPix && (
        <div className="mt-2 text-sm text-marinho/70">
          <b className="text-marinho">Quem recebe:</b> {e.favorecido}{e.documento ? ` (${e.documento})` : ''} · <b className="text-marinho">Pix {PIX_TIPOS[e.pix_tipo] || ''}:</b> <span className="font-mono">{e.pix_chave}</span>
        </div>
      )}
      {e.resposta && <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${e.status === 'recusado' ? 'bg-erro/10 text-erro' : 'bg-info/10 text-marinho'}`}><b>Resposta da FixIn:</b> {e.resposta}</div>}
      {!children && <div className="mt-2 text-sm text-marinho/60">{st.dica}</div>}
      {children}
    </div>
  );
}
