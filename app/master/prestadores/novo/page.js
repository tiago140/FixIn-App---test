import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { MASTER_TABS } from '@/lib/navTabs';
import NovoPrestadorForm from '@/components/NovoPrestadorForm';

export default async function NovoPrestadorPage() {
  const { user, profile } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <h1 className="font-slab text-3xl font-semibold mb-6">Novo prestador</h1>
      <NovoPrestadorForm />
    </AppShell>
  );
}
