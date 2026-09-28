import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PainelConteudo from '@/components/PainelConteudo';
import { MASTER_TABS } from '@/lib/navTabs';
import { calcularTotalComMargem } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MasterDashboard() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*, clientes(nome_empresa), orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false })
    .limit(1000);

  const comTotal = (orcamentos || []).map((o) => ({ ...o, total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) }));

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6">
        <h1 className="font-slab text-2xl font-semibold">Painel geral</h1>
        <div className="text-sm text-marinho/60">Visão consolidada de todas as imobiliárias</div>
      </div>
      <PainelConteudo orcamentos={comTotal} papel="master" />
    </AppShell>
  );
}
