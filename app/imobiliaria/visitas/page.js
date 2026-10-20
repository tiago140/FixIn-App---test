import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import VisitasPainel from '@/components/VisitasPainel';
import { imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaVisitas() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  // O prestador vem pela visão protegida (só nome e telefone de quem atende esta imobiliária): RG e CPF ficam só com o dono.
  const { data: visitasBrutas } = await supabase.from('visitas').select('*').order('data_hora');
  const { data: prestadoresDaImob } = await supabase.from('prestadores_cliente').select('id, nome, telefone');
  const prestadorPorId = Object.fromEntries((prestadoresDaImob || []).map((p) => [p.id, { nome: p.nome, telefone: p.telefone }]));
  const visitas = (visitasBrutas || []).map((v) => ({ ...v, prestadores: v.prestador_id ? prestadorPorId[v.prestador_id] || null : null }));
  const lista = visitas || [];

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader
        icone="visitas"
        titulo="Visitas"
        etiqueta={profile.empresa}
        subtitulo="Peça uma visita e acompanhe se a FixIn confirmou"
        direita={
          <>
        <Link href="/imobiliaria/visitas/nova" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
          + Solicitar visita
        </Link>
          </>
        }
      />

      <VisitasPainel visitas={lista} role="imobiliaria" />
    </AppShell>
  );
}
