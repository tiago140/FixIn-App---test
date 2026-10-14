import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { fmtBRL, fmtDate } from '@/lib/format';
import { ETAPAS_LINHA, SITUACAO, COR_ATRASO, etapaAtual } from '@/lib/statusVisual';
import { temPendencia, faixaEspera } from '@/lib/painel';

// Uma linha por orçamento: endereço em destaque, situação em uma etiqueta, cinco pontinhos de progresso
// e (para quem pode ver valores) o total e quanto já foi pago. Mantém os mesmos marcadores data-kpi do cartão antigo,
// que o clique nos indicadores do topo usa para rolar e destacar.
export default function OrcamentoLinha({ o, basePath, mostrarCliente = false, veValores = false, papel = 'master' }) {
  const sit = SITUACAO[o.status] || SITUACAO.pendente;
  const rotulo = papel === 'imobiliaria' ? sit.rotuloImob : sit.rotulo;
  const atual = etapaAtual(o.status);
  const emAtraso = !!o.em_atraso;
  const cor = emAtraso ? COR_ATRASO : sit.cor;
  const prestador = o.prestador_nome || o.prestadores?.nome;

  const aprovadoOuAdiante = ['aprovado', 'em_execucao', 'finalizado'].includes(o.status);
  const total = Number(o.total) || 0;
  const pago = Number(o.valor_pago) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0;

  const contas = ['criado'];
  if (aprovadoOuAdiante) contas.push('aprovado');
  if (o.status === 'em_execucao') contas.push('execucao');
  if (o.status === 'enviado') contas.push('aguardando');
  if (temPendencia(o)) contas.push('pendencia');
  if (emAtraso) contas.push('atraso');
  contas.push(`st-${o.status}`);
  if (['pendente', 'em_preparacao'].includes(o.status)) contas.push('aorcar');
  const espera = faixaEspera(o);
  if (espera) contas.push(`espera-${espera}`);

  const subtitulo = [mostrarCliente && o.clientes?.nome_empresa, prestador && `Prestador ${prestador}`, fmtDate(o.criado_em)].filter(Boolean).join(' · ');

  return (
    <Link href={`${basePath}/${o.id}`} data-kpi={contas.join(' ')}
      className="group flex items-center gap-3 rounded-lg border border-linha bg-white py-2.5 pl-0 pr-3 shadow-sm transition hover:shadow-md">
      <span className="h-10 w-1.5 shrink-0 rounded-r-full" style={{ background: cor }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-marinho" title={o.endereco}>{o.endereco}</div>
        <div className="mt-0.5 truncate text-[11px] text-marinho/55"><span className="font-mono">{o.numero}</span>{subtitulo ? ` · ${subtitulo}` : ''}</div>
      </div>

      {o.status !== 'rejeitado' && (
        <div className="hidden shrink-0 items-center md:flex" title={`Etapa: ${ETAPAS_LINHA[atual] || ''}`} aria-label={`Etapa atual: ${ETAPAS_LINHA[atual] || ''}`}>
          {ETAPAS_LINHA.map((nome, i) => (
            <div key={nome} className="flex items-center">
              {i > 0 && <span className="h-0.5 w-3" style={{ background: i <= atual ? cor : '#DADCD3' }} />}
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: i <= atual ? cor : '#fff', border: i <= atual ? 'none' : '2px solid #DADCD3', boxShadow: i === atual ? `0 0 0 3px ${cor}33` : 'none' }} />
            </div>
          ))}
        </div>
      )}

      {veValores && aprovadoOuAdiante && total > 0 && (
        <div className="hidden w-24 shrink-0 lg:block" title={`Pago ${fmtBRL(pago)} de ${fmtBRL(total)}`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-marinho/10"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? '#3F7A5E' : emAtraso ? COR_ATRASO : '#B8862E' }} /></div>
          <div className="mt-0.5 text-[10px] text-marinho/50">{pct}% pago</div>
        </div>
      )}

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span title={emAtraso ? 'Pagamento em atraso' : undefined} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: cor }}>
          {emAtraso && <AlertTriangle size={11} />}{emAtraso ? 'Em atraso' : rotulo}
        </span>
        {veValores && o.total != null && <span className="font-mono text-sm font-bold text-marinho">{fmtBRL(o.total)}</span>}
      </div>
    </Link>
  );
}
