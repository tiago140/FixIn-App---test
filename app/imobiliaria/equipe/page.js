import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
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
      <PageHeader
        icone="equipe"
        titulo="Equipe"
        etiqueta={profile.empresa}
        subtitulo="Usuários com acesso ao painel da sua imobiliária"
        direita={
          <>
        <Link href="/imobiliaria/equipe/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
          + Novo usuário
        </Link>
          </>
        }
      />

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
