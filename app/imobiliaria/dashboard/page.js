import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PainelConteudo from '@/components/PainelConteudo';
import { imobiliariaTabs } from '@/lib/navTabs';
import { calcularTotalComMargem } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaDashboard() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*, orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false })
    .limit(1000);

  const todos = (orcamentos || []).map((o) => ({ ...o, total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) }));

  let nomeEmpresa = null;
  if (profile.cliente_id) {
    const { data: cli } = await supabase.from('clientes').select('nome_empresa').eq('id', profile.cliente_id).maybeSingle();
    nomeEmpresa = cli?.nome_empresa || null;
  }

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6">
        <h1 className="font-slab text-3xl font-semibold">Seus orçamentos</h1>
        {nomeEmpresa && <div className="text-sm text-marinho/60">{nomeEmpresa}</div>}
      </div>
      <PainelConteudo orcamentos={todos} papel="imobiliaria" />
    </AppShell>
  );
}
