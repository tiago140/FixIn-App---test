import BotaoVoltar from '@/components/BotaoVoltar';
import { urlArquivo } from '@/lib/arquivos';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { valoresMoMa } from '@/lib/nfse';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import Recolhivel from '@/components/Recolhivel';
import GestaoOrcamentoForm from '@/components/GestaoOrcamentoForm';
import { destinatariosDoOrcamento } from '@/lib/destinatarios';
import DocumentosFiscais from '@/components/DocumentosFiscais';
import ComprovantesPagamento from '@/components/ComprovantesPagamento';
import ExcluirOrcamentoButton from '@/components/ExcluirOrcamentoButton';
import Chat from '@/components/Chat';
import { MASTER_TABS } from '@/lib/navTabs';
import IniciarAcompanhamento from '@/components/IniciarAcompanhamento';
import DividirOrdens from '@/components/DividirOrdens';
import StatusOS from '@/components/StatusOS';
import { totalItensOS } from '@/lib/ordensStatus';
import { fmtBRL } from '@/lib/format';
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
    url: urlArquivo('documentos-fiscais', d.arquivo_path),
  }));

  const { data: comprovantesRaw } = await supabase
    .from('orcamento_comprovantes')
    .select('*')
    .eq('orcamento_id', params.id)
    .order('criado_em', { ascending: false });
  const comprovantes = (comprovantesRaw || []).map((c) => ({
    ...c,
    url: urlArquivo('comprovantes-pagamento', c.arquivo_path),
  }));
  const total = calcularTotalComMargem(itens, orcamento.margem_percentual);
  const destino = await destinatariosDoOrcamento(supabase, params.id);
  const { data: ordensDoOrc } = await supabase.from('ordens_servico').select('id, numero, status, prestadores(nome), os_itens(mo, ma)').eq('orcamento_id', params.id).order('criado_em');
  const { data: acomp } = await supabase.from('acompanhamentos').select('id, etapa, percentual').eq('orcamento_id', params.id).maybeSingle();

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <BotaoVoltar fallback="/master/orcamentos" />

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

      {['aprovado', 'em_execucao', 'finalizado'].includes(orcamento.status) && (
        <div className="mb-6 card rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-marinho/50 mb-2">Ordem de serviço</div>
          {(ordensDoOrc || []).length > 0 ? (
            <div className="space-y-2">
              {ordensDoOrc.map((o) => (
                <Link key={o.id} href={`/master/ordens/${o.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-linha px-4 py-3 hover:bg-papel">
                  <span><b>{o.numero}</b> <span className="text-sm text-marinho/60">· {o.prestadores?.nome || 'sem prestador'}</span></span>
                  <span className="flex items-center gap-3"><span className="font-mono text-sm font-semibold">{fmtBRL(totalItensOS(o.os_itens))}</span><StatusOS status={o.status} /></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm text-marinho/70">Este serviço ainda não tem ordem de serviço para o prestador.</span>
              <Link href={`/master/ordens/nova?orcamento=${orcamento.id}${orcamento.prestador_id ? `&prestador=${orcamento.prestador_id}` : ''}`} className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded-lg">Criar ordem de serviço</Link>
            </div>
          )}
        </div>
      )}

      {orcamento.status === 'pendente' && orcamento.solicitado_por && (() => {
        const qtd = (itens || []).length;
        const sem = (itens || []).filter((i) => (Number(i.mo) || 0) + (Number(i.ma) || 0) === 0).length;
        return (
          <div className="mb-6 rounded-lg border border-marinho/30 bg-marinho/5 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm">
              <div className="font-semibold text-marinho">Solicitação nova de {orcamento.clientes?.nome_empresa} — {orcamento.solicitado_por}</div>
              <div className="text-marinho/70 mt-0.5">
                {qtd > 0 ? <>Chegaram <b>{qtd}</b> {qtd === 1 ? 'item' : 'itens'} da vistoria{sem > 0 ? <>, <b>{sem}</b> sem preço</> : ' (todos com preço)'}.</> : 'Veio só com a descrição, sem itens.'} Use as ferramentas de IA abaixo dos itens ou digite os preços à mão. Nada vai para a imobiliária até você gerar o PDF.
              </div>
            </div>
            <a href="#ferramentas-ia" className="bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-2 whitespace-nowrap">Ir para as ferramentas de IA ↓</a>
          </div>
        );
      })()}

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
        <GestaoOrcamentoForm orcamento={orcamento} itensIniciais={itens || []} prestadores={prestadores || []} clientes={clientes || []} emailsDestino={destino.emails} />
        <Recolhivel titulo="Pagamentos e comprovantes" resumo={`${comprovantes.length} comprovante(s)`} aberto={comprovantes.length > 0 || documentos.length > 0 || ['aprovado','em_execucao','finalizado'].includes(orcamento.status)}>
          <div className="space-y-6">
        <ComprovantesPagamento
          orcamentoId={orcamento.id}
          comprovantes={comprovantes}
          role="master"
          total={total}
          valorPago={orcamento.valor_pago}
          pagamentoClienteStatus={orcamento.pagamento_cliente_status}
        />
        <DocumentosFiscais orcamentoId={orcamento.id} documentos={documentos} role="master" />
          </div>
        </Recolhivel>
        {(itens || []).length > 1 && (
          <Recolhivel titulo="Dividir itens entre prestadores" resumo={`${(ordensDoOrc || []).length} ordem(ns) já criada(s)`}>
            <DividirOrdens orcamentoId={orcamento.id} itens={(itens || []).map((i) => ({ id: i.id, ambiente: i.ambiente, servico: i.servico, mo: i.mo, ma: i.ma }))} prestadores={(prestadores || []).filter((p) => p.ativo !== false).map((p) => ({ id: p.id, nome: p.nome }))} ordens={ordensDoOrc || []} />
          </Recolhivel>
        )}
        {profile.dono && ['aprovado', 'em_execucao', 'finalizado'].includes(orcamento.status) && (() => {
          const v = valoresMoMa(itens, orcamento.margem_percentual);
          const f = (x) => x.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          return (
            <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-marinho">Nota fiscal</div>
                <div className="text-sm text-gray-600">NFS-e (só mão de obra): <b>{f(v.mo)}</b> · Material, em NF-e de produto: <b>{f(v.ma)}</b></div>
              </div>
              <Link href={`/master/financeiro/notas?orc=${orcamento.id}`} className="rounded-full px-5 py-2 text-sm font-semibold bg-marinho text-white">Emitir nota</Link>
            </div>
          );
        })()}
        {['aprovado', 'em_execucao', 'finalizado'].includes(orcamento.status) && <IniciarAcompanhamento orcamentoId={orcamento.id} acomp={acomp} />}
        <Chat orcamentoId={orcamento.id} profile={profile} mensagensIniciais={mensagens || []} />
        <Recolhivel titulo="Excluir orçamento" resumo="ação que não dá para desfazer">
        <ExcluirOrcamentoButton
          orcamentoId={orcamento.id}
          numero={orcamento.numero}
          endereco={orcamento.endereco}
          status={orcamento.status}
          statusLabel={STATUS_LABEL[orcamento.status] || orcamento.status}
          valorPago={orcamento.valor_pago}
        />
        </Recolhivel>
      </div>
    </AppShell>
  );
}
