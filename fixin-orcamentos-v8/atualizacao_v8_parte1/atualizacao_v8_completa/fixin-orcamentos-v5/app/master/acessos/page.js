import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import AcessosLista from '@/components/AcessosLista';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function AcessosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: todos } = await supabase
    .from('profiles')
    .select('id, role, subrole, nome_completo, email, ativo, dono, criado_em, clientes(nome_empresa)')
    .order('nome_completo');

  const lista = todos || [];
  const equipe = lista.filter((p) => p.role === 'master').sort((a, b) => Number(b.dono) - Number(a.dono));
  const imobiliarias = lista.filter((p) => p.role === 'imobiliaria');
  const outros = lista.filter((p) => p.role !== 'master' && p.role !== 'imobiliaria');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-slab text-2xl font-semibold">Equipe e acessos</h1>
          <div className="text-sm text-marinho/60">Cada pessoa com o seu próprio login — a Auditoria mostra quem fez o quê</div>
        </div>
        <div className="flex gap-2">
          {profile.dono && (
            <Link href="/master/acessos/novo?tipo=master" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
              Novo funcionário
            </Link>
          )}
          <Link href="/master/acessos/novo" className="border border-linha bg-white text-sm font-semibold px-4 py-2 rounded hover:bg-papel">
            Novo acesso de imobiliária
          </Link>
        </div>
      </div>

      <AcessosLista equipe={equipe} imobiliarias={imobiliarias} outros={outros} meuId={user.id} souDono={!!profile.dono} />
    </AppShell>
  );
}
