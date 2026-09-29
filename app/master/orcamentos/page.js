import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import KanbanBoard from '@/components/KanbanBoard';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function OrcamentosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*, clientes(nome_empresa), orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false });

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-slab text-3xl font-semibold">Kanban de orçamentos</h1>
          <div className="text-sm text-marinho/60">Arraste o cartão ou use as setinhas para mudar de etapa</div>
        </div>
        <div className="flex gap-2">
          <Link href="/master/orcamentos/novo?tipo=manutencao" className="border border-linha text-sm font-semibold px-3 py-2 rounded">
            + Manutenção
          </Link>
          <Link href="/master/orcamentos/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
            Novo
          </Link>
        </div>
      </div>
      <KanbanBoard orcamentos={orcamentos || []} basePath="/master/orcamentos" />
    </AppShell>
  );
}
