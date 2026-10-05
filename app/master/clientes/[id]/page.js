import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { MASTER_TABS } from '@/lib/navTabs';
import { fmtBRL, fmtDate, calcularTotalComMargem } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ClienteDetalhePage({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', params.id).single();
  if (!cliente) notFound();

  const { data: orcamentosRaw } = await supabase
    .from('orcamentos')
    .select('*, orcamento_itens(mo, ma)')
    .eq('cliente_id', params.id)
    .order('criado_em', { ascending: false });
  const orcamentos = (orcamentosRaw || []).map((o) => ({ ...o, total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) }));

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <Link href="/master/clientes" className="text-sm text-marinho/50">← voltar</Link>

      <PageHeader
        icone="clientes"
        titulo={cliente.nome_empresa}
        subtitulo={`${cliente.nome} ${cliente.email ? `· ${cliente.email}` : ''} ${cliente.cnpj ? `· CNPJ ${cliente.cnpj}` : ''}`}
        direita={cliente.ativo === false ? <span className="text-sm font-bold uppercase tracking-wide rounded-lg px-3 py-1.5 bg-erro text-white">Desativada</span> : null}
      />

      <h2 className="font-semibold text-xl mb-2">Orçamentos ({orcamentos.length})</h2>
      {orcamentos.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum orçamento ainda.</div>
      ) : (
        orcamentos.map((o) => (
          <Link key={o.id} href={`/master/orcamentos/${o.id}`} className="flex items-center justify-between py-3 border-b border-linha hover:bg-papel">
            <div>
              <span className="block text-[11px] font-mono text-marinho/50">{o.numero}</span>
              <span className="font-semibold">{o.endereco}</span>
              <div className="text-xs text-marinho/50">{fmtDate(o.criado_em)}</div>
            </div>
            <div className="text-right">
              <StatusTag status={o.status} />
              <div className="font-mono font-semibold mt-1">{fmtBRL(o.total)}</div>
            </div>
          </Link>
        ))
      )}
    </AppShell>
  );
}
