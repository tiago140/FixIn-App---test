import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import VisitasPainel from '@/components/VisitasPainel';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function VisitasPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: visitas } = await supabase.from('visitas').select('*, clientes(nome_empresa), prestadores(nome, telefone)').order('data_hora');
  const lista = visitas || [];

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="visitas"
        titulo="Visitas"
        subtitulo="Responda aos pedidos das imobiliárias e acompanhe o que está combinado"
        direita={
          <>
        <Link href="/master/visitas/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
          + Agendar visita
        </Link>
          </>
        }
      />

      <VisitasPainel visitas={lista} role="master" />
    </AppShell>
  );
}
