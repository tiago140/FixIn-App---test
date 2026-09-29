import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import CalendarioVisitas from '@/components/CalendarioVisitas';
import VisitaRow from '@/components/VisitaRow';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function VisitasPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: visitas } = await supabase.from('visitas').select('*, clientes(nome_empresa)').order('data_hora');
  const lista = visitas || [];
  const pendentes = lista.filter((v) => v.status === 'pendente');
  const confirmadas = lista.filter((v) => v.status === 'confirmada');
  const canceladas = lista.filter((v) => v.status === 'cancelada');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-slab text-3xl font-semibold">Visitas</h1>
          <div className="text-sm text-marinho/60">Confirmadas por você, ou solicitadas pelas imobiliárias</div>
        </div>
        <Link href="/master/visitas/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
          + Agendar visita
        </Link>
      </div>

      <CalendarioVisitas visitas={lista} />

      {lista.length === 0 && <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhuma visita ainda.</div>}

      {pendentes.length > 0 && (
        <>
          <h2 className="font-semibold text-xl mb-2 mt-6">Aguardando sua aprovação</h2>
          {pendentes.map((v) => <VisitaRow key={v.id} visita={v} cliente={v.clientes} role="master" />)}
        </>
      )}
      {confirmadas.length > 0 && (
        <>
          <h2 className="font-semibold text-xl mb-2 mt-6">Confirmadas</h2>
          {confirmadas.map((v) => <VisitaRow key={v.id} visita={v} cliente={v.clientes} role="master" />)}
        </>
      )}
      {canceladas.length > 0 && (
        <>
          <h2 className="font-semibold text-xl mb-2 mt-6">Canceladas</h2>
          {canceladas.map((v) => <VisitaRow key={v.id} visita={v} cliente={v.clientes} role="master" />)}
        </>
      )}
    </AppShell>
  );
}
