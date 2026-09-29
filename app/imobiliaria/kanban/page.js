import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import KanbanBoard from '@/components/KanbanBoard';
import { imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaKanban() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*, orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false });

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6">
        <h1 className="font-slab text-3xl font-semibold">Kanban</h1>
        <div className="text-sm text-marinho/60">Acompanhamento dos seus orçamentos — somente visualização</div>
      </div>
      <KanbanBoard orcamentos={orcamentos || []} basePath="/imobiliaria/orcamentos" readOnly />
    </AppShell>
  );
}
