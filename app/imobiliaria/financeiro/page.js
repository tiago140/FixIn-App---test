import { redirect } from 'next/navigation';
import { Hourglass, CircleDollarSign, Banknote, AlertTriangle } from 'lucide-react';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import OrcamentoCard from '@/components/OrcamentoCard';
import { imobiliariaTabs } from '@/lib/navTabs';
import { veValores } from '@/lib/permissoes';
import { fmtBRL } from '@/lib/format';
import { ESTAGIOS_APROVADO } from '@/lib/painel';

export const dynamic = 'force-dynamic';

const num = (v) => (v == null ? null : Number(v));

export default async function ImobiliariaFinanceiro() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');
  // O operacional não vê valores em R$, então esta tela não existe para ele.
  if (!veValores(profile)) redirect('/imobiliaria/dashboard');

  const { data: linhas } = await supabase.from('orcamentos_cliente').select('*').order('criado_em', { ascending: false });
  const todos = (linhas || []).map((o) => ({ ...o, total: num(o.total), valor_pago: num(o.valor_pago), valor_pendente: num(o.valor_pendente) }));
  const aguardando = todos.filter((o) => o.status === 'enviado');
  const aprovados = todos.filter((o) => ESTAGIOS_APROVADO.includes(o.status));
  const totalAprovado = aprovados.reduce((a, o) => a + (o.total || 0), 0);
  const totalPago = aprovados.reduce((a, o) => a + (o.valor_pago || 0), 0);
  const totalFalta = aprovados.reduce((a, o) => a + (o.valor_pendente || 0), 0);

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader icone="financeiro" titulo="Financeiro" etiqueta={profile.empresa} subtitulo="Situação dos seus orçamentos" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icone={Hourglass} cor="#3B6B8C" num={String(aguardando.length)} lbl="aguardando sua aprovação" />
        <KpiCard icone={CircleDollarSign} cor="#182F50" num={fmtBRL(totalAprovado)} lbl="total aprovado" />
        <KpiCard icone={Banknote} cor="#3F7A5E" num={fmtBRL(totalPago)} lbl="já pago" />
        <KpiCard icone={AlertTriangle} cor="#B8862E" num={fmtBRL(totalFalta)} lbl="falta pagar" />
      </div>

      <h2 className="font-slab text-2xl font-bold text-marinho mb-3">Orçamentos aprovados</h2>
      {aprovados.length === 0 ? (
        <div className="border-2 border-dashed border-linha rounded-lg p-10 text-center text-marinho/50 bg-white">Nenhum orçamento aprovado ainda.</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {aprovados.map((o) => (
            <OrcamentoCard key={o.id} o={o} basePath="/imobiliaria/orcamentos" veValores papel="imobiliaria" />
          ))}
        </div>
      )}
    </AppShell>
  );
}
