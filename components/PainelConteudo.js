import Link from 'next/link';
import { Plus, ArrowRight, Inbox } from 'lucide-react';
import SecaoOrcamentos from '@/components/SecaoOrcamentos';
import FunilOrcamentos from '@/components/FunilOrcamentos';
import PorImobiliaria from '@/components/PorImobiliaria';
import { agruparPorEtapa } from '@/lib/painel';

// `orcamentos`: lista já normalizada pela página (campos total, valor_pago, em_atraso, prestador_nome...).
// `veValores`: false para o operacional da imobiliária — nenhum valor em R$ é desenhado.
export default function PainelConteudo({ orcamentos, papel = 'master', veValores = true, agora, escopo = null }) {
  const lista = orcamentos || [];
  const g = agruparPorEtapa(lista);

  const master = papel === 'master';
  const basePath = master ? '/master/orcamentos' : '/imobiliaria/orcamentos';
  const verTodosHref = master ? '/master/orcamentos' : '/imobiliaria/kanban';

  const secoes = master
    ? [
        ['Em atraso', '#C0392B', g.atrasados],
        ['Novas solicitações', '#D9A441', g.solicitados],
        ['Em análise pela FixIn', '#B8862E', g.emAnalise],
        ['Aguardando a imobiliária', '#3B6B8C', g.aguardando],
        ['Aprovado / em execução', '#3F7A5E', g.andamento],
        ['Finalizado', '#5A6459', g.finalizados],
        ['Rejeitado', '#A63A2D', g.rejeitados],
      ]
    : [
        ['Em atraso', '#C0392B', g.atrasados],
        ['Aguardando sua aprovação', '#3B6B8C', g.aguardando],
        ['Solicitados (a FixIn vai orçar)', '#D9A441', g.solicitados],
        ['Em análise pela FixIn', '#B8862E', g.emAnalise],
        ['Aprovado / em execução', '#3F7A5E', g.andamento],
        ['Finalizado', '#5A6459', g.finalizados],
        ['Rejeitado', '#A63A2D', g.rejeitados],
      ];

  // Só o dono: solicitações que as imobiliárias mandaram e que ainda ninguém orçou
  const novasSolicitacoes = master ? lista.filter((o) => o.status === 'pendente' && o.solicitado_por) : [];

  return (
    <>
      {novasSolicitacoes.length > 0 && (
        <div className="bg-marinho/5 border border-marinho/30 rounded-lg mb-5 overflow-hidden">
          <div className="px-4 py-2.5 bg-marinho text-white text-sm font-semibold flex items-center gap-2">
            <Inbox size={18} /> {novasSolicitacoes.length} {novasSolicitacoes.length === 1 ? 'novo orçamento solicitado' : 'novos orçamentos solicitados'} — aguardando você orçar
          </div>
          {novasSolicitacoes.slice(0, 4).map((o) => (
            <Link key={o.id} href={`/master/orcamentos/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-marinho/15 hover:bg-white text-sm">
              <span className="min-w-0">
                <span className="font-mono text-[11px] text-marinho/50 mr-2">{o.numero}</span>
                <b>{o.endereco}</b>
                {o.clientes?.nome_empresa && <span className="text-marinho/60"> · {o.clientes.nome_empresa}</span>}
              </span>
              <span className="font-semibold text-marinho whitespace-nowrap inline-flex items-center gap-1">Abrir e orçar <ArrowRight size={14} /></span>
            </Link>
          ))}
          {novasSolicitacoes.length > 4 && <div className="px-4 py-2 border-t border-marinho/15 text-xs text-marinho/60">+ {novasSolicitacoes.length - 4} outra(s) — veja em Avisos</div>}
        </div>
      )}

      {!master && (
        <Link
          href="/imobiliaria/solicitar"
          className="flex items-center justify-center gap-2 bg-verde text-white text-base font-bold px-4 py-3.5 rounded-lg mb-6 shadow hover:brightness-110 transition"
        >
          <Plus size={20} /> Nova solicitação
        </Link>
      )}

      <FunilOrcamentos orcamentos={lista} papel={papel} veValores={veValores} agora={agora || new Date()} escopo={escopo} />

      {master && !escopo && <PorImobiliaria orcamentos={lista} agora={agora || new Date()} />}

      <div id="lista-orcamentos" className="scroll-mt-20">
      {secoes.map(([titulo, cor, itens]) => (
        <SecaoOrcamentos
          key={titulo}
          titulo={titulo}
          cor={cor}
          lista={itens}
          basePath={basePath}
          verTodosHref={verTodosHref}
          mostrarCliente={master}
          veValores={veValores}
          papel={papel}
          limite={['Finalizado', 'Rejeitado'].includes(titulo) ? 3 : 5}
        />
      ))}

      {lista.length === 0 && (
        <div className="border-2 border-dashed border-linha rounded-lg p-10 text-center text-marinho/50 bg-white">
          {master ? 'Nenhum orçamento ainda. Crie um na aba Orçamentos.' : 'Nenhum orçamento ainda.'}
        </div>
      )}
      </div>
    </>
  );
}
