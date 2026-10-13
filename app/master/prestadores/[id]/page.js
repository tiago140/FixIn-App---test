import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import PrestadorForm from '@/components/PrestadorForm';
import AcessoPrestadorForm from '@/components/AcessoPrestadorForm';
import StatusOS from '@/components/StatusOS';

export const dynamic = 'force-dynamic';

export default async function PrestadorPage({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: p } = await supabase.from('prestadores').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  const [{ data: acesso }, { data: ordens }] = await Promise.all([
    supabase.from('profiles').select('id, email, ativo').eq('prestador_id', p.id).maybeSingle(),
    supabase.from('ordens_servico').select('id, numero, endereco, status, criado_em').eq('prestador_id', p.id).order('criado_em', { ascending: false }).limit(20),
  ]);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="prestadores"
        titulo={p.nome}
        subtitulo="Cadastro, acesso e ordens de serviço"
        direita={<Link href={`/master/ordens/nova?prestador=${p.id}`} className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">+ Nova ordem</Link>}
      />
      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <PrestadorForm modo="editar" inicial={p} />
        <div className="space-y-5">
          {acesso ? (
            <div className="card p-5 rounded-xl border-l-4 border-l-sucesso">
              <h3 className="font-semibold">Acesso ao portal</h3>
              <p className="text-sm text-marinho/70 mt-1">Login: <span className="font-mono">{acesso.email}</span></p>
              <p className="text-xs text-marinho/50 mt-1">{acesso.ativo === false ? 'Acesso desativado.' : 'Acesso ativo.'} Para trocar a senha ou desativar, use a tela Acessos.</p>
            </div>
          ) : (
            <AcessoPrestadorForm prestador={p} />
          )}
          <div className="card p-5 rounded-xl">
            <h3 className="font-semibold mb-3">Ordens recentes</h3>
            {!ordens?.length ? <p className="text-sm text-marinho/50">Nenhuma ordem ainda.</p> : (
              <ul className="space-y-2">
                {ordens.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/master/ordens/${o.id}`} className="min-w-0 hover:underline"><b>{o.numero}</b> <span className="text-marinho/60 truncate">· {o.endereco}</span></Link>
                    <StatusOS status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
