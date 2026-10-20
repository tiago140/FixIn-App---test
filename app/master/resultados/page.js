import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import ToggleAtraso from '@/components/ToggleAtraso';
import { GraficoBarrasClientes, GraficoBarrasAprovadoReprovado } from '@/components/DashboardCharts';
import { PAGAMENTO_CLIENTE_LABEL, fmtBRL, calcularTotalComMargem, calcularTotalItens, estaAtrasado } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ResultadosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard'); // só o dono

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
      <PageHeader
        icone="painel"
        titulo="Resultados"
        subtitulo="Totais aprovados, margem interna e desempenho por serviço e por imobiliária"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi num={fmtBRL(totalAprovadoGeral)} lbl="Aprovado" />
        <Kpi num={fmtBRL(totalAprovadoGeral - totalPagoGeral)} lbl="A receber" />
        <Kpi num={String(atrasadosGeral.length)} lbl="Em atraso" tom={atrasadosGeral.length ? 'erro' : ''} />
        <Kpi num={fmtBRL(totalReprovadoGeral)} lbl="Reprovado" />
        <Kpi num={fmtBRL(margemGeral)} lbl="Margem FixIn (só aqui)" destaque />
      </div>

      <div className="grid xl:grid-cols-2 gap-5 mb-8">
        <div className="card p-6">
          <h3 className="font-semibold text-base mb-3">Valor aprovado por imobiliária</h3>
          <GraficoBarrasClientes dados={dadosBarrasClientes} />
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-base mb-3">Aprovado x reprovado por tipo</h3>
          <GraficoBarrasAprovadoReprovado dados={dadosAprovadoReprovado} />
        </div>
      </div>

      <h2 className="font-semibold text-xl mb-3">Por imobiliária</h2>
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

      <h2 className="font-semibold text-xl mb-3 mt-8">Aprovados: marcar atraso</h2>
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

function Kpi({ num, lbl, tom = '', destaque = false }) {
  return (
    <div className={`card rounded-xl p-4 ${destaque ? 'border-l-4 border-l-accent' : ''}`}>
      <span className="block text-xs text-marinho/55">{lbl}</span>
      <span className={`block font-mono text-xl font-semibold mt-1 ${tom === 'erro' ? 'text-erro' : ''}`}>{num}</span>
    </div>
  );
}
