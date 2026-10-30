import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import CartaoObra from '@/components/CartaoObra';
import { imobiliariaTabs } from '@/lib/navTabs';
import { sincronizarAcompanhamentos } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';

const FILTROS = [['', 'Em andamento'], ['concluida', 'Concluídas'], ['todas', 'Todas']];

export default async function AcompanhamentoImobiliaria({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/acompanhamento');
  await sincronizarAcompanhamentos(createAdminClient());

  const { data: acomps } = await supabase.from('acompanhamentos').select('*').order('atualizado_em', { ascending: false });
  const ids = (acomps || []).map((a) => a.orcamento_id);
  const { data: orcs } = ids.length ? await supabase.from('orcamentos_cliente').select('id, numero, endereco').in('id', ids) : { data: [] };
  const mapa = Object.fromEntries((orcs || []).map((o) => [o.id, o]));
  const f = FILTROS.some(([v]) => v === searchParams?.f) ? searchParams.f : '';
  const todas = (acomps || []).filter((a) => mapa[a.orcamento_id]);
  const lista = todas.filter((a) => (f === 'todas' ? true : f === 'concluida' ? a.etapa === 'concluida' : a.etapa !== 'concluida'));

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader icone="acompanhamento" titulo="Acompanhamento de obras" etiqueta={profile.empresa} subtitulo="Veja em que pé está cada obra, com fotos e o que foi feito" />
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map(([v, l]) => (
          <Link key={v} href={v ? `/imobiliaria/acompanhamento?f=${v}` : '/imobiliaria/acompanhamento'} className={`text-sm rounded-full px-3.5 py-1.5 border ${f === v ? 'bg-marinho text-white border-marinho' : 'bg-white border-linha text-marinho/70'}`}>{l}{v === '' ? ` (${todas.filter((a) => a.etapa !== 'concluida').length})` : ''}</Link>
        ))}
      </div>
      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-8 text-center text-marinho/60">Nenhuma obra em acompanhamento. Quando uma obra sua começar, ela aparece aqui.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {lista.map((a) => { const o = mapa[a.orcamento_id]; return <CartaoObra key={a.id} href={`/imobiliaria/acompanhamento/${a.id}`} a={a} numero={o.numero} endereco={o.endereco} />; })}
        </div>
      )}
    </AppShell>
  );
}
