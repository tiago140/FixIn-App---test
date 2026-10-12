import { hojeSP } from '@/lib/lancamentos';
import { tikpagConfigurado } from '@/lib/tikpag';
import { urlArquivo } from '@/lib/arquivos';
import PainelLancamentos from '@/components/lancamentos/PainelLancamentos';

// Contas a receber e a pagar, dentro da página Financeiro. Só o DONO vê (o banco também bloqueia os demais).
export default async function ContasSecao({ supabase }) {
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
    <section id="contas" className="mb-10 scroll-mt-20">
      <h2 className="font-semibold text-xl mb-1">Contas a receber e a pagar</h2>
      <p className="text-xs text-marinho/50 mb-3">Controle interno, visível somente para você</p>
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
    </section>
  );
}
