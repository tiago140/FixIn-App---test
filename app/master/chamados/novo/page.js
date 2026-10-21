import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import NovoChamadoForm from '@/components/chamados/NovoChamadoForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/chamados');
  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').order('nome_empresa');
  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="chamados" titulo="Novo chamado" direita={<Link href="/master/chamados" className="text-sm underline text-marinho">← Voltar</Link>} />
      <NovoChamadoForm clientes={clientes || []} base="/master/chamados" />
    </AppShell>
  );
}
