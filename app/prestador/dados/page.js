import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import PrestadorForm from '@/components/PrestadorForm';
import { PRESTADOR_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function PrestadorDados() {
  const { profile, supabase } = await getProfile();
  const { data: p } = await supabase.from('prestadores').select('*').eq('id', profile.prestador_id).maybeSingle();
  return (
    <AppShell profile={profile} tabs={PRESTADOR_TABS} homeHref="/prestador/dashboard">
      <PageHeader icone="dados" titulo="Meus dados" subtitulo="Contato, CPF ou CNPJ, conta bancária e Pix. Mantenha atualizado para receber seus pagamentos." />
      {p ? <PrestadorForm modo="proprio" inicial={p} /> : <p className="text-sm text-marinho/60">Seu cadastro não foi encontrado. Fale com a FixIn.</p>}
    </AppShell>
  );
}
