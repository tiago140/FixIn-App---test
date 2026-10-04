import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import AuditoriaLista from '@/components/AuditoriaLista';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function AuditoriaPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: registros } = await supabase
    .from('auditoria')
    .select('id, acao, detalhe, alvo_tipo, alvo_id, autor_nome, autor_role, criado_em')
    .order('criado_em', { ascending: false })
    .limit(500);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="auditoria"
        titulo="Auditoria"
        subtitulo="Registro de quem fez o quê e quando — protege você e sua equipe"
      />
      <AuditoriaLista registros={registros || []} />
    </AppShell>
  );
}
