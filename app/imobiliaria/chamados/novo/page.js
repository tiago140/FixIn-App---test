import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { imobiliariaTabs } from '@/lib/navTabs';
import NovoChamadoForm from '@/components/chamados/NovoChamadoForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/chamados');
  
  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader icone="chamados" titulo="Novo chamado" etiqueta={profile.empresa} direita={<Link href="/imobiliaria/chamados" className="text-sm underline text-marinho">← Voltar</Link>} />
      <NovoChamadoForm clientes={null} base="/imobiliaria/chamados" />
    </AppShell>
  );
}
