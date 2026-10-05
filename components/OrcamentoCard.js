import Link from 'next/link';
import { Clock, PencilRuler, Send, CheckCircle2, Wrench, BadgeCheck, XCircle, AlertTriangle, Check, HardHat } from 'lucide-react';
import { fmtBRL, fmtDate } from '@/lib/format';
import { ETAPAS_LINHA, SITUACAO, COR_ATRASO, PAGAMENTO_TEXTO, etapaAtual } from '@/lib/statusVisual';
import { temPendencia, faixaEspera } from '@/lib/painel';

const ICONES = { Clock, PencilRuler, Send, CheckCircle2, Wrench, BadgeCheck, XCircle };

// Cartão de um orçamento: situação em destaque, linha do tempo e (para quem pode ver valores) a barra de pagamento.
// Sem `veValores`, nenhum valor em R$ é desenhado — o dado nem chega aqui para o operacional.
export default function OrcamentoCard({ o, basePath, mostrarCliente = false, veValores = false, papel = 'master' }) {
  const sit = SITUACAO[o.status] || SITUACAO.pendente;
  const Icone = ICONES[sit.icone] || Clock;
  const rotulo = papel === 'imobiliaria' ? sit.rotuloImob : sit.rotulo;
  const atual = etapaAtual(o.status);
  const recusado = o.status === 'rejeitado';
  const emAtraso = !!o.em_atraso;
  const cor = emAtraso ? COR_ATRASO : sit.cor;
  const prestador = o.prestador_nome || o.prestadores?.nome;

  const aprovadoOuAdiante = ['aprovado', 'em_execucao', 'finalizado'].includes(o.status);
  const total = Number(o.total) || 0;
  const pago = Number(o.valor_pago) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0;
  const corBarra = pct >= 100 ? '#3F7A5E' : emAtraso ? COR_ATRASO : '#B8862E';

  // Em quais indicadores do painel este cartão entra (usado pelo clique nos indicadores, para destacá-lo)
  const contas = ['criado'];
  if (aprovadoOuAdiante) contas.push('aprovado');
  if (o.status === 'em_execucao') contas.push('execucao');
  if (o.status === 'enviado') contas.push('aguardando');
  if (temPendencia(o)) contas.push('pendencia');
  if (emAtraso) contas.push('atraso');
  contas.push(`st-${o.status}`);                                   // um por situação (o painel "O todo" clica por aqui)
  if (['pendente', 'em_preparacao'].includes(o.status)) contas.push('aorcar');
  const espera = faixaEspera(o);                                    // há quanto tempo está esperando resposta
  if (espera) contas.push(`espera-${espera}`);

  return (
    <Link
      href={`${basePath}/${o.id}`}
      data-kpi={contas.join(' ')}
      className="group block bg-white border border-linha rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition duration-200"
    >
      <div className="h-1.5" style={{ background: cor }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] font-mono text-marinho/50 truncate">
              {o.numero}
              {mostrarCliente && o.clientes?.nome_empresa ? ` · ${o.clientes.nome_empresa}` : ''}
              {o.tipo === 'manutencao' ? ' · MANUTENÇÃO' : ''}
            </span>
            <h3 className="font-semibold text-base sm:text-lg text-marinho leading-snug mt-0.5">{o.endereco}</h3>
            <div className="text-xs text-marinho/50 mt-0.5">{fmtDate(o.criado_em)}</div>
          </div>
          <span
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1 text-white"
            style={{ background: sit.cor }}
          >
            <Icone size={14} /> {rotulo}
          </span>
        </div>

        {emAtraso && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold rounded px-2.5 py-1.5" style={{ background: `${COR_ATRASO}1A`, color: COR_ATRASO }}>
            <AlertTriangle size={14} /> Pagamento em atraso
          </div>
        )}

        {recusado ? (
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-erro bg-erro/10 rounded px-3 py-2">
            <XCircle size={16} /> Orçamento recusado
          </div>
        ) : (
          <div className="mt-4 flex items-start" aria-label={`Etapa atual: ${ETAPAS_LINHA[atual]}`}>
            {ETAPAS_LINHA.map((nome, i) => {
              const feito = i < atual;
              const naEtapa = i === atual;
              const ativo = i <= atual;
              return (
                <div key={nome} className="relative flex-1 flex flex-col items-center">
                  {i > 0 && (
                    <span className="absolute top-3 -left-1/2 w-full h-0.5" style={{ background: ativo ? cor : '#DADCD3' }} />
                  )}
                  <span
                    className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{
                      background: ativo ? cor : '#fff',
                      border: ativo ? 'none' : '2px solid #DADCD3',
                      boxShadow: naEtapa ? `0 0 0 4px ${cor}33` : 'none',
                    }}
                  >
                    {feito && <Check size={14} strokeWidth={3} />}
                    {naEtapa && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  <span className={`mt-1.5 text-[10px] leading-tight text-center ${naEtapa ? 'font-bold text-marinho' : 'text-marinho/45'}`}>
                    {nome}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {aprovadoOuAdiante && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-marinho/70">{PAGAMENTO_TEXTO[o.pagamento_cliente_status] || PAGAMENTO_TEXTO.aguardando}</span>
              {veValores && <span className="text-marinho/60 font-mono">{pct}%</span>}
            </div>
            {veValores && (
              <>
                <div className="h-2 rounded-full bg-papel overflow-hidden border border-linha">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: corBarra }} />
                </div>
                <div className="text-[11px] text-marinho/50 mt-1">
                  Pago {fmtBRL(pago)} de {fmtBRL(total)}
                </div>
              </>
            )}
          </div>
        )}

        {(prestador || (veValores && o.total != null)) && (
          <div className="mt-4 pt-3 border-t border-linha flex items-center justify-between gap-2">
            <span className="text-xs text-marinho/60 flex items-center gap-1.5 min-w-0">
              {prestador && (
                <>
                  <HardHat size={14} className="flex-shrink-0" /> <span className="truncate">{prestador}</span>
                </>
              )}
            </span>
            {veValores && o.total != null && <span className="font-mono font-bold text-lg text-marinho">{fmtBRL(o.total)}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
