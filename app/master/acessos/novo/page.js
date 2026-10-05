import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import NovoAcessoForm from '@/components/NovoAcessoForm';

export const dynamic = 'force-dynamic';

export default async function NovoAcessoPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').eq('ativo', true).order('nome_empresa');
  const pedeMaster = searchParams?.tipo === 'master' && !!profile.dono;

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="acessos"
        titulo={pedeMaster ? 'Novo funcionário' : 'Novo acesso'}
      />
      <NovoAcessoForm clientes={clientes || []} podeCriarMaster={!!profile.dono} tipoInicial={pedeMaster ? 'master' : 'imobiliaria'} />
    </AppShell>
  );
}
