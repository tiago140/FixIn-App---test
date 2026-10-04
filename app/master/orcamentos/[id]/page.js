import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import GestaoOrcamentoForm from '@/components/GestaoOrcamentoForm';
import DocumentosFiscais from '@/components/DocumentosFiscais';
import ComprovantesPagamento from '@/components/ComprovantesPagamento';
import ExcluirOrcamentoButton from '@/components/ExcluirOrcamentoButton';
import Chat from '@/components/Chat';
import { MASTER_TABS } from '@/lib/navTabs';
import { fmtDate, estaAtrasado, calcularTotalComMargem, STATUS_LABEL } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OrcamentoDetalhePage({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: orcamento } = await supabase
    .from('orcamentos')
    .select('*, clientes(nome_empresa, email)')
    .eq('id', params.id)
    .single();

  if (!orcamento) notFound();

  const { data: itens } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', params.id).order('ordem');
  const { data: mensagens } = await supabase.from('mensagens').select('*').eq('orcamento_id', params.id).order('criado_em');
  const { data: prestadores } = await supabase.from('prestadores').select('*').order('nome');
  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').order('nome_empresa');
  const { data: documentosRaw } = await supabase
    .from('orcamento_documentos_fiscais')
    .select('*')
    .eq('orcamento_id', params.id)
    .order('criado_em', { ascending: false });

  const documentos = (documentosRaw || []).map((d) => ({
    ...d,
    url: supabase.storage.from('documentos-fiscais').getPublicUrl(d.arquivo_path).data.publicUrl,
  }));

  const { data: comprovantesRaw } = await supabase
    .from('orcamento_comprovantes')
    .select('*')
    .eq('orcamento_id', params.id)
    .order('criado_em', { ascending: false });
  const comprovantes = (comprovantesRaw || []).map((c) => ({
    ...c,
    url: supabase.storage.from('comprovantes-pagamento').getPublicUrl(c.arquivo_path).data.publicUrl,
  }));
  const total = calcularTotalComMargem(itens, orcamento.margem_percentual);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <Link href="/master/orcamentos" className="text-sm text-marinho/50">← voltar</Link>

      <div className="mt-3">
        <PageHeader
          icone="orcamentos"
          titulo={orcamento.tipo === 'manutencao' ? `${orcamento.numero} · MANUTENÇÃO` : orcamento.numero}
          etiqueta={orcamento.clientes?.nome_empresa}
          subtitulo={`${orcamento.endereco} · criado em ${fmtDate(orcamento.criado_em)}`}
          direita={
            <>
              {estaAtrasado({ ...orcamento, orcamento_itens: itens }) && <span className="tag tag-rejeitado">ATRASO</span>}
              <StatusTag status={orcamento.status} />
            </>
          }
        />
      </div>

      {orcamento.descricao_solicitacao && (
        <div className="card p-4 mb-6 text-sm">
          <div className="text-xs text-marinho/50 mb-1">Solicitação{orcamento.solicitado_por ? ` de ${orcamento.solicitado_por}` : ''}</div>
          {orcamento.descricao_solicitacao}
        </div>
      )}

      {(orcamento.nome_cliente_final || orcamento.cpf_cliente_final || orcamento.cnpj_cliente_final) && (
        <div className="card p-4 mb-6 text-sm">
          <div className="text-xs text-marinho/50 mb-1">Cliente final (para NF/boleto)</div>
          {orcamento.nome_cliente_final && <div><b>Nome:</b> {orcamento.nome_cliente_final}</div>}
          {orcamento.cpf_cliente_final && <div><b>CPF:</b> {orcamento.cpf_cliente_final}</div>}
          {orcamento.cnpj_cliente_final && <div><b>CNPJ:</b> {orcamento.cnpj_cliente_final}</div>}
        </div>
      )}

      <div className="space-y-6">
        <GestaoOrcamentoForm orcamento={orcamento} itensIniciais={itens || []} prestadores={prestadores || []} clientes={clientes || []} />
        <ComprovantesPagamento
          orcamentoId={orcamento.id}
          comprovantes={comprovantes}
          role="master"
          total={total}
          valorPago={orcamento.valor_pago}
          pagamentoClienteStatus={orcamento.pagamento_cliente_status}
        />
        <DocumentosFiscais orcamentoId={orcamento.id} documentos={documentos} role="master" />
        <Chat orcamentoId={orcamento.id} profile={profile} mensagensIniciais={mensagens || []} />
        <ExcluirOrcamentoButton
          orcamentoId={orcamento.id}
          numero={orcamento.numero}
          endereco={orcamento.endereco}
          status={orcamento.status}
          statusLabel={STATUS_LABEL[orcamento.status] || orcamento.status}
          valorPago={orcamento.valor_pago}
        />
      </div>
    </AppShell>
  );
}
