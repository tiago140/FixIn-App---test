import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { ListaChamadosPainel } from '@/components/chamados/PainelChamados';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/chamados');
  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="chamados" titulo="Chamados" subtitulo="Pedidos abertos por locatários e locadores" />
      <ListaChamadosPainel supabase={supabase} base="/master/chamados" master={true} profile={profile} filtro={searchParams?.s} />
    </AppShell>
  );
}
