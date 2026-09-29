import Link from 'next/link';
import PainelGraficos from '@/components/PainelGraficos';
import SecaoOrcamentos from '@/components/SecaoOrcamentos';
import { fmtBRL } from '@/lib/format';
import { agruparPorEtapa, resumoPorEtapa, serieUltimosMeses } from '@/lib/painel';

// `orcamentos` já vem com o campo `total` (com a margem) calculado.
export default function PainelConteudo({ orcamentos, papel = 'master', agora }) {
  const lista = orcamentos || [];
  const g = agruparPorEtapa(lista);
  const etapas = resumoPorEtapa(g);
  const meses = serieUltimosMeses(lista, agora);

  const aprovados = lista.filter((o) => ['aprovado', 'em_execucao', 'finalizado'].includes(o.status));
  const valorAprovado = aprovados.reduce((a, o) => a + o.total, 0);
  const aguardandoAprovacao = lista.filter((o) => o.status === 'enviado').length;
  const pendenciaFinanceira = aprovados.reduce((a, o) => a + Math.max(0, o.total - (o.valor_pago || 0)), 0);

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
          className="bg-alerta/15 border border-alerta text-marinho px-4 py-2.5 rounded mb-5 text-sm flex justify-between items-center"
        >
          <span>⚠ {g.atrasados.length} orçamento(s) com pagamento em atraso</span>
          <span className="underline">Ver avisos</span>
        </Link>
      )}

      {master ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiIcone icone="📋" num={String(lista.length)} lbl="orçamentos no total" />
          <KpiIcone icone="💰" num={fmtBRL(valorAprovado)} lbl="valor aprovado" />
          <KpiIcone icone="⏳" num={String(aguardandoAprovacao)} lbl="aguardando aprovação" />
          <KpiIcone icone="⚠️" num={fmtBRL(pendenciaFinanceira)} lbl="pendência financeira" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-px bg-linha border border-linha mb-6">
            <Kpi num={String(lista.length)} lbl="no total" />
            <Kpi num={String(aguardandoAprovacao)} lbl="aguardando você" />
            <Kpi num={fmtBRL(valorAprovado)} lbl="aprovado" />
          </div>
          <Link href="/imobiliaria/solicitar" className="block bg-verde text-white text-sm font-semibold px-4 py-3 rounded text-center mb-5">
            + Nova solicitação
          </Link>
        </>
      )}

      {lista.length > 0 && <PainelGraficos etapas={etapas} meses={meses} papel={papel} />}

      {master && (
        <div className="flex gap-2.5 flex-wrap mb-5">
          <Atalho href="/master/orcamentos">📋 Ver Orçamentos</Atalho>
          <Atalho href="/master/visitas">📅 Ver visitas</Atalho>
          <Atalho href="/master/avisos">🔔 Ver avisos</Atalho>
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
        />
      ))}

      {lista.length === 0 && (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">
          {master ? 'Nenhum orçamento ainda. Crie um na aba Orçamentos.' : 'Nenhum orçamento ainda.'}
        </div>
      )}
    </>
  );
}

function KpiIcone({ icone, num, lbl }) {
  return (
    <div className="card rounded-md p-5 flex items-center gap-4">
      <span className="text-4xl leading-none">{icone}</span>
      <div>
        <span className="block font-bold text-2xl xl:text-3xl">{num}</span>
        <span className="block text-sm text-marinho/60">{lbl}</span>
      </div>
    </div>
  );
}

function Kpi({ num, lbl }) {
  return (
    <div className="bg-white p-6">
      <span className="block font-mono text-2xl xl:text-3xl font-semibold">{num}</span>
      <span className="text-sm text-marinho/50">{lbl}</span>
    </div>
  );
}

function Atalho({ href, children }) {
  return (
    <Link href={href} className="border border-linha bg-white text-sm font-medium px-3 py-1.5 rounded hover:bg-papel">
      {children}
    </Link>
  );
}
