import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { imobiliariaTabs } from '@/lib/navTabs';
import { fmtBRL, PAGAMENTO_CLIENTE_LABEL, calcularTotalComMargem, estaAtrasado } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaFinanceiro() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: orcamentos } = await supabase.from('orcamentos').select('*, orcamento_itens(mo,ma)');
  const todos = (orcamentos || []).map((o) => ({ ...o, total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) }));
  const pendentesAprovacao = todos.filter((o) => o.status === 'enviado');
  const aprovados = todos.filter((o) => ['aprovado', 'em_execucao', 'finalizado'].includes(o.status));
  const totalAprovado = aprovados.reduce((a, o) => a + o.total, 0);
  const totalPago = aprovados.reduce((a, o) => a + (Number(o.valor_pago) || 0), 0);
  const totalFaltaPagar = Math.max(0, totalAprovado - totalPago);

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <h1 className="font-slab text-3xl font-semibold mb-1">Financeiro</h1>
      <div className="text-sm text-marinho/60 mb-6">Situação dos seus orçamentos</div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-linha border border-linha mb-8">
        <Kpi num={String(pendentesAprovacao.length)} lbl="aguardando sua aprovação" />
        <Kpi num={fmtBRL(totalAprovado)} lbl="total aprovado" />
        <Kpi num={fmtBRL(totalPago)} lbl="já pago" />
        <Kpi num={fmtBRL(totalFaltaPagar)} lbl="falta pagar" />
      </div>

      <h2 className="font-semibold text-xl mb-2">Orçamentos aprovados</h2>
      {aprovados.length === 0 && <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum orçamento aprovado ainda.</div>}
      {aprovados.map((o) => {
        const pend = Math.max(0, o.total - (o.valor_pago || 0));
        return (
          <Link key={o.id} href={`/imobiliaria/orcamentos/${o.id}`} className="flex justify-between items-center py-3 border-b border-linha">
            <div>
              <div className="text-[11px] font-mono text-marinho/50">{o.numero}</div>
              <div className="font-semibold">{o.endereco}</div>
              <div className="text-xs text-marinho/50">
                Total {fmtBRL(o.total)} · Pago {fmtBRL(o.valor_pago || 0)} · Falta {fmtBRL(pend)}
                {' · '}
                <span className={o.pagamento_cliente_status === 'pago_total' ? 'text-sucesso font-semibold' : o.pagamento_cliente_status === 'entrada_paga' ? 'text-info font-semibold' : ''}>
                  {PAGAMENTO_CLIENTE_LABEL[o.pagamento_cliente_status] || PAGAMENTO_CLIENTE_LABEL.aguardando}
                </span>
              </div>
            </div>
            {estaAtrasado(o) && <span className="tag tag-rejeitado">ATRASO</span>}
          </Link>
        );
      })}
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
