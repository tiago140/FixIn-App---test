import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EstornoCartao from '@/components/EstornoCartao';
import { imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaEstornos() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/estornos');
  if (profile.subrole === 'operacional') redirect('/imobiliaria/dashboard');

  const { data } = await supabase.from('estornos').select('*').order('criado_em', { ascending: false });
  const lista = data || [];

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader
        icone="estornos"
        titulo="Estornos"
        etiqueta={profile.empresa}
        subtitulo="Peça a devolução de um valor e acompanhe a resposta da FixIn"
        direita={<Link href="/imobiliaria/estornos/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">+ Pedir estorno</Link>}
      />
      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-8 text-center text-marinho/60">Nenhum pedido de estorno ainda. Use “+ Pedir estorno” para enviar o primeiro.</div>
      ) : (
        <div className="space-y-3">{lista.map((e) => <EstornoCartao key={e.id} e={e} />)}</div>
      )}
    </AppShell>
  );
}
