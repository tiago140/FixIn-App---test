import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { MASTER_TABS } from '@/lib/navTabs';
import NovoAcessoForm from '@/components/NovoAcessoForm';

export default async function NovoAcessoPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').order('nome_empresa');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <h1 className="font-slab text-2xl font-semibold mb-6">Novo acesso</h1>
      <NovoAcessoForm clientes={clientes || []} />
      <p className="text-xs text-marinho/50 mt-4 max-w-md">
        Depois de criar, avise a pessoa por fora (WhatsApp, telefone) qual é o e-mail e a senha de acesso dela.
      </p>
    </AppShell>
  );
}
