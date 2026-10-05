import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import NovaVisitaForm from '@/components/NovaVisitaForm';

export default async function NovaVisitaPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').eq('ativo', true).order('nome_empresa');
  const { data: prestadores } = await supabase.from('prestadores').select('id, nome').order('nome');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="visitas"
        titulo="Agendar visita"
      />
      <NovaVisitaForm clientes={clientes || []} prestadores={prestadores || []} />
    </AppShell>
  );
}
