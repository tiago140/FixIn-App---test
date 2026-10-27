import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EstornoCartao from '@/components/EstornoCartao';
import EstornoAcoes from '@/components/EstornoAcoes';
import { MASTER_TABS } from '@/lib/navTabs';
import { STATUS_ESTORNO } from '@/lib/estornos';

export const dynamic = 'force-dynamic';

const FILTROS = [['abertos', 'Para analisar'], ['aprovado', 'A pagar'], ['pago', 'Pagos'], ['recusado', 'Recusados'], ['todos', 'Todos']];

export default async function EstornosPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data } = await supabase.from('estornos').select('*, clientes(nome_empresa)').order('criado_em', { ascending: false }).limit(300);
  const todos = data || [];
  const filtro = FILTROS.some(([v]) => v === searchParams?.status) ? searchParams.status : 'abertos';
  const casa = (e, f) => (f === 'todos' ? true : f === 'abertos' ? ['solicitado', 'em_analise'].includes(e.status) : e.status === f);
  const lista = todos.filter((e) => casa(e, filtro));

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="estornos" titulo="Estornos" subtitulo="Pedidos de devolução das imobiliárias. Ao aprovar, vira conta a pagar no Financeiro" />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map(([v, r]) => (
          <Link key={v} href={`/master/estornos?status=${v}`} className={`rounded-full border px-4 py-2 text-sm font-semibold ${filtro === v ? 'border-marinho bg-marinho text-white' : 'border-linha bg-white text-marinho/70 hover:border-marinho/40'}`}>
            {r} <span className={filtro === v ? 'text-white/70' : 'text-marinho/40'}>{todos.filter((e) => casa(e, v)).length}</span>
          </Link>
        ))}
      </div>
      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-8 text-center text-marinho/60">Nenhum pedido {filtro === 'abertos' ? 'esperando análise' : 'neste filtro'}.</div>
      ) : (
        <div className="space-y-3">
          {lista.map((e) => (
            <EstornoCartao key={e.id} e={e} mostrarImobiliaria>
              {e.orcamento_id && <div className="mt-2 text-sm"><Link href={`/master/orcamentos/${e.orcamento_id}`} className="font-semibold text-marinho underline">Abrir o orçamento</Link></div>}
              <EstornoAcoes e={e} dono={!!profile.dono} />
              {!['solicitado', 'em_analise'].includes(e.status) && !(e.status === 'aprovado' && profile.dono) && <div className="mt-2 text-sm text-marinho/60">{STATUS_ESTORNO[e.status]?.dica}</div>}
            </EstornoCartao>
          ))}
        </div>
      )}
    </AppShell>
  );
}
