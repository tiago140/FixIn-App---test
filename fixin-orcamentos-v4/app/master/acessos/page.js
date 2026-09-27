import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function AcessosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: acessos } = await supabase
    .from('profiles')
    .select('*, clientes(nome_empresa)')
    .neq('role', 'master')
    .order('criado_em', { ascending: false });

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-slab text-2xl font-semibold">Equipe e acessos</h1>
          <div className="text-sm text-marinho/60">Logins de imobiliárias</div>
        </div>
        <Link href="/master/acessos/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
          Novo acesso
        </Link>
      </div>

      {!acessos || acessos.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum acesso criado ainda.</div>
      ) : (
        acessos.map((a) => (
          <div key={a.id} className="py-3 border-b border-linha flex justify-between">
            <div>
              <div className="font-semibold">{a.nome_completo}</div>
              <div className="text-xs text-marinho/50">
                {a.subrole === 'operacional' ? 'Operacional' : 'Administrador'}
                {a.clientes?.nome_empresa ? ` · ${a.clientes.nome_empresa}` : ''} · {a.email}
              </div>
            </div>
          </div>
        ))
      )}
    </AppShell>
  );
}
