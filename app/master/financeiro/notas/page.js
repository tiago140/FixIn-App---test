import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { valoresMoMa } from '@/lib/nfse';
import { asaasBase } from '@/lib/asaas';
import NotasFiscais from '@/components/notas/NotasFiscais';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notas fiscais' };

export default async function NotasPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard');

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
      <PageHeader icone="financeiro" titulo="Notas fiscais" subtitulo="NFS-e da mão de obra pelo Asaas. O material sai em nota de produto, à parte." />
      <NotasFiscais cfg={cfg || {}} opcoes={opcoes} notas={lista} ambiente={ambiente} orcInicial={searchParams?.orc || ''} />
    </AppShell>
  );
}
