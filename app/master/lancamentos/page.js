import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { hojeSP } from '@/lib/lancamentos';
import PainelLancamentos from '@/components/lancamentos/PainelLancamentos';

export const dynamic = 'force-dynamic';

// Contas a receber e a pagar. Só o DONO vê (o banco também bloqueia os demais).
export default async function LancamentosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard');

  const [{ data: lancamentos }, { data: clientes }, { data: prestadores }] = await Promise.all([
    supabase.from('lancamentos').select('*, clientes(nome_empresa), prestadores(nome)').order('vencimento', { ascending: true }),
    supabase.from('clientes').select('id, nome_empresa').order('nome_empresa'),
    supabase.from('prestadores').select('id, nome').order('nome'),
  ]);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="financeiro" titulo="Contas" subtitulo="A receber e a pagar — controle interno, visível somente para você" />
      <PainelLancamentos
        lancamentos={lancamentos || []}
        clientes={clientes || []}
        prestadores={prestadores || []}
        hoje={hojeSP()}
      />
    </AppShell>
  );
}
