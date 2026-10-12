import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import ContasSecao from '@/components/lancamentos/ContasSecao';

export const dynamic = 'force-dynamic';

// Financeiro = onde se paga e se recebe: contas a receber e a pagar. Só o perfil de gestão (dono) vê.
export default async function FinanceiroPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/resultados');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="financeiro"
        titulo="Financeiro"
        subtitulo="Contas a receber e a pagar: cobranças, comprovantes e pagamentos aos prestadores"
      />
      <ContasSecao supabase={supabase} />
    </AppShell>
  );
}
