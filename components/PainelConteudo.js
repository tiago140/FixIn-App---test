import Link from 'next/link';
import { ClipboardList, CheckCircle2, Wrench, AlertTriangle, CircleDollarSign, Hourglass, Plus, CalendarDays, Bell, ArrowRight } from 'lucide-react';
import PainelGraficos from '@/components/PainelGraficos';
import KpiCard from '@/components/KpiCard';
import SecaoOrcamentos from '@/components/SecaoOrcamentos';
import { fmtBRL } from '@/lib/format';
import { agruparPorEtapa, resumoPorEtapa, serieUltimosMeses, contagensFunil, temPendencia, ESTAGIOS_APROVADO } from '@/lib/painel';

// `orcamentos`: lista já normalizada pela página (campos total, valor_pago, em_atraso, prestador_nome...).
// `veValores`: false para o operacional da imobiliária — nenhum valor em R$ é desenhado.
export default function PainelConteudo({ orcamentos, papel = 'master', veValores = true, agora }) {
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
        ['Em preparação interna', '#B8862E', g.internos],
        ['Aguardando a imobiliária', '#3B6B8C', g.aguardando],
        ['Aprovado / em execução', '#3F7A5E', g.andamento],
        ['Finalizado', '#5A6459', g.finalizados],
        ['Rejeitado', '#A63A2D', g.rejeitados],
      ]
    : [
        ['Em atraso', '#C0392B', g.atrasados],
        ['Aguardando sua aprovação', '#3B6B8C', g.aguardando],
        ['Em análise pela FixIn', '#B8862E', g.internos],
        ['Aprovado / em execução', '#3F7A5E', g.andamento],
        ['Finalizado', '#5A6459', g.finalizados],
        ['Rejeitado', '#A63A2D', g.rejeitados],
      ];

  return (
    <>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icone={ClipboardList} cor="#182F50" num={String(n.criados)} lbl="orçamentos no total" />
          <KpiCard icone={CircleDollarSign} cor="#3F7A5E" num={fmtBRL(valorAprovado)} lbl="valor aprovado" />
          <KpiCard icone={Hourglass} cor="#3B6B8C" num={String(n.aguardando)} lbl="aguardando aprovação" />
          <KpiCard icone={AlertTriangle} cor="#B8862E" num={fmtBRL(valorPendente)} lbl="pendência financeira" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <KpiCard icone={ClipboardList} cor="#182F50" num={String(n.criados)} lbl="orçamentos criados" />
            <KpiCard icone={CheckCircle2} cor="#3F7A5E" num={String(n.aprovados)} lbl="aprovados" sub={veValores ? `${fmtBRL(valorAprovado)} aprovado` : null} />
            <KpiCard icone={Wrench} cor="#2C5570" num={String(n.emExecucao)} lbl="em execução" />
            <KpiCard icone={AlertTriangle} cor="#B8862E" num={String(n.pendencias)} lbl="em pendência financeira" sub={veValores ? `${fmtBRL(valorPendente)} a pagar` : null} />
          </div>
          <Link
            href="/imobiliaria/solicitar"
            className="flex items-center justify-center gap-2 bg-verde text-white text-base font-bold px-4 py-3.5 rounded-lg mb-6 shadow hover:brightness-110 transition"
          >
            <Plus size={20} /> Nova solicitação
          </Link>
        </>
      )}

      {lista.length > 0 && <PainelGraficos etapas={etapas} meses={meses} papel={papel} semValores={!veValores} />}

      {master && (
        <div className="flex gap-2.5 flex-wrap mb-6">
          <Atalho href="/master/orcamentos" icone={ClipboardList}>Ver Orçamentos</Atalho>
          <Atalho href="/master/visitas" icone={CalendarDays}>Ver visitas</Atalho>
          <Atalho href="/master/avisos" icone={Bell}>Ver avisos</Atalho>
        </div>
      )}

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
