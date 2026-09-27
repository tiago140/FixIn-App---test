import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { imobiliariaTabs } from '@/lib/navTabs';
import NovoAcessoImobiliariaForm from '@/components/NovoAcessoImobiliariaForm';

export default async function NovoAcessoImobiliariaPage() {
  const { user, profile } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');
  if (profile.subrole === 'operacional') redirect('/imobiliaria/dashboard');

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <h1 className="font-slab text-2xl font-semibold mb-6">Novo usuário</h1>
      <NovoAcessoImobiliariaForm />
      <p className="text-xs text-marinho/50 mt-4 max-w-md">
        Depois de criar, avise a pessoa por fora (WhatsApp, telefone) qual é o e-mail e a senha de acesso dela.
      </p>
    </AppShell>
  );
}
