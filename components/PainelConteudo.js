import Link from 'next/link';
import { ClipboardList, CheckCircle2, Wrench, AlertTriangle, CircleDollarSign, Hourglass, Plus, CalendarDays, Bell, ArrowRight, Inbox } from 'lucide-react';
import PainelGraficos from '@/components/PainelGraficos';
import KpiCard from '@/components/KpiCard';
import AlvoRolagem from '@/components/AlvoRolagem';
import SecaoOrcamentos from '@/components/SecaoOrcamentos';
import FunilOrcamentos from '@/components/FunilOrcamentos';
import PorImobiliaria from '@/components/PorImobiliaria';
import { fmtBRL } from '@/lib/format';
import { agruparPorEtapa, resumoPorEtapa, serieUltimosMeses, contagensFunil, temPendencia, ESTAGIOS_APROVADO } from '@/lib/painel';

// `orcamentos`: lista já normalizada pela página (campos total, valor_pago, em_atraso, prestador_nome...).
// `veValores`: false para o operacional da imobiliária — nenhum valor em R$ é desenhado.
export default function PainelConteudo({ orcamentos, papel = 'master', veValores = true, agora, escopo = null }) {
  const lista = orcamentos || [];
  const g = agruparPorEtapa(lista);
  const etapas = resumoPorEtapa(g);
  const meses = serieUltimosMeses(lista, agora);
  const n = contagensFunil(lista);

  const aprovados = lista.filter((o) => ESTAGIOS_APROVADO.includes(o.status));
  const valorAprovado = aprovados.reduce((a, o) => a + (Number(o.total) || 0), 0);
  const valorPendente = lista.filter(temPendencia).reduce((a, o) => a + Math.max(0, (Number(o.total) || 0) - (Number(o.valor_pago) || 0)), 0);

  const master = papel === 'master';
  const basePath = master ? '/master/orcamentos' : '/imobiliaria/orcamentos';
  const verTodosHref = master ? '/master/orcamentos' : '/imobiliaria/kanban';
  const avisosHref = master ? '/master/avisos' : '/imobiliaria/avisos';

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

      {g.atrasados.length > 0 && (
        <Link
          href={avisosHref}
          className="bg-erro/10 border border-erro/50 text-marinho px-4 py-3 rounded-lg mb-5 text-sm flex justify-between items-center hover:bg-erro/15"
        >
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} className="text-erro" /> {g.atrasados.length} orçamento(s) com pagamento em atraso
          </span>
          <span className="underline inline-flex items-center gap-1">Ver avisos <ArrowRight size={14} /></span>
        </Link>
      )}

      {master ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <AlvoRolagem alvo="criado" n={n.criados} rotulo="Ver todos os orçamentos na lista abaixo"><KpiCard icone={ClipboardList} cor="#182F50" num={String(n.criados)} lbl="orçamentos no total" /></AlvoRolagem>
          <AlvoRolagem alvo="aprovado" n={n.aprovados} rotulo="Ver os orçamentos aprovados na lista abaixo"><KpiCard icone={CircleDollarSign} cor="#3F7A5E" num={fmtBRL(valorAprovado)} lbl="valor aprovado" /></AlvoRolagem>
          <AlvoRolagem alvo="aguardando" n={n.aguardando} rotulo="Ver os orçamentos aguardando aprovação na lista abaixo"><KpiCard icone={Hourglass} cor="#3B6B8C" num={String(n.aguardando)} lbl="aguardando aprovação" /></AlvoRolagem>
          <AlvoRolagem alvo="pendencia" n={n.pendencias} rotulo="Ver os orçamentos com pendência financeira na lista abaixo"><KpiCard icone={AlertTriangle} cor="#B8862E" num={fmtBRL(valorPendente)} lbl="pendência financeira" /></AlvoRolagem>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <AlvoRolagem alvo="criado" n={n.criados} rotulo="Ver todos os orçamentos na lista abaixo"><KpiCard icone={ClipboardList} cor="#182F50" num={String(n.criados)} lbl="orçamentos criados" /></AlvoRolagem>
            <AlvoRolagem alvo="aprovado" n={n.aprovados} rotulo="Ver os orçamentos aprovados na lista abaixo"><KpiCard icone={CheckCircle2} cor="#3F7A5E" num={String(n.aprovados)} lbl="aprovados" sub={veValores ? `${fmtBRL(valorAprovado)} aprovado` : null} /></AlvoRolagem>
            <AlvoRolagem alvo="execucao" n={n.emExecucao} rotulo="Ver os orçamentos em execução na lista abaixo"><KpiCard icone={Wrench} cor="#2C5570" num={String(n.emExecucao)} lbl="em execução" /></AlvoRolagem>
            <AlvoRolagem alvo="pendencia" n={n.pendencias} rotulo="Ver os orçamentos com pendência financeira na lista abaixo"><KpiCard icone={AlertTriangle} cor="#B8862E" num={String(n.pendencias)} lbl="em pendência financeira" sub={veValores ? `${fmtBRL(valorPendente)} a pagar` : null} /></AlvoRolagem>
          </div>
          <Link
            href="/imobiliaria/solicitar"
            className="flex items-center justify-center gap-2 bg-verde text-white text-base font-bold px-4 py-3.5 rounded-lg mb-6 shadow hover:brightness-110 transition"
          >
            <Plus size={20} /> Nova solicitação
          </Link>
        </>
      )}

      <FunilOrcamentos orcamentos={lista} papel={papel} veValores={veValores} agora={agora || new Date()} escopo={escopo} />

      {master && !escopo && <PorImobiliaria orcamentos={lista} agora={agora || new Date()} />}

      {lista.length > 0 && <PainelGraficos etapas={etapas} meses={meses} papel={papel} semValores={!veValores} />}

      {master && (
        <div className="flex gap-2.5 flex-wrap mb-6">
          <Atalho href="/master/orcamentos" icone={ClipboardList}>Ver Orçamentos</Atalho>
          <Atalho href="/master/visitas" icone={CalendarDays}>Ver visitas</Atalho>
          <Atalho href="/master/avisos" icone={Bell}>Ver avisos</Atalho>
        </div>
      )}

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

function Atalho({ href, icone: Icone, children }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 border border-linha bg-white text-sm font-semibold px-3.5 py-2 rounded-lg hover:bg-papel hover:shadow-sm transition">
      <Icone size={16} /> {children}
    </Link>
  );
}
