import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import CalendarioVisitas from '@/components/CalendarioVisitas';
import VisitaRow from '@/components/VisitaRow';
import { imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaVisitas() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: visitas } = await supabase.from('visitas').select('*, prestadores(nome, telefone)').order('data_hora');
  const lista = visitas || [];

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-slab text-3xl font-semibold">Visitas</h1>
          <div className="text-sm text-marinho/60">Agende uma visita — passa por aprovação da FixIn</div>
        </div>
        <Link href="/imobiliaria/visitas/nova" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
          + Solicitar visita
        </Link>
      </div>

      <CalendarioVisitas visitas={lista} />

      {lista.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhuma visita ainda.</div>
      ) : (
        lista.map((v) => <VisitaRow key={v.id} visita={v} role="imobiliaria" />)
      )}
    </AppShell>
  );
}
