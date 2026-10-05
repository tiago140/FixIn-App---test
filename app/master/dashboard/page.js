import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import ChipIndicador from '@/components/ChipIndicador';
import PainelConteudo from '@/components/PainelConteudo';
import { MASTER_TABS } from '@/lib/navTabs';
import { calcularTotalComMargem, estaAtrasado } from '@/lib/format';
import { contagensFunil } from '@/lib/painel';
import FiltroImobiliaria from '@/components/FiltroImobiliaria';
import { resolverFiltro, opcoesFiltro } from '@/lib/filtroPainel';

export const dynamic = 'force-dynamic';

export default async function MasterDashboard({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  // Filtro por imobiliária (?cliente=<id>): só vale se for o id de uma imobiliária que existe.
  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa, ativo');
  const { data: contagem } = await supabase.from('orcamentos').select('cliente_id').limit(5000);
  const filtro = resolverFiltro(searchParams?.cliente, clientes);
  const opcoes = opcoesFiltro(clientes, contagem);

  let consulta = supabase
    .from('orcamentos')
    .select('*, clientes(nome_empresa), prestadores(nome), orcamento_itens(mo, ma)')
    .order('criado_em', { ascending: false })
    .limit(1000);
  if (filtro) consulta = consulta.eq('cliente_id', filtro.id);
  const { data: orcamentos } = await consulta;

  const lista = (orcamentos || []).map((o) => {
    const total = calcularTotalComMargem(o.orcamento_itens, o.margem_percentual);
    return { ...o, total, em_atraso: estaAtrasado({ ...o, total }), prestador_nome: o.prestadores?.nome || null };
  });
  const n = contagensFunil(lista);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="painel"
        titulo="Painel geral"
        subtitulo="Visão consolidada de todas as imobiliárias"
        direita={
          <>
            <ChipIndicador n={n.aguardando} texto="aguardando aprovação" tom="info" alvo="aguardando" />
            <ChipIndicador n={n.atrasados} texto="em atraso" tom="erro" alvo="atraso" />
          </>
        }
      />
      <FiltroImobiliaria opcoes={opcoes} selecionado={filtro?.id || null} totalGeral={(contagem || []).length} />
      <PainelConteudo orcamentos={lista} papel="master" veValores escopo={filtro?.nome_empresa || null} />
    </AppShell>
  );
}
