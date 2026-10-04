import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function PrestadoresPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: prestadores } = await supabase.from('prestadores').select('*').order('nome');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="prestadores"
        titulo="Prestadores"
        subtitulo="Cadastro da equipe de execução"
        direita={
          <>
        <Link href="/master/prestadores/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
          + Novo prestador
        </Link>
          </>
        }
      />

      {!prestadores || prestadores.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum prestador cadastrado ainda.</div>
      ) : (
        prestadores.map((p) => (
          <div key={p.id} className="py-3 border-b border-linha">
            <div className="font-semibold">{p.nome}</div>
            <div className="text-xs text-marinho/50">
              {p.telefone ? `Tel: ${p.telefone} · ` : ''}
              {p.cpf ? `CPF: ${p.cpf} · ` : ''}
              {p.rg ? `RG: ${p.rg}` : ''}
            </div>
          </div>
        ))
      )}
    </AppShell>
  );
}
