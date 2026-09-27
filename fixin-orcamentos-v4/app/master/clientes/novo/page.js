import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { MASTER_TABS } from '@/lib/navTabs';
import NovoClienteForm from '@/components/NovoClienteForm';

export default async function NovoClientePage() {
  const { user, profile } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <h1 className="font-slab text-2xl font-semibold mb-6">Nova imobiliária</h1>
      <NovoClienteForm />
    </AppShell>
  );
}
