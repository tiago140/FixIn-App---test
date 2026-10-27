import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EstornoForm from '@/components/EstornoForm';
import { imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function NovoEstorno() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/estornos');
  if (profile.subrole === 'operacional') redirect('/imobiliaria/dashboard');
  const { data: orcamentos } = await supabase.from('orcamentos_cliente').select('id, numero, endereco').order('numero', { ascending: false }).limit(300);

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader icone="estornos" titulo="Pedir estorno" etiqueta={profile.empresa} />
      <EstornoForm orcamentos={orcamentos || []} />
    </AppShell>
  );
}
