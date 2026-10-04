import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import NovoPrestadorForm from '@/components/NovoPrestadorForm';

export default async function NovoPrestadorPage() {
  const { user, profile } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="prestadores"
        titulo="Novo prestador"
      />
      <NovoPrestadorForm />
    </AppShell>
  );
}
