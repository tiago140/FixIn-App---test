import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import Link from 'next/link';
import ResumoFinanceiro from '@/components/lancamentos/ResumoFinanceiro';
import { hojeSP } from '@/lib/lancamentos';
import ContasSecao from '@/components/lancamentos/ContasSecao';

export const dynamic = 'force-dynamic';

// Financeiro = onde se paga e se recebe: contas a receber e a pagar. Só o perfil de gestão (dono) vê.
export default async function FinanceiroPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard');

  const { data: lancs } = await supabase.from('lancamentos').select('tipo, status, valor, valor_pago, vencimento, data_pagamento').neq('status', 'cancelado').limit(20000);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="financeiro"
        titulo="Financeiro"
        subtitulo="Contas a receber e a pagar: cobranças, comprovantes e pagamentos aos prestadores"
      />
      <nav className="flex flex-wrap gap-2 mb-5 text-sm">
        <Link href="/master/financeiro" className="rounded-full px-4 py-1.5 bg-marinho text-white font-medium">Contas a receber e a pagar</Link>
        <Link href="/master/financeiro/visao" className="rounded-full px-4 py-1.5 border border-linha bg-white text-marinho font-medium hover:border-marinho">Visão por orçamento</Link>
        <Link href="/master/financeiro/dre" className="rounded-full px-4 py-1.5 border border-linha bg-white text-marinho font-medium hover:border-marinho">DRE gerencial</Link>
      </nav>
      <ResumoFinanceiro lancamentos={lancs || []} hoje={hojeSP()} />
      <ContasSecao supabase={supabase} />
    </AppShell>
  );
}
