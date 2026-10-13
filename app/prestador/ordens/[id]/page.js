import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import OrdemPrestadorAcoes from '@/components/OrdemPrestadorAcoes';
import FotosExecucao from '@/components/FotosExecucao';
import NotasFiscaisOS from '@/components/NotasFiscaisOS';
import GaleriaFotosOS from '@/components/GaleriaFotosOS';
import { PRESTADOR_TABS } from '@/lib/navTabs';
import { ORIGEM_OS, totalItensOS } from '@/lib/ordensStatus';
import { urlArquivo } from '@/lib/arquivos';
import { urlSite } from '@/lib/chamados';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PrestadorOrdem({ params }) {
  const { profile, supabase } = await getProfile();
  const { data: os } = await supabase.from('ordens_servico').select('*, os_itens(*)').eq('id', params.id).maybeSingle();
  if (!os) notFound();
  const [{ data: fotosTodas }, { data: notas }, { data: pagamentos }] = await Promise.all([
    supabase.from('os_fotos').select('*').eq('os_id', os.id).order('criado_em', { ascending: true }),
    supabase.from('os_notas').select('*').eq('os_id', os.id).order('criado_em', { ascending: true }),
    supabase.from('pagamentos_prestador').select('*').eq('os_id', os.id).order('data_pagamento', { ascending: true }),
  ]);
  const itens = (os.os_itens || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const editavel = ['aceita', 'orcada'].includes(os.status);
  const rodada = os.rodada || 0;
  const fotosRodada = (fotosTodas || []).filter((f) => f.tipo !== 'reprovacao' && f.rodada === rodada);
  const fotosReprovacao = (fotosTodas || []).filter((f) => f.tipo === 'reprovacao' && f.rodada === rodada);
  const fotosAnteriores = (fotosTodas || []).filter((f) => f.tipo !== 'reprovacao' && f.rodada < rodada);
  const linkFotos = os.token_fotos && (!os.token_expira || new Date(os.token_expira) > new Date()) ? `${urlSite()}/foto/${os.token_fotos}` : null;
  const total = totalItensOS(itens);
  const pago = (pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
  const fase = ['em_execucao', 'reprovada', 'conclusao_pendente', 'aprovada', 'paga'].includes(os.status);

  return (
    <AppShell profile={profile} tabs={PRESTADOR_TABS} homeHref="/prestador/dashboard">
      <Link href="/prestador/ordens" className="inline-flex items-center gap-1 text-sm text-marinho/60 hover:text-marinho mb-2"><ArrowLeft size={15} /> Voltar às ordens</Link>
      <PageHeader icone="ordens" titulo={os.endereco} subtitulo={`${os.numero} · ${ORIGEM_OS[os.origem]} · recebida em ${fmtDataHoraSP(os.criado_em)}`} direita={<StatusOS status={os.status} />} />

      <div className="max-w-3xl space-y-5">
        {os.descricao && (
          <div className="card p-5 rounded-xl">
            <h3 className="font-semibold mb-1">Instruções da FixIn</h3>
            <p className="text-sm whitespace-pre-wrap text-marinho/80">{os.descricao}</p>
          </div>
        )}
        {os.status === 'recusada' && os.recusa_motivo && (
          <div className="rounded-xl border border-erro/30 bg-erro/10 p-4 text-sm"><b className="text-erro">Você recusou esta ordem.</b> Motivo: {os.recusa_motivo}</div>
        )}
        {os.status === 'aplicada' && <div className="rounded-xl border border-linha bg-white p-4 text-sm">Seus valores foram aplicados ao orçamento e estão com a imobiliária para aprovação. Você será avisado por e-mail quando for liberado.</div>}
        {os.status === 'em_execucao' && <div className="rounded-xl border border-sucesso/30 bg-sucesso/10 p-4 text-sm"><b className="text-sucesso">Orçamento aprovado.</b> A ordem está liberada para execução com os valores que você orçou.</div>}
        {os.status === 'conclusao_pendente' && <div className="rounded-xl border border-alerta/30 bg-alerta/10 p-4 text-sm"><b>Conclusão enviada.</b> A FixIn está analisando as fotos. Você pode anexar a nota fiscal enquanto isso.</div>}
        {os.status === 'aprovada' && <div className="rounded-xl border border-sucesso/30 bg-sucesso/10 p-4 text-sm"><b className="text-sucesso">Serviço aprovado.</b> Anexe a nota fiscal para agilizar o pagamento.</div>}

        {os.status === 'reprovada' && (
          <div className="rounded-xl border border-erro/40 bg-erro/10 p-5 space-y-3">
            <h3 className="font-semibold text-erro">A FixIn pediu ajustes</h3>
            <p className="text-sm whitespace-pre-wrap">{os.reprovacao_motivo}</p>
            {fotosReprovacao.length > 0 && <GaleriaFotosOS fotos={fotosReprovacao} />}
            <p className="text-xs text-marinho/60">Refaça o que foi apontado, envie as novas fotos e conclua de novo.</p>
          </div>
        )}

        <OrdemPrestadorAcoes os={{ id: os.id, status: os.status }} itensIniciais={editavel ? itens : []} />

        {fase && (
          os.status === 'em_execucao' || os.status === 'reprovada'
            ? <FotosExecucao os={{ id: os.id, status: os.status }} fotos={fotosRodada} linkFotos={linkFotos} />
            : (fotosRodada.length > 0 && <div className="card p-5 rounded-xl space-y-3"><h3 className="font-semibold">Fotos enviadas</h3><GaleriaFotosOS fotos={fotosRodada} /></div>)
        )}
        {fotosAnteriores.length > 0 && <details className="card p-4 rounded-xl"><summary className="text-sm font-semibold cursor-pointer">Fotos de envios anteriores ({fotosAnteriores.length})</summary><div className="mt-3"><GaleriaFotosOS fotos={fotosAnteriores} /></div></details>}

        {!editavel && itens.length > 0 && (
          <div className="card rounded-xl overflow-x-auto">
            <div className="px-5 py-3 border-b border-linha font-semibold">Itens e valores</div>
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
                <tr className="bg-papel"><td colSpan={4} className="px-5 py-3 text-right font-semibold">Total</td><td className="px-5 py-3 text-right font-mono font-bold">{fmtBRL(total)}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {['conclusao_pendente', 'aprovada', 'paga'].includes(os.status) && <NotasFiscaisOS os={{ id: os.id, status: os.status }} notas={notas || []} />}

        {fase && (
          <div className="card p-5 rounded-xl space-y-3">
            <div className="flex items-baseline justify-between"><h3 className="font-semibold">Pagamentos</h3><span className="text-sm text-marinho/60">Pago <b className="font-mono text-marinho">{fmtBRL(pago)}</b> de <b className="font-mono text-marinho">{fmtBRL(total)}</b></span></div>
            {!pagamentos?.length ? <p className="text-sm text-marinho/50">Nenhum pagamento registrado ainda.</p> : (
              <ul className="space-y-2">
                {pagamentos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm border border-linha rounded-lg px-3 py-2">
                    <span><b className="font-mono">{fmtBRL(p.valor)}</b> <span className="text-marinho/60">· {new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}{p.forma ? ` · ${p.forma}` : ''}</span></span>
                    {p.comprovante_path && <a href={urlArquivo('ordens-arquivos', p.comprovante_path)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-marinho underline"><FileText size={14} /> Comprovante</a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
