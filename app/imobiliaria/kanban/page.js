import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import KanbanBoard from '@/components/KanbanBoard';
import { imobiliariaTabs } from '@/lib/navTabs';
import { veValores } from '@/lib/permissoes';

export const dynamic = 'force-dynamic';

const num = (v) => (v == null ? null : Number(v));

export default async function ImobiliariaKanban() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: linhas } = await supabase
    .from('orcamentos_cliente')
    .select('*')
    .order('criado_em', { ascending: false });
  const orcamentos = (linhas || []).map((o) => ({ ...o, total: num(o.total) }));

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader icone="kanban" titulo="Orçamentos" etiqueta={profile.empresa} subtitulo="Acompanhamento dos seus orçamentos — somente visualização" />
      <KanbanBoard orcamentos={orcamentos} basePath="/imobiliaria/orcamentos" readOnly veValores={veValores(profile)} />
    </AppShell>
  );
}
