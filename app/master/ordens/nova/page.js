import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import NovaOrdemForm from '@/components/NovaOrdemForm';
import { MASTER_TABS } from '@/lib/navTabs';
import { STATUS_LABEL, fmtDataHoraSP } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function NovaOrdemPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const [{ data: prest }, { data: acessos }, { data: visitas }, { data: chamados }, { data: orcs }, { data: clientes }] = await Promise.all([
    supabase.from('prestadores').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('profiles').select('prestador_id').eq('role', 'prestador'),
    supabase.from('visitas').select('id, endereco, data_hora, status').order('data_hora', { ascending: false }).limit(100),
    supabase.from('chamados').select('id, numero, endereco, titulo').order('criado_em', { ascending: false }).limit(100),
    supabase.from('orcamentos').select('id, numero, endereco, status').order('criado_em', { ascending: false }).limit(150),
    supabase.from('clientes').select('id, nome_empresa').eq('ativo', true).order('nome_empresa'),
  ]);
  const comAcesso = new Set((acessos || []).map((a) => a.prestador_id));

  const inicial = {
    prestador_id: searchParams?.prestador || '',
    visita_id: searchParams?.visita || '', chamado_id: searchParams?.chamado || '', orcamento_id: searchParams?.orcamento || '',
    origem: searchParams?.visita ? 'visita' : searchParams?.chamado ? 'chamado' : searchParams?.orcamento ? 'orcamento' : 'visita',
  };

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="ordens" titulo="Nova ordem de serviço" subtitulo="O prestador recebe por e-mail e responde pelo portal" />
      <NovaOrdemForm
        inicial={inicial}
        prestadores={(prest || []).map((p) => ({ ...p, tem_acesso: comAcesso.has(p.id) }))}
        visitas={(visitas || []).map((v) => ({ id: v.id, rotulo: `${v.endereco} · ${fmtDataHoraSP(v.data_hora)}` }))}
        chamados={(chamados || []).map((c) => ({ id: c.id, rotulo: `${c.numero} · ${c.titulo} · ${c.endereco}` }))}
        orcamentos={(orcs || []).map((o) => ({ id: o.id, rotulo: `${o.numero} · ${o.endereco} · ${STATUS_LABEL[o.status] || o.status}` }))}
        clientes={clientes || []}
      />
    </AppShell>
  );
}
