import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import CartaoObra from '@/components/CartaoObra';
import { MASTER_TABS } from '@/lib/navTabs';
import { sincronizarAcompanhamentos } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';

const FILTROS = [['', 'Em andamento'], ['aguardando_material', 'Aguardando material'], ['concluida', 'Concluídas'], ['todas', 'Todas']];

export default async function AcompanhamentoMaster({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  await sincronizarAcompanhamentos(createAdminClient());

  const { data: acomps } = await supabase.from('acompanhamentos').select('*').order('atualizado_em', { ascending: false });
  const ids = (acomps || []).map((a) => a.orcamento_id);
  const { data: orcs } = ids.length ? await supabase.from('orcamentos').select('id, numero, endereco, clientes(nome_empresa)').in('id', ids) : { data: [] };
  const mapa = Object.fromEntries((orcs || []).map((o) => [o.id, o]));
  const f = FILTROS.some(([v]) => v === searchParams?.f) ? searchParams.f : '';
  const todas = acomps || [];
  const lista = todas.filter((a) => (f === 'todas' ? true : f === 'concluida' ? a.etapa === 'concluida' : f === 'aguardando_material' ? a.etapa === 'aguardando_material' : a.etapa !== 'concluida'));

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="acompanhamento" titulo="Acompanhamento de obras" subtitulo="Todas as obras iniciadas: etapa, fotos e o que foi feito, com link para o locador" />
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map(([v, l]) => (
          <Link key={v} href={v ? `/master/acompanhamento?f=${v}` : '/master/acompanhamento'} className={`text-sm rounded-full px-3.5 py-1.5 border ${f === v ? 'bg-marinho text-white border-marinho' : 'bg-white border-linha text-marinho/70'}`}>{l}{v === '' ? ` (${todas.filter((a) => a.etapa !== 'concluida').length})` : ''}</Link>
        ))}
      </div>
      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-8 text-center text-marinho/60">Nenhuma obra por aqui. O acompanhamento abre sozinho quando a obra começa, ou pelo botão dentro do orçamento aprovado.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {lista.map((a) => { const o = mapa[a.orcamento_id]; if (!o) return null; return <CartaoObra key={a.id} href={`/master/acompanhamento/${a.id}`} a={a} numero={o.numero} endereco={o.endereco} empresa={o.clientes?.nome_empresa} />; })}
        </div>
      )}
    </AppShell>
  );
}
