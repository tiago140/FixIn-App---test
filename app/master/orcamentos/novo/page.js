import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import NovoOrcamentoForm from '@/components/NovoOrcamentoForm';

export default async function NovoOrcamentoPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').eq('ativo', true).order('nome_empresa');
  const { data: catalogo } = await supabase.from('catalogo_itens').select('*').order('ambiente').order('servico');
  const tipoInicial = searchParams?.tipo === 'manutencao' ? 'manutencao' : 'rescisao';
  const enderecoInicial = searchParams?.endereco || '';
  const clienteIdInicial = searchParams?.cliente_id || '';

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="orcamentos"
        titulo={tipoInicial === 'manutencao' ? 'Nova solicitação de manutenção' : 'Novo orçamento'}
      />
      <NovoOrcamentoForm
        clientes={clientes || []}
        catalogo={catalogo || []}
        tipoInicial={tipoInicial}
        enderecoInicial={enderecoInicial}
        clienteIdInicial={clienteIdInicial}
      />
    </AppShell>
  );
}
