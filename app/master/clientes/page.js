import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import ClientesLista from '@/components/ClientesLista';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: clientesBrutos } = await supabase.from('clientes').select('*').order('nome_empresa');
  // quantos usuários ativos e quantos orçamentos cada imobiliária tem (mostrados na lista e no aviso de desativar)
  const { data: pessoas } = await supabase.from('profiles').select('cliente_id, ativo').eq('role', 'imobiliaria');
  const { data: orcs } = await supabase.from('orcamentos').select('cliente_id');
  const contar = (lista, filtro = () => true) => (lista || []).filter(filtro).reduce((m, x) => ({ ...m, [x.cliente_id]: (m[x.cliente_id] || 0) + 1 }), {});
  const usuariosAtivos = contar(pessoas, (p) => p.ativo !== false);
  const orcamentosPorCliente = contar(orcs);
  const clientes = (clientesBrutos || []).map((c) => ({ ...c, qtd_usuarios: usuariosAtivos[c.id] || 0, qtd_orcamentos: orcamentosPorCliente[c.id] || 0 }));

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
        <ClientesLista clientes={clientes} />
      )}
    </AppShell>
  );
}
