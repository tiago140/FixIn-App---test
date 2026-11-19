import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import Link from 'next/link';
import ContasSecao from '@/components/lancamentos/ContasSecao';

export const dynamic = 'force-dynamic';

// Financeiro = onde se paga e se recebe: contas a receber e a pagar. Só o perfil de gestão (dono) vê.
export default async function FinanceiroPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="financeiro"
        titulo="Financeiro"
        subtitulo="Contas a receber e a pagar: cobranças, comprovantes e pagamentos aos prestadores"
      />
      <div className="mb-3 text-sm"><Link href="/master/financeiro/visao" className="inline-block rounded-lg bg-marinho text-white px-3 py-1.5 font-medium mr-2">Visão por orçamento</Link><Link href="/master/financeiro/dre" className="inline-block rounded-lg border border-marinho text-marinho px-3 py-1.5 font-medium">DRE gerencial</Link></div>
      <ContasSecao supabase={supabase} />
    </AppShell>
  );
}
