import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { DetalheChamadoPainel } from '@/components/chamados/PainelChamados';

export const dynamic = 'force-dynamic';

export default async function Page({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/chamados');
  const corpo = await DetalheChamadoPainel({ supabase, id: params.id, master: true, podeExcluir: !!profile.dono, orcamentoHref: '/master/orcamentos' });
  if (!corpo) notFound();
  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="chamados" titulo="Chamado" direita={<Link href="/master/chamados" className="text-sm underline text-marinho">← Voltar</Link>} />
      {corpo}
    </AppShell>
  );
}
