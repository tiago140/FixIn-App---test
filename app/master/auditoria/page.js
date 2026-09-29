import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
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
      <div className="border-b-2 border-marinho pb-3 mb-6">
        <h1 className="font-slab text-3xl font-semibold">Auditoria</h1>
        <div className="text-sm text-marinho/60">Registro de quem fez o quê e quando — protege você e sua equipe</div>
      </div>
      <AuditoriaLista registros={registros || []} />
    </AppShell>
  );
}
