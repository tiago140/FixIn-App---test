import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: clientes } = await supabase.from('clientes').select('*').order('criado_em', { ascending: false });

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="clientes"
        titulo="Imobiliárias"
        subtitulo="Clientes cadastrados"
        direita={
          <>
        <Link href="/master/clientes/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
          Nova imobiliária
        </Link>
          </>
        }
      />

      {!clientes || clientes.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhuma imobiliária cadastrada.</div>
      ) : (
        clientes.map((c) => (
          <Link key={c.id} href={`/master/clientes/${c.id}`} className="py-3 border-b border-linha flex justify-between hover:bg-papel">
            <div>
              <div className="font-semibold text-marinho">{c.nome_empresa}</div>
              <div className="text-xs text-marinho/50">
                {c.nome} {c.email ? `· ${c.email}` : ''} {c.cnpj ? `· ${c.cnpj}` : ''}
              </div>
            </div>
          </Link>
        ))
      )}
    </AppShell>
  );
}
