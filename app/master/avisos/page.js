import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import AvisosList from '@/components/AvisosList';
import { buscarAvisos } from '@/lib/avisos';

export const dynamic = 'force-dynamic';

export default async function AvisosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { solicitacoes, visitas, atrasos, mensagens } = await buscarAvisos(supabase, profile);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="avisos"
        titulo="Avisos"
        subtitulo="Clique num aviso para dispensá-lo"
      />
      <AvisosList solicitacoes={solicitacoes} visitas={visitas} atrasos={atrasos} mensagens={mensagens} />
    </AppShell>
  );
}
