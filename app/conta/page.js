import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
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
      <div className="border-b-2 border-marinho pb-3 mb-6">
        <h1 className="font-slab text-3xl font-semibold">Minha conta</h1>
        <div className="text-sm text-marinho/60">
          {profile.nome_completo} · {profile.email || user.email} · {tipo}
        </div>
      </div>
      <TrocarSenhaForm />
    </AppShell>
  );
}
