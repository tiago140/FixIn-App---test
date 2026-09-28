import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import StatusTag from '@/components/StatusTag';
import Chat from '@/components/Chat';
import DocumentosFiscais from '@/components/DocumentosFiscais';
import ResponderOrcamentoButtons from '@/components/ResponderOrcamentoButtons';
import { imobiliariaTabs } from '@/lib/navTabs';
import { fmtBRL, fmtDate, calcularTotalComMargem } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ImobiliariaOrcamentoDetalhe({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');

  const { data: orcamento } = await supabase.from('orcamentos').select('*').eq('id', params.id).single();
  if (!orcamento) notFound();

  const { data: itens } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', params.id).order('ordem');
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

  const total = calcularTotalComMargem(itens, orcamento.margem_percentual);

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <Link href="/imobiliaria/dashboard" className="text-sm text-marinho/50">← voltar</Link>

      <div className="border-b-2 border-marinho pb-3 flex items-end justify-between mt-3 mb-6">
        <div>
          <h1 className="font-slab text-2xl font-semibold">{orcamento.numero}</h1>
          <div className="text-sm text-marinho/60">{orcamento.endereco}</div>
          <div className="text-xs text-marinho/40">Criado em {fmtDate(orcamento.criado_em)}</div>
        </div>
        <StatusTag status={orcamento.status} />
      </div>

      <div className="space-y-6">
        <div className="card p-5">
          <div className="text-xs text-marinho/50 mb-1">Ambientes e serviços</div>
          {(itens || []).map((it) => (
            <div key={it.id} className="py-1.5 border-b border-linha text-sm">
              <span className="text-marinho/50">{it.ambiente} · </span>
              <span className="font-medium">{it.servico}</span>
              {it.descricao ? <span className="text-marinho/60"> — {it.descricao}</span> : null}
            </div>
          ))}
          {orcamento.garantia && (
            <div className="mt-3 text-sm"><span className="font-semibold">Garantia: </span>{orcamento.garantia}</div>
          )}
          <div className="mt-4 flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="font-mono">{fmtBRL(total)}</span>
          </div>
          {orcamento.pdf_url && (
            <a href={orcamento.pdf_url} target="_blank" rel="noreferrer" className="text-sm text-marinho underline block mt-2">
              Abrir orçamento em PDF
            </a>
          )}
        </div>

        {orcamento.status === 'enviado' && <ResponderOrcamentoButtons orcamentoId={orcamento.id} />}

        <DocumentosFiscais orcamentoId={orcamento.id} documentos={documentos} role="imobiliaria" />
        <Chat orcamentoId={orcamento.id} profile={profile} mensagensIniciais={mensagens || []} />
      </div>
    </AppShell>
  );
}
