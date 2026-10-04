import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import ControleTabela from '@/components/ControleTabela';
import { imobiliariaTabs } from '@/lib/navTabs';
import { veValores } from '@/lib/permissoes';

export const dynamic = 'force-dynamic';

// Mesma visão do dono, mas só com os orçamentos da própria imobiliária. Comissão, margem e custo nem existem
// aqui (a visão do banco não tem essas colunas) e o operacional também não recebe o valor do orçamento.
export default async function ControleImobiliariaPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos_cliente')
    .select('id, numero, endereco, status, numero_contrato, data_deposito, data_inicio, prestador_nome, total, qtd_itens')
    .order('criado_em', { ascending: false })
    .limit(2000);

  const linhas = (orcamentos || []).map((o) => ({
    id: o.id,
    cliente: profile.empresa || '',
    numero_contrato: o.numero_contrato,
    endereco: o.endereco,
    temItens: Number(o.qtd_itens) > 0,
    status: o.status,
    data_deposito: o.data_deposito,
    total: o.total == null ? null : Number(o.total),
    prestador: o.prestador_nome || '',
    data_inicio: o.data_inicio,
  }));

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard" fullWidth>
      <PageHeader icone="controle" titulo="Controle" etiqueta={profile.empresa} subtitulo="Visão em planilha dos seus orçamentos" />
      <ControleTabela linhas={linhas} role="imobiliaria" podeEditar={false} veValores={veValores(profile)} />
    </AppShell>
  );
}
