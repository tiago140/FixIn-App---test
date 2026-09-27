import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import StatusTag from '@/components/StatusTag';
import { imobiliariaTabs } from '@/lib/navTabs';
import { fmtBRL, fmtDate, calcularTotalComMargem } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaDashboard() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*, orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false });

  const todos = (orcamentos || []).map((o) => ({ ...o, total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) }));
  const emAnalise = todos.filter((o) => o.status === 'pendente' || o.status === 'em_preparacao');
  const pendentesAprovacao = todos.filter((o) => o.status === 'enviado');
  const aprovados = todos.filter((o) => ['aprovado', 'em_execucao', 'finalizado'].includes(o.status));
  const totalAprovado = aprovados.reduce((a, o) => a + o.total, 0);

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6">
        <h1 className="font-slab text-2xl font-semibold">Seus orçamentos</h1>
      </div>

      <div className="grid grid-cols-3 gap-px bg-linha border border-linha mb-6">
        <Kpi num={String(todos.length)} lbl="no total" />
        <Kpi num={String(pendentesAprovacao.length)} lbl="aguardando você" />
        <Kpi num={fmtBRL(totalAprovado)} lbl="aprovado" />
      </div>

      <Link href="/imobiliaria/solicitar" className="block bg-verde text-white text-sm font-semibold px-4 py-3 rounded text-center mb-6">
        + Nova solicitação
      </Link>

      {emAnalise.length > 0 && (
        <>
          <h2 className="font-semibold text-sm mb-2">Suas solicitações em análise</h2>
          {emAnalise.map((o) => <LinhaOrcamento key={o.id} o={o} />)}
          <div className="h-6" />
        </>
      )}

      {pendentesAprovacao.length > 0 && (
        <>
          <h2 className="font-semibold text-sm mb-2">Aguardando sua aprovação</h2>
          {pendentesAprovacao.map((o) => <LinhaOrcamento key={o.id} o={o} />)}
          <div className="h-6" />
        </>
      )}

      <h2 className="font-semibold text-sm mb-2">Todos</h2>
      {todos.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum orçamento ainda.</div>
      ) : (
        todos.map((o) => <LinhaOrcamento key={o.id} o={o} />)
      )}
    </AppShell>
  );
}

function Kpi({ num, lbl }) {
  return (
    <div className="bg-white p-4">
      <span className="block font-mono text-xl font-semibold">{num}</span>
      <span className="text-xs text-marinho/50">{lbl}</span>
    </div>
  );
}

function LinhaOrcamento({ o }) {
  return (
    <Link href={`/imobiliaria/orcamentos/${o.id}`} className="flex items-center justify-between py-3 border-b border-linha hover:bg-white">
      <div>
        <span className="block text-[11px] font-mono text-marinho/50">{o.numero}</span>
        <span className="font-semibold">{o.endereco}</span>
        <div className="text-xs text-marinho/50">{fmtDate(o.criado_em)}</div>
      </div>
      <div className="text-right">
        <StatusTag status={o.status} />
        <div className="font-mono font-semibold mt-1">{fmtBRL(o.total)}</div>
      </div>
    </Link>
  );
}
