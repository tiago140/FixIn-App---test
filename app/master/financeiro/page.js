import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { MASTER_TABS } from '@/lib/navTabs';
import ToggleAtraso from '@/components/ToggleAtraso';
import { GraficoPizzaStatus, GraficoBarrasClientes, GraficoBarrasAprovadoReprovado } from '@/components/DashboardCharts';
import { STATUS_LABEL, PAGAMENTO_CLIENTE_LABEL, fmtBRL, calcularTotalComMargem, calcularTotalItens, estaAtrasado } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function FinanceiroPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: orcamentos } = await supabase.from('orcamentos').select('*, clientes(nome_empresa), orcamento_itens(mo,ma)');
  const { data: clientes } = await supabase.from('clientes').select('*').order('nome_empresa');

  const todos = orcamentos || [];
  const comTotal = todos.map((o) => ({
    ...o,
    total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual),
    base: calcularTotalItens(o.orcamento_itens),
  }));
  const aprovados = comTotal.filter((o) => ['aprovado', 'em_execucao', 'finalizado'].includes(o.status));
  const reprovados = comTotal.filter((o) => o.status === 'rejeitado');

  const totalAprovadoGeral = aprovados.reduce((a, o) => a + o.total, 0);
  const totalReprovadoGeral = reprovados.reduce((a, o) => a + o.total, 0);
  const totalPagoGeral = aprovados.reduce((a, o) => a + (Number(o.valor_pago) || 0), 0);
  const margemGeral = aprovados.reduce((a, o) => a + (o.total - o.base), 0);
  const atrasadosGeral = comTotal.filter(estaAtrasado);

  const dadosPizzaStatus = Object.keys(STATUS_LABEL).map((key) => ({
    key,
    name: STATUS_LABEL[key],
    value: comTotal.filter((o) => o.status === key).length,
  }));

  const dadosBarrasClientes = (clientes || [])
    .map((c) => ({
      nome: c.nome_empresa,
      valor: comTotal.filter((o) => o.cliente_id === c.id && ['aprovado', 'em_execucao', 'finalizado'].includes(o.status)).reduce((a, o) => a + o.total, 0),
    }))
    .filter((d) => d.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  const dadosAprovadoReprovado = [
    { tipo: 'Rescisão', Aprovado: aprovados.filter((o) => (o.tipo || 'rescisao') === 'rescisao').reduce((a, o) => a + o.total, 0), Reprovado: reprovados.filter((o) => (o.tipo || 'rescisao') === 'rescisao').reduce((a, o) => a + o.total, 0) },
    { tipo: 'Manutenção', Aprovado: aprovados.filter((o) => o.tipo === 'manutencao').reduce((a, o) => a + o.total, 0), Reprovado: reprovados.filter((o) => o.tipo === 'manutencao').reduce((a, o) => a + o.total, 0) },
  ];

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <h1 className="font-slab text-3xl font-semibold mb-1">Financeiro</h1>
      <div className="text-base text-marinho/60 mb-6">Visão completa — pagamentos, aprovação e margem interna</div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-linha border border-linha mb-6">
        <Kpi num={fmtBRL(totalAprovadoGeral)} lbl="total aprovado" />
        <Kpi num={fmtBRL(totalReprovadoGeral)} lbl="total reprovado" />
        <Kpi num={fmtBRL(totalAprovadoGeral - totalPagoGeral)} lbl="total pendente" />
        <Kpi num={String(atrasadosGeral.length)} lbl="em atraso" />
      </div>

      <div className="card p-5 border-l-4 border-l-accent mb-6">
        <div className="text-xs text-marinho/50 mb-1">Margem / lucro interno da FixIn — visível somente aqui</div>
        <div className="text-2xl font-bold">{fmtBRL(margemGeral)}</div>
      </div>

      <div className="grid xl:grid-cols-2 gap-5 mb-10">
        <div className="card p-6">
          <h3 className="font-semibold text-base mb-3">Orçamentos por etapa</h3>
          <GraficoPizzaStatus dados={dadosPizzaStatus} />
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-base mb-3">Aprovado x reprovado por tipo</h3>
          <GraficoBarrasAprovadoReprovado dados={dadosAprovadoReprovado} />
        </div>
      </div>

      <div className="card p-6 mb-10">
        <h3 className="font-semibold text-base mb-3">Valor aprovado por imobiliária</h3>
        <GraficoBarrasClientes dados={dadosBarrasClientes} />
      </div>

      <h2 className="font-semibold text-xl mb-3">Por tipo de serviço</h2>
      {['rescisao', 'manutencao'].map((tipo) => {
        const doTipo = comTotal.filter((o) => (o.tipo || 'rescisao') === tipo);
        const aprovadosTipo = doTipo.filter((o) => ['aprovado', 'em_execucao', 'finalizado'].includes(o.status));
        const reprovadosTipo = doTipo.filter((o) => o.status === 'rejeitado');
        const totalTipo = aprovadosTipo.reduce((a, o) => a + o.total, 0);
        return (
          <div key={tipo} className="flex justify-between items-center py-3 border-b border-linha">
            <div>
              <div className="font-semibold">{tipo === 'manutencao' ? 'Manutenção (contrato ativo)' : 'Rescisão / desocupação'}</div>
              <div className="text-xs text-marinho/50">
                {doTipo.length} no total · {aprovadosTipo.length} aprovado(s) · {reprovadosTipo.length} reprovado(s)
              </div>
            </div>
            <div className="text-sm">Aprovado: {fmtBRL(totalTipo)}</div>
          </div>
        );
      })}

      <h2 className="font-semibold text-xl mb-3 mt-8">Por imobiliária</h2>
      {(clientes || []).map((c) => {
        const os = aprovados.filter((o) => o.cliente_id === c.id);
        const reprovadosCliente = reprovados.filter((o) => o.cliente_id === c.id);
        const totalAprovado = os.reduce((a, o) => a + o.total, 0);
        const totalPago = os.reduce((a, o) => a + (Number(o.valor_pago) || 0), 0);
        const pendente = Math.max(0, totalAprovado - totalPago);
        const atrasadosCliente = os.filter(estaAtrasado);
        return (
          <div key={c.id} className="flex justify-between items-center py-3 border-b border-linha gap-2 flex-wrap">
            <div>
              <Link href={`/master/clientes/${c.id}`} className="font-semibold text-marinho hover:underline">{c.nome_empresa}</Link>
              <div className="text-xs text-marinho/50">
                {os.length} aprovado(s) · {reprovadosCliente.length} reprovado(s)
                {atrasadosCliente.length ? ` · ${atrasadosCliente.length} em atraso` : ''}
              </div>
            </div>
            <div className="text-right text-sm">
              <div>Aprovado: {fmtBRL(totalAprovado)}</div>
              <div>Pago: {fmtBRL(totalPago)}</div>
              <div className="text-erro font-semibold">Pendente: {fmtBRL(pendente)}</div>
            </div>
          </div>
        );
      })}

      <h2 className="font-semibold text-xl mb-3 mt-8">Orçamentos aprovados — detalhe e flags de atraso</h2>
      {aprovados.length === 0 && <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum orçamento aprovado ainda.</div>}
      {aprovados.map((o) => {
        const pend = Math.max(0, o.total - (o.valor_pago || 0));
        return (
          <div key={o.id} className="flex justify-between items-center py-3 border-b border-linha gap-2 flex-wrap">
            <div>
              <div className="text-[11px] font-mono text-marinho/50">
                <Link href={`/master/orcamentos/${o.id}`} className="hover:underline">{o.numero}</Link> ·{' '}
                <Link href={`/master/clientes/${o.cliente_id}`} className="hover:underline">{o.clientes?.nome_empresa}</Link>
              </div>
              <Link href={`/master/orcamentos/${o.id}`} className="font-semibold hover:underline">{o.endereco}</Link>
              <div className="text-xs text-marinho/50">
                Total {fmtBRL(o.total)} · Pago {fmtBRL(o.valor_pago || 0)} · Pendente {fmtBRL(pend)}
                {' · '}
                <span className={o.pagamento_cliente_status === 'pago_total' ? 'text-sucesso font-semibold' : o.pagamento_cliente_status === 'entrada_paga' ? 'text-info font-semibold' : ''}>
                  {PAGAMENTO_CLIENTE_LABEL[o.pagamento_cliente_status] || PAGAMENTO_CLIENTE_LABEL.aguardando}
                </span>
              </div>
            </div>
            <ToggleAtraso orcamentoId={o.id} atrasado={estaAtrasado(o)} />
          </div>
        );
      })}

      {reprovados.length > 0 && (
        <>
          <h2 className="font-semibold text-xl mb-3 mt-8">Reprovados</h2>
          {reprovados.map((o) => (
            <div key={o.id} className="flex justify-between items-center py-3 border-b border-linha">
              <div>
                <div className="text-[11px] font-mono text-marinho/50">
                  <Link href={`/master/orcamentos/${o.id}`} className="hover:underline">{o.numero}</Link> ·{' '}
                  <Link href={`/master/clientes/${o.cliente_id}`} className="hover:underline">{o.clientes?.nome_empresa}</Link>
                </div>
                <Link href={`/master/orcamentos/${o.id}`} className="font-semibold hover:underline">{o.endereco}</Link>
              </div>
              <div className="font-mono">{fmtBRL(o.total)}</div>
            </div>
          ))}
        </>
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
