import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { imobiliariaTabs } from '@/lib/navTabs';
import SolicitarVisitaForm from '@/components/SolicitarVisitaForm';

export default async function NovaVisitaClientePage() {
  const { user, profile } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <h1 className="font-slab text-3xl font-semibold mb-6">Solicitar visita</h1>
      <SolicitarVisitaForm />
    </AppShell>
  );
}
