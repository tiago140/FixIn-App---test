import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import OrdemMasterAcoes from '@/components/OrdemMasterAcoes';
import OrdemMasterExecucao from '@/components/OrdemMasterExecucao';
import GaleriaFotosOS from '@/components/GaleriaFotosOS';
import RegistrarPagamentoOS from '@/components/RegistrarPagamentoOS';
import { urlArquivo } from '@/lib/arquivos';
import { urlSite } from '@/lib/chamados';
import { FileText } from 'lucide-react';
import { MASTER_TABS } from '@/lib/navTabs';
import { ORIGEM_OS, totalItensOS } from '@/lib/ordensStatus';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OrdemPage({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: os } = await supabase.from('ordens_servico').select('*, prestadores(nome, telefone, email), os_itens(*)').eq('id', params.id).maybeSingle();
  if (!os) notFound();
  const [{ data: fotos }, { data: notas }, { data: pagamentos }] = await Promise.all([
    supabase.from('os_fotos').select('*').eq('os_id', os.id).order('criado_em', { ascending: true }),
    supabase.from('os_notas').select('*').eq('os_id', os.id).order('criado_em', { ascending: true }),
    supabase.from('pagamentos_prestador').select('*').eq('os_id', os.id).order('data_pagamento', { ascending: true }),
  ]);
  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').eq('ativo', true).order('nome_empresa');
  const itens = (os.os_itens || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const total = totalItensOS(itens);
  const pago = (pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
  const rodada = os.rodada || 0;
  const fotosAtuais = (fotos || []).filter((f) => f.rodada === rodada && f.tipo !== 'reprovacao');
  const fotosReprov = (fotos || []).filter((f) => f.tipo === 'reprovacao' && f.rodada <= rodada);
  const fotosAnteriores = (fotos || []).filter((f) => f.rodada < rodada && f.tipo !== 'reprovacao');
  const linkAtual = os.token_fotos && (!os.token_expira || new Date(os.token_expira) > new Date()) ? `${urlSite()}/foto/${os.token_fotos}` : null;
  const emFasePagamento = ['em_execucao', 'conclusao_pendente', 'aprovada', 'paga'].includes(os.status);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="ordens"
        titulo={`${os.numero} · ${os.prestadores?.nome || ''}`}
        subtitulo={os.endereco}
        direita={<StatusOS status={os.status} />}
      />
      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-5">
          <div className="card p-5 rounded-xl grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><span className="text-xs text-marinho/50 block">Origem</span>{ORIGEM_OS[os.origem]}</div>
            <div><span className="text-xs text-marinho/50 block">Criada em</span>{fmtDataHoraSP(os.criado_em)}</div>
            <div><span className="text-xs text-marinho/50 block">Prestador</span><Link className="hover:underline" href={`/master/prestadores/${os.prestador_id}`}>{os.prestadores?.nome}</Link>{os.prestadores?.telefone ? ` · ${os.prestadores.telefone}` : ''}</div>
            {os.orcamento_id && <div><span className="text-xs text-marinho/50 block">Orçamento</span><Link className="hover:underline font-semibold" href={`/master/orcamentos/${os.orcamento_id}`}>Abrir orçamento</Link></div>}
            {os.aceito_em && <div><span className="text-xs text-marinho/50 block">Aceita em</span>{fmtDataHoraSP(os.aceito_em)}</div>}
            {os.liberado_em && <div><span className="text-xs text-marinho/50 block">Liberada para execução</span>{fmtDataHoraSP(os.liberado_em)}</div>}
            {os.descricao && <div className="sm:col-span-2"><span className="text-xs text-marinho/50 block">Instruções</span><p className="whitespace-pre-wrap">{os.descricao}</p></div>}
            {os.recusa_motivo && <div className="sm:col-span-2 bg-erro/10 border border-erro/30 rounded-lg p-3"><span className="text-xs text-erro block font-semibold">Motivo da recusa</span>{os.recusa_motivo}</div>}
          </div>

          <div className="card rounded-xl overflow-x-auto">
            <div className="px-5 py-3 border-b border-linha font-semibold">Valores do prestador (custo)</div>
            {!itens.length ? <p className="p-5 text-sm text-marinho/50">O prestador ainda não enviou valores.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-marinho/50 border-b border-linha">
                  <th className="px-5 py-2">Ambiente</th><th className="px-3 py-2">Serviço</th><th className="px-3 py-2 text-right">Mão de obra</th><th className="px-3 py-2 text-right">Material</th><th className="px-5 py-2 text-right">Subtotal</th>
                </tr></thead>
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.id} className="border-b border-linha last:border-0">
                      <td className="px-5 py-2.5">{i.ambiente || '—'}</td>
                      <td className="px-3 py-2.5"><b>{i.servico}</b>{i.descricao && <span className="block text-xs text-marinho/55">{i.descricao}</span>}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{fmtBRL(i.mo)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{fmtBRL(i.ma)}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold">{fmtBRL((Number(i.mo) || 0) + (Number(i.ma) || 0))}</td>
                    </tr>
                  ))}
                  <tr className="bg-papel"><td colSpan={4} className="px-5 py-3 text-right font-semibold">Total do prestador</td><td className="px-5 py-3 text-right font-mono font-bold">{fmtBRL(total)}</td></tr>
                </tbody>
              </table>
            )}
          </div>

          {(fotosAtuais.length > 0 || os.status === 'conclusao_pendente') && (
            <div className="card p-5 rounded-xl space-y-3">
              <div className="flex items-baseline justify-between"><h3 className="font-semibold">Fotos da execução</h3>{os.conclusao_obs && <span className="text-xs text-marinho/60">Obs.: {os.conclusao_obs}</span>}</div>
              <GaleriaFotosOS fotos={fotosAtuais} vazio="O prestador ainda não enviou fotos." />
            </div>
          )}
          {os.reprovacao_motivo && os.status === 'reprovada' && (
            <div className="card p-5 rounded-xl border-l-4 border-l-erro space-y-3"><h3 className="font-semibold text-erro">Reprovada — aguardando o prestador refazer</h3><p className="text-sm whitespace-pre-wrap">{os.reprovacao_motivo}</p><GaleriaFotosOS fotos={fotosReprov.filter((f) => f.rodada === rodada)} vazio="" /></div>
          )}
          {fotosAnteriores.length > 0 && <details className="card p-4 rounded-xl"><summary className="text-sm font-semibold cursor-pointer">Fotos de envios anteriores ({fotosAnteriores.length})</summary><div className="mt-3"><GaleriaFotosOS fotos={fotosAnteriores} /></div></details>}

          {(notas || []).length > 0 && (
            <div className="card p-5 rounded-xl space-y-2"><h3 className="font-semibold">Notas fiscais do prestador</h3>
              {notas.map((n) => <a key={n.id} href={urlArquivo('ordens-arquivos', n.path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline"><FileText size={15} /> {n.numero ? `NF ${n.numero}` : n.nome_arquivo || 'Nota fiscal'}{n.valor ? ` · ${fmtBRL(n.valor)}` : ''}</a>)}
            </div>
          )}

          {emFasePagamento && (
            <div className="card p-5 rounded-xl space-y-3">
              <div className="flex items-baseline justify-between"><h3 className="font-semibold">Pagamento ao prestador</h3><span className="text-sm text-marinho/60">Pago <b className="font-mono text-marinho">{fmtBRL(pago)}</b> de <b className="font-mono text-marinho">{fmtBRL(total)}</b></span></div>
              {(pagamentos || []).length > 0 && (
                <ul className="space-y-1.5">
                  {pagamentos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm border border-linha rounded-lg px-3 py-2">
                      <span><b className="font-mono">{fmtBRL(p.valor)}</b> <span className="text-marinho/60">· {new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}{p.forma ? ` · ${p.forma}` : ''}</span></span>
                      {p.comprovante_path && <a href={urlArquivo('ordens-arquivos', p.comprovante_path)} target="_blank" rel="noreferrer" className="underline flex items-center gap-1"><FileText size={14} /> Comprovante</a>}
                    </li>
                  ))}
                </ul>
              )}
              {profile.dono ? <RegistrarPagamentoOS osId={os.id} saldo={Math.max(0, total - pago)} /> : <p className="text-xs text-marinho/50">O registro de pagamentos é feito pelo perfil de gestão.</p>}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <OrdemMasterExecucao os={{ id: os.id, status: os.status, endereco: os.endereco }} linkAtual={linkAtual} telefone={os.prestadores?.telefone} />
          <OrdemMasterAcoes os={{ id: os.id, status: os.status, orcamento_id: os.orcamento_id, cliente_id: os.cliente_id }} clientes={clientes || []} />
        </div>
      </div>
    </AppShell>
  );
}
