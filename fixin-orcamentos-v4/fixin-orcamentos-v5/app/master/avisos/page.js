import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { MASTER_TABS } from '@/lib/navTabs';
import AvisosList from '@/components/AvisosList';
import { calcularTotalComMargem, estaAtrasado, diasDesde } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AvisosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: orcamentos } = await supabase.from('orcamentos').select('*, clientes(nome_empresa), orcamento_itens(mo,ma)');
  const { data: visitas } = await supabase.from('visitas').select('*, clientes(nome_empresa)').eq('status', 'pendente');
  const { data: mensagensRecentes } = await supabase
    .from('mensagens')
    .select('*, orcamentos(numero, endereco, cliente_id, clientes(nome_empresa))')
    .eq('autor_role', 'imobiliaria')
    .order('criado_em', { ascending: false })
    .limit(30);

  const atrasados = (orcamentos || [])
    .filter(estaAtrasado)
    .map((o) => ({
      key: `atraso-${o.id}-${o.valor_pago || 0}`,
      tipo: 'atraso',
      titulo: o.endereco,
      subtitulo: `${o.numero} · ${o.clientes?.nome_empresa || ''}`,
      detalhe: o.aprovado_em ? `Aprovado há ${diasDesde(o.aprovado_em)} dias, ainda pendente de pagamento` : '',
      valor: Math.max(0, calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) - (o.valor_pago || 0)),
      link: `/master/orcamentos/${o.id}`,
    }));

  const visitasPendentes = (visitas || []).map((v) => ({
    key: `visita-pendente-${v.id}`,
    tipo: 'visita',
    titulo: v.endereco,
    subtitulo: v.clientes?.nome_empresa || '',
    detalhe: v.solicitado_por ? `Solicitado por ${v.solicitado_por}` : '',
    link: '/master/visitas',
  }));

  const mensagens = (mensagensRecentes || [])
    .filter((m) => m.orcamentos)
    .filter((m) => diasDesde(m.criado_em) <= 5)
    .map((m) => ({
      key: `msg-${m.id}`,
      titulo: m.orcamentos.endereco,
      subtitulo: `${m.orcamentos.numero} · ${m.orcamentos.clientes?.nome_empresa || ''}`,
      detalhe: `${m.autor_nome}: ${m.texto ? m.texto.slice(0, 80) : '[anexo enviado]'}`,
      link: `/master/orcamentos/${m.orcamento_id}#chat`,
    }));

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <h1 className="font-slab text-2xl font-semibold mb-1">Avisos</h1>
      <div className="text-sm text-marinho/60 mb-6">Clique num aviso para dispensá-lo</div>
      <AvisosList visitas={visitasPendentes} atrasos={atrasados} mensagens={mensagens} />
    </AppShell>
  );
}
