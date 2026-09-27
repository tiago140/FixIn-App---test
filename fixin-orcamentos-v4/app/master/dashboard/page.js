import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import StatusTag from '@/components/StatusTag';
import { MASTER_TABS } from '@/lib/navTabs';
import { fmtBRL, fmtDate, calcularTotalComMargem, estaAtrasado } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MasterDashboard() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*, clientes(nome_empresa), orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false })
    .limit(500);

  const { data: visitasPendentes } = await supabase.from('visitas').select('id').eq('status', 'pendente');

  const lista = orcamentos || [];
  const comTotal = lista.map((o) => ({ ...o, total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) }));

  const pendentesAprovacao = comTotal.filter((o) => o.status === 'enviado');
  const aprovados = comTotal.filter((o) => ['aprovado', 'em_execucao', 'finalizado'].includes(o.status));
  const valorAprovado = aprovados.reduce((a, o) => a + o.total, 0);
  const pendenciaFinanceira = aprovados.reduce((a, o) => a + Math.max(0, o.total - (o.valor_pago || 0)), 0);
  const avisos = comTotal.filter(estaAtrasado).length + (visitasPendentes?.length || 0);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-slab text-2xl font-semibold">Painel geral</h1>
          <div className="text-sm text-marinho/60">Visão consolidada de todas as imobiliárias</div>
        </div>
        <Link href="/master/orcamentos/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
          Novo orçamento
        </Link>
      </div>

      {avisos > 0 && (
        <Link
          href="/master/avisos"
          className="block bg-alerta/15 border border-alerta text-marinho px-4 py-2.5 rounded mb-5 text-sm flex justify-between items-center"
        >
          <span>⚠ {avisos} aviso(s) pendente(s)</span>
          <span className="underline">Ver avisos</span>
        </Link>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-linha border border-linha mb-8">
        <Kpi num={String(lista.length)} lbl="orçamentos no total" />
        <Kpi num={fmtBRL(valorAprovado)} lbl="valor aprovado" />
        <Kpi num={String(pendentesAprovacao.length)} lbl="aguardando aprovação" />
        <Kpi num={fmtBRL(pendenciaFinanceira)} lbl="pendência financeira" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Atividade recente</h2>
        <Link href="/master/orcamentos" className="text-sm text-marinho/60 underline">
          Ver todos
        </Link>
      </div>

      {comTotal.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum orçamento criado ainda.</div>
      ) : (
        comTotal.slice(0, 8).map((o) => (
          <Link key={o.id} href={`/master/orcamentos/${o.id}`} className="flex items-center justify-between py-3 border-b border-linha hover:bg-papel">
            <div>
              <span className="block text-[11px] font-mono text-marinho/50">
                {o.numero} · {o.clientes?.nome_empresa}
                {o.tipo === 'manutencao' ? ' · MANUTENÇÃO' : ''}
              </span>
              <span className="font-semibold">{o.endereco}</span>
              <div className="text-xs text-marinho/50">{fmtDate(o.criado_em)}</div>
            </div>
            <div className="text-right">
              <StatusTag status={o.status} />
              <div className="font-mono font-semibold mt-1">{fmtBRL(o.total)}</div>
            </div>
          </Link>
        ))
      )}

      <div className="flex items-center justify-between mt-8 mb-3">
        <h2 className="font-semibold">Ações rápidas</h2>
      </div>
      <div className="flex gap-3 flex-wrap">
        <Link href="/master/orcamentos/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
          Novo orçamento
        </Link>
        <Link href="/master/orcamentos/novo?tipo=manutencao" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
          Nova solicitação de manutenção
        </Link>
        <Link href="/master/clientes/novo" className="border border-linha text-sm font-semibold px-4 py-2 rounded">
          Nova imobiliária
        </Link>
        <Link href="/master/acessos/novo" className="border border-linha text-sm font-semibold px-4 py-2 rounded">
          Novo acesso
        </Link>
        <Link href="/master/visitas/novo" className="border border-linha text-sm font-semibold px-4 py-2 rounded">
          Agendar visita
        </Link>
      </div>
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
