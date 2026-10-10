import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { imobiliariaTabs } from '@/lib/navTabs';
import { DetalheChamadoPainel } from '@/components/chamados/PainelChamados';

export const dynamic = 'force-dynamic';

export default async function Page({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/chamados');
  const corpo = await DetalheChamadoPainel({ supabase, id: params.id, master: false, orcamentoHref: '/imobiliaria/orcamentos' });
  if (!corpo) notFound();
  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader icone="chamados" titulo="Chamado" etiqueta={profile.empresa} direita={<Link href="/imobiliaria/chamados" className="text-sm underline text-marinho">← Voltar</Link>} />
      {corpo}
    </AppShell>
  );
}
