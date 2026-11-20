import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { valoresMoMa } from '@/lib/nfse';
import { asaasBase } from '@/lib/asaas';
import Link from 'next/link';
import NotasFiscais from '@/components/notas/NotasFiscais';
import ReciboForm from '@/components/notas/ReciboForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notas e recibos' };

export default async function NotasPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard');

  const aba = searchParams?.aba === 'recibos' ? 'recibos' : 'notas';
  let historico = [];
  if (aba === 'recibos') {
    const { data: h } = await supabase.from('recibos').select('id, criado_em, valor, dados').gte('criado_em', new Date(Date.now() - 30 * 86400000).toISOString()).order('id', { ascending: false }).limit(200);
    historico = h || [];
  }
  const { data: cfg } = await supabase.from('nf_config').select('*').eq('id', 1).maybeSingle();
  const { data: notas } = await supabase.from('notas_fiscais').select('id, criado_em, orcamento_id, tomador, descricao, valor, valor_material, nota_fiscal').order('id', { ascending: false }).limit(200);
  const { data: orcs } = await supabase.from('orcamentos').select('id, numero, endereco, status, cliente_id, margem_percentual, clientes(nome_empresa, nf_tomador), orcamento_itens(mo, ma)').in('status', ['aprovado', 'em_execucao', 'finalizado']).order('criado_em', { ascending: false }).limit(300);
  const numPorId = {};
  const opcoes = (orcs || []).map((o) => {
    const v = valoresMoMa(o.orcamento_itens, o.margem_percentual);
    numPorId[o.id] = o.numero;
    return { id: o.id, numero: o.numero, endereco: o.endereco, cliente: o.clientes?.nome_empresa || '', tomador: o.clientes?.nf_tomador || null, mo: v.mo, ma: v.ma };
  });
  let ambiente = 'producao'; try { ambiente = asaasBase().includes('sandbox') ? 'sandbox' : 'producao'; } catch (e) {}
  const lista = (notas || []).map((n) => ({ ...n, numero_orc: numPorId[n.orcamento_id] || '' }));

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="financeiro" titulo="Notas e recibos" subtitulo="NFS-e da mão de obra pelo Asaas e recibos em PDF" />
      <div className="flex gap-2 mt-4">
        {[['notas', 'Notas fiscais'], ['recibos', 'Recibos']].map(([k, l]) => (
          <Link key={k} href={`/master/financeiro/notas?aba=${k}`} className={`rounded-full px-5 py-1.5 text-sm font-medium border ${aba === k ? 'bg-marinho text-white border-marinho' : 'bg-white text-marinho border-linha'}`}>{l}</Link>
        ))}
      </div>
      {aba === 'recibos' ? <ReciboForm historico={historico} /> : <NotasFiscais cfg={cfg || {}} opcoes={opcoes} notas={lista} ambiente={ambiente} orcInicial={searchParams?.orc || ''} />}
    </AppShell>
  );
}
