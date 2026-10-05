import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import NovoLaudoForm from '@/components/NovoLaudoForm';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function NovoLaudoPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').eq('ativo', true).order('nome_empresa');
  const { data: orcamentos } = await supabase.from('orcamentos').select('id, numero, endereco, cliente_id').order('numero', { ascending: false }).limit(1000);
  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="laudos" titulo="Novo laudo de inspeção" subtitulo="Escolha a imobiliária e o imóvel; depois você descreve, coloca as fotos e gera o PDF" />
      <NovoLaudoForm clientes={clientes || []} orcamentos={orcamentos || []} />
    </AppShell>
  );
}
