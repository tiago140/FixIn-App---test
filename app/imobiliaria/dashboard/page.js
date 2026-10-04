import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import ChipIndicador from '@/components/ChipIndicador';
import PainelConteudo from '@/components/PainelConteudo';
import { imobiliariaTabs } from '@/lib/navTabs';
import { veValores } from '@/lib/permissoes';
import { contagensFunil } from '@/lib/painel';

export const dynamic = 'force-dynamic';

const num = (v) => (v == null ? null : Number(v));

export default async function ImobiliariaDashboard() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  // A imobiliária lê pela visão protegida: o banco já entrega só o que ela pode ver
  // (administrador: preço cheio; operacional: nenhum valor em R$). Custo e margem não existem aqui.
  const { data: linhas } = await supabase
    .from('orcamentos_cliente')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(1000);

  const lista = (linhas || []).map((o) => ({ ...o, total: num(o.total), valor_pago: num(o.valor_pago), valor_pendente: num(o.valor_pendente) }));
  const n = contagensFunil(lista);

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader
        icone="painel"
        titulo="Seus orçamentos"
        etiqueta={profile.empresa}
        direita={
          <>
            <ChipIndicador n={n.aguardando} texto="aguardando você" tom="info" />
            <ChipIndicador n={n.atrasados} texto="em atraso" tom="erro" />
          </>
        }
      />
      <PainelConteudo orcamentos={lista} papel="imobiliaria" veValores={veValores(profile)} />
    </AppShell>
  );
}
