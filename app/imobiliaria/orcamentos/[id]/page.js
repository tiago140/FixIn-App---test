import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import Chat from '@/components/Chat';
import DocumentosFiscais from '@/components/DocumentosFiscais';
import ComprovantesPagamento from '@/components/ComprovantesPagamento';
import BotoesPdfOrcamento from '@/components/BotoesPdfOrcamento';
import ResponderOrcamentoButtons from '@/components/ResponderOrcamentoButtons';
import { createAdminClient } from '@/lib/supabase/admin';
import { imobiliariaTabs } from '@/lib/navTabs';
import { veValores } from '@/lib/permissoes';
import { fmtBRL, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const num = (v) => (v == null ? null : Number(v));

export default async function ImobiliariaOrcamentoDetalhe({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');
  const ver = veValores(profile);

  // Tudo vem das visões protegidas: sem custo, margem ou comissão; valores só para o administrador.
  const { data: orcamento } = await supabase.from('orcamentos_cliente').select('*').eq('id', params.id).single();
  if (!orcamento) notFound();

  const { data: itens } = await supabase.from('orcamento_itens_cliente').select('*').eq('orcamento_id', params.id).order('ordem');
  const { data: mensagens } = await supabase.from('mensagens').select('*').eq('orcamento_id', params.id).order('criado_em');
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
    .from('orcamento_comprovantes_cliente')
    .select('*')
    .eq('orcamento_id', params.id)
    .order('criado_em', { ascending: false });
  const comprovantes = (comprovantesRaw || []).map((c) => ({
    ...c,
    valor: num(c.valor),
    url: supabase.storage.from('comprovantes-pagamento').getPublicUrl(c.arquivo_path).data.publicUrl,
  }));

  // O PDF do orçamento pode ser impresso por qualquer usuário da imobiliária (a visão protegida o esconde do operacional, então lemos só esse campo no servidor, após a checagem acima).
  let pdfUrlImpressao = orcamento.pdf_url || null;
  if (!pdfUrlImpressao) {
    try { const { data: p } = await createAdminClient().from('orcamentos').select('pdf_url').eq('id', params.id).single(); pdfUrlImpressao = p?.pdf_url || null; } catch (e) {}
  }
  const total = num(orcamento.total);
  // Administrador: vê tudo. Operacional: só valor e PDF dos orçamentos que ELA mesma solicitou — o banco já devolve nulo nos outros.
  const verEste = ver || total != null;

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <Link href="/imobiliaria/dashboard" className="text-sm text-marinho/50">← voltar</Link>

      <div className="mt-3">
        <PageHeader
          icone="orcamentos"
          titulo={orcamento.numero}
          etiqueta={profile.empresa}
          subtitulo={`${orcamento.endereco} · criado em ${fmtDate(orcamento.criado_em)}`}
          direita={
            <>
              {orcamento.em_atraso && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full px-3 py-1 bg-erro/10 text-erro border border-erro/40">
                  <AlertTriangle size={14} /> Pagamento em atraso
                </span>
              )}
              <StatusTag status={orcamento.status} />
            </>
          }
        />
      </div>

      <div className="space-y-6">
        {['enviado', 'aprovado', 'em_execucao', 'finalizado', 'rejeitado'].includes(orcamento.status) && (
          <div className="card p-5">
            <div className="text-xs text-marinho/50">Orçamento em PDF</div>
            <BotoesPdfOrcamento pdfUrl={pdfUrlImpressao} nomeArquivo={`${orcamento.numero}.pdf`} orcamentoId={orcamento.id} />
          </div>
        )}
        <div className="card p-5">
          <div className="text-xs text-marinho/50 mb-1">Ambientes e serviços</div>
          {(itens || []).map((it) => (
            <div key={it.id} className="py-1.5 border-b border-linha text-sm flex justify-between gap-3">
              <div>
                <span className="text-marinho/50">{it.ambiente} · </span>
                <span className="font-medium">{it.servico}</span>
                {it.descricao ? <span className="text-marinho/60"> — {it.descricao}</span> : null}
              </div>
              {verEste && it.preco != null && <span className="font-mono text-marinho/70 whitespace-nowrap">{fmtBRL(it.preco)}</span>}
            </div>
          ))}
          {orcamento.garantia && (
            <div className="mt-3 text-sm"><span className="font-semibold">Garantia: </span>{orcamento.garantia}</div>
          )}
          {verEste && total != null && (
            <div className="mt-4 flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="font-mono">{fmtBRL(total)}</span>
            </div>
          )}
        </div>

        {orcamento.status === 'enviado' && <ResponderOrcamentoButtons orcamentoId={orcamento.id} />}
        {['pendente', 'em_preparacao'].includes(orcamento.status) && (
          <ResponderOrcamentoButtons
            orcamentoId={orcamento.id}
            bloqueado="A FixIn ainda está preparando este orçamento. Os botões de aprovar e recusar liberam assim que ele for enviado para você (você será avisado por e-mail)."
          />
        )}

        {['aprovado', 'em_execucao', 'finalizado'].includes(orcamento.status) && (
          <ComprovantesPagamento
            orcamentoId={orcamento.id}
            comprovantes={comprovantes}
            role="imobiliaria"
            veValores={ver}
            total={total}
            valorPago={num(orcamento.valor_pago)}
            pagamentoClienteStatus={orcamento.pagamento_cliente_status}
          />
        )}

        <DocumentosFiscais orcamentoId={orcamento.id} documentos={documentos} role="imobiliaria" />
        <Chat orcamentoId={orcamento.id} profile={profile} mensagensIniciais={mensagens || []} />
      </div>
    </AppShell>
  );
}
