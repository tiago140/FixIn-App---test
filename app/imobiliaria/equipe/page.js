import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function EquipePage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');
  if (profile.subrole === 'operacional') redirect('/imobiliaria/dashboard');

  const { data: equipe } = await supabase.from('profiles').select('*').eq('cliente_id', profile.cliente_id).order('criado_em');

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-slab text-3xl font-semibold">Equipe</h1>
          <div className="text-sm text-marinho/60">Usuários com acesso ao painel da sua imobiliária</div>
        </div>
        <Link href="/imobiliaria/equipe/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded">
          + Novo usuário
        </Link>
      </div>

      {!equipe || equipe.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum outro usuário ainda.</div>
      ) : (
        equipe.map((a) => (
          <div key={a.id} className="py-3 border-b border-linha">
            <div className="font-semibold">{a.nome_completo}</div>
            <div className="text-xs text-marinho/50">
              {a.subrole === 'operacional' ? 'Operacional' : 'Administrador'} · {a.email}
            </div>
          </div>
        ))
      )}
    </AppShell>
  );
}
