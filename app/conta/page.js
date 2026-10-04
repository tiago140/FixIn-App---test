import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import TrocarSenhaForm from '@/components/TrocarSenhaForm';
import { MASTER_TABS, imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function MinhaConta() {
  const { user, profile } = await getProfile();
  if (!user || !profile) redirect('/login');

  const master = profile.role === 'master';
  const tipo = master ? (profile.dono ? 'Dono' : 'Funcionário FixIn (master)') : profile.subrole === 'operacional' ? 'Imobiliária · operacional' : 'Imobiliária · administrador';

  return (
    <AppShell profile={profile} tabs={master ? MASTER_TABS : imobiliariaTabs(profile)} homeHref={master ? '/master/dashboard' : '/imobiliaria/dashboard'}>
      <PageHeader
        icone="conta"
        titulo="Minha conta"
        subtitulo={`${profile.nome_completo} · ${profile.email || user.email} · ${tipo}`}
      />
      <TrocarSenhaForm />
    </AppShell>
  );
}
