import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import ControleTabela from '@/components/ControleTabela';
import { MASTER_TABS } from '@/lib/navTabs';
import { calcularTotalComMargem } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ControlePage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('id, numero, endereco, status, numero_contrato, data_deposito, data_inicio, comissao_percentual, margem_percentual, clientes(nome_empresa), prestadores(nome), orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false })
    .limit(2000);

  const linhas = (orcamentos || []).map((o) => {
    const total = calcularTotalComMargem(o.orcamento_itens, o.margem_percentual);
    const comissao = o.comissao_percentual != null ? Number(o.comissao_percentual) : 10;
    const valorImob = (total * comissao) / 100;
    return {
      id: o.id,
      cliente: o.clientes?.nome_empresa || '',
      numero_contrato: o.numero_contrato,
      endereco: o.endereco,
      temItens: (o.orcamento_itens || []).length > 0,
      status: o.status,
      data_deposito: o.data_deposito,
      total,
      comissao,
      valorImob,
      valorPrest: total - valorImob,
      prestador: o.prestadores?.nome || '',
      data_inicio: o.data_inicio,
    };
  });

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard" fullWidth>
      <PageHeader
        icone="controle"
        titulo="Controle"
        subtitulo="Visão em planilha — mesmo formato do seu controle de manutenção"
      />
      <ControleTabela linhas={linhas} role="master" podeEditar />
    </AppShell>
  );
}
