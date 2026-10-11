import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { hojeSP } from '@/lib/lancamentos';
import { tikpagConfigurado } from '@/lib/tikpag';
import { urlArquivo } from '@/lib/arquivos';
import PainelLancamentos from '@/components/lancamentos/PainelLancamentos';

export const dynamic = 'force-dynamic';

// Contas a receber e a pagar. Só o DONO vê (o banco também bloqueia os demais).
export default async function LancamentosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard');

  const [{ data: lancamentos }, { data: clientes }, { data: prestadores }] = await Promise.all([
    supabase.from('lancamentos').select('*, clientes(nome_empresa), prestadores(nome)').order('vencimento', { ascending: true }),
    supabase.from('clientes').select('id, nome_empresa').order('nome_empresa'),
    supabase.from('prestadores').select('id, nome').order('nome'),
  ]);

  // Comprovantes que as imobiliárias enviaram no orçamento (para conferir sem sair daqui).
  const ids = [...new Set((lancamentos || []).map((l) => l.orcamento_id).filter(Boolean))];
  let comprovantes = [];
  if (ids.length) {
    const { data } = await supabase.from('orcamento_comprovantes').select('id, orcamento_id, tipo_pagamento, valor, data_pagamento, verificado, arquivo_path, criado_em').in('orcamento_id', ids).order('criado_em', { ascending: true });
    comprovantes = (data || []).map((c) => ({ ...c, url: urlArquivo('comprovantes-pagamento', c.arquivo_path) }));
  }

  // Cobranças do Asaas (se a tabela ainda não existir, a tela continua funcionando sem elas).
  let cobrancas = [];
  try {
    const { data } = await supabase.from('cobrancas').select('id, lancamento_id, parcela, valor, url, status, vencimento, pago_em').order('criado_em', { ascending: true });
    cobrancas = data || [];
  } catch (e) {}
  const asaasPronto = !!process.env.ASAAS_API_KEY;

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="financeiro" titulo="Contas" subtitulo="A receber e a pagar — controle interno, visível somente para você" />
      <PainelLancamentos
        lancamentos={lancamentos || []}
        clientes={clientes || []}
        prestadores={prestadores || []}
        comprovantes={comprovantes}
        cobrancas={cobrancas}
        asaasPronto={asaasPronto}
        tikpagPronto={tikpagConfigurado()}
        ambiente={process.env.ASAAS_AMBIENTE === 'producao' ? 'producao' : 'sandbox'}
        hoje={hojeSP()}
      />
    </AppShell>
  );
}
