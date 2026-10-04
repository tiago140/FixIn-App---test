import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { imobiliariaTabs } from '@/lib/navTabs';
import SolicitarVisitaForm from '@/components/SolicitarVisitaForm';

export default async function NovaVisitaClientePage() {
  const { user, profile } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader
        icone="visitas"
        titulo="Solicitar visita"
        etiqueta={profile.empresa}
      />
      <SolicitarVisitaForm />
    </AppShell>
  );
}
