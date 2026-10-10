import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { imobiliariaTabs } from '@/lib/navTabs';
import { ListaChamadosPainel } from '@/components/chamados/PainelChamados';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/chamados');
  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader icone="chamados" titulo="Chamados" etiqueta={profile.empresa} subtitulo="Pedidos abertos por locatários e locadores" />
      <ListaChamadosPainel supabase={supabase} base="/imobiliaria/chamados" master={false} profile={profile} filtro={searchParams?.s} />
    </AppShell>
  );
}
