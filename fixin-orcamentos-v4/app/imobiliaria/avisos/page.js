import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { imobiliariaTabs } from '@/lib/navTabs';
import AvisosList from '@/components/AvisosList';
import { calcularTotalComMargem, estaAtrasado, diasDesde } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaAvisos() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: orcamentos } = await supabase.from('orcamentos').select('*, orcamento_itens(mo,ma)');
  const { data: visitas } = await supabase.from('visitas').select('*').neq('status', 'pendente');
  const { data: mensagensRecentes } = await supabase
    .from('mensagens')
    .select('*, orcamentos(numero, endereco)')
    .eq('autor_role', 'master')
    .order('criado_em', { ascending: false })
    .limit(30);

  const atrasados = (orcamentos || [])
    .filter(estaAtrasado)
    .map((o) => ({
      key: `atraso-${o.id}-${o.valor_pago || 0}`,
      titulo: o.endereco,
      subtitulo: o.numero,
      detalhe: o.aprovado_em ? `Aprovado há ${diasDesde(o.aprovado_em)} dias, ainda pendente de pagamento` : '',
      valor: Math.max(0, calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) - (o.valor_pago || 0)),
      link: `/imobiliaria/orcamentos/${o.id}`,
    }));

  const visitasRecentes = (visitas || [])
    .filter((v) => v.atualizado_em && diasDesde(v.atualizado_em) <= 3)
    .map((v) => ({
      key: `visita-decidida-${v.id}-${v.status}`,
      titulo: v.endereco,
      subtitulo: '',
      detalhe: `Sua visita foi ${v.status === 'confirmada' ? 'confirmada' : 'cancelada'} pela FixIn`,
      link: '/imobiliaria/visitas',
    }));

  const mensagens = (mensagensRecentes || [])
    .filter((m) => m.orcamentos)
    .filter((m) => diasDesde(m.criado_em) <= 5)
    .map((m) => ({
      key: `msg-${m.id}`,
      titulo: m.orcamentos.endereco,
      subtitulo: m.orcamentos.numero,
      detalhe: `${m.autor_nome}: ${m.texto ? m.texto.slice(0, 80) : '[anexo enviado]'}`,
      link: `/imobiliaria/orcamentos/${m.orcamento_id}#chat`,
    }));

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <h1 className="font-slab text-2xl font-semibold mb-1">Avisos</h1>
      <div className="text-sm text-marinho/60 mb-6">Clique num aviso para dispensá-lo</div>
      <AvisosList visitas={visitasRecentes} atrasos={atrasados} mensagens={mensagens} />
    </AppShell>
  );
}
