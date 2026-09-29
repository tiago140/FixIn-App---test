import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import ControleTabela from '@/components/ControleTabela';
import { imobiliariaTabs } from '@/lib/navTabs';
import { calcularTotalComMargem } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Mesma visão do dono, mas só com os orçamentos da própria imobiliária e sem comissão/margem —
// isso é informação interna da FixIn e nunca deve aparecer aqui, nem pro administrador da imobiliária.
export default async function ControleImobiliariaPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('id, numero, endereco, status, numero_contrato, data_deposito, data_inicio, margem_percentual, clientes(nome_empresa), prestadores(nome), orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false })
    .limit(2000);

  const linhas = (orcamentos || []).map((o) => ({
    id: o.id,
    cliente: o.clientes?.nome_empresa || '',
    numero_contrato: o.numero_contrato,
    endereco: o.endereco,
    temItens: (o.orcamento_itens || []).length > 0,
    status: o.status,
    data_deposito: o.data_deposito,
    total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual),
    prestador: o.prestadores?.nome || '',
    data_inicio: o.data_inicio,
  }));

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard" fullWidth>
      <div className="border-b-2 border-marinho pb-3 mb-6">
        <h1 className="font-slab text-3xl font-semibold">Controle</h1>
        <div className="text-sm text-marinho/60">Visão em planilha dos seus orçamentos</div>
      </div>
      <ControleTabela linhas={linhas} role="imobiliaria" podeEditar={false} />
    </AppShell>
  );
}
