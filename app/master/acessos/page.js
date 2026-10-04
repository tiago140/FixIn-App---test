import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import AcessosLista from '@/components/AcessosLista';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function AcessosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  // Duas consultas simples, juntadas aqui. Pedir "clientes(nome_empresa)" dentro de profiles NÃO funciona:
  // existem duas ligações entre essas tabelas (a pessoa pertence a uma imobiliária, e a imobiliária guarda quem a criou),
  // o banco recusa a consulta por ser ambígua e a lista aparecia vazia.
  const { data: todos, error: erroAcessos } = await supabase
    .from('profiles')
    .select('id, role, subrole, nome_completo, email, ativo, dono, criado_em, cliente_id')
    .order('nome_completo');
  const { data: imobs } = await supabase.from('clientes').select('id, nome_empresa');
  const nomePorId = Object.fromEntries((imobs || []).map((c) => [c.id, c.nome_empresa]));

  const lista = (todos || []).map((p) => ({ ...p, clientes: p.cliente_id ? { nome_empresa: nomePorId[p.cliente_id] || null } : null }));
  const equipe = lista.filter((p) => p.role === 'master').sort((a, b) => Number(b.dono) - Number(a.dono));
  const imobiliarias = lista.filter((p) => p.role === 'imobiliaria');
  const outros = lista.filter((p) => p.role !== 'master' && p.role !== 'imobiliaria');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="acessos"
        titulo="Equipe e acessos"
        subtitulo="Cada pessoa com o seu próprio login — a Auditoria mostra quem fez o quê"
        direita={
          <>
        <div className="flex gap-2">
          {profile.dono && (
            <Link href="/master/acessos/novo?tipo=master" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
              Novo funcionário
            </Link>
          )}
          <Link href="/master/acessos/novo" className="border border-linha bg-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:bg-papel">
            Novo acesso de imobiliária
          </Link>
        </div>
          </>
        }
      />

      {erroAcessos && (
        <div className="mb-5 bg-erro/10 border border-erro text-erro rounded-lg px-4 py-3 text-sm">
          <b>Não consegui carregar a lista de acessos.</b> {erroAcessos.message}
        </div>
      )}

      <AcessosLista equipe={equipe} imobiliarias={imobiliarias} outros={outros} meuId={user.id} souDono={!!profile.dono} />
    </AppShell>
  );
}
