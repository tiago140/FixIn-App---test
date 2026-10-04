import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { imobiliariaTabs } from '@/lib/navTabs';
import AvisosList from '@/components/AvisosList';
import { buscarAvisos } from '@/lib/avisos';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaAvisos() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { visitas, atrasos, mensagens } = await buscarAvisos(supabase, profile);

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader
        icone="avisos"
        titulo="Avisos"
        etiqueta={profile.empresa}
        subtitulo="Clique num aviso para dispensá-lo"
      />
      <AvisosList visitas={visitas} atrasos={atrasos} mensagens={mensagens} />
    </AppShell>
  );
}
