import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import OrdemPrestadorAcoes from '@/components/OrdemPrestadorAcoes';
import { PRESTADOR_TABS } from '@/lib/navTabs';
import { ORIGEM_OS, totalItensOS } from '@/lib/ordensStatus';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PrestadorOrdem({ params }) {
  const { profile, supabase } = await getProfile();
  const { data: os } = await supabase.from('ordens_servico').select('*, os_itens(*)').eq('id', params.id).maybeSingle();
  if (!os) notFound();
  const itens = (os.os_itens || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const editavel = ['aceita', 'orcada'].includes(os.status);

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

        <OrdemPrestadorAcoes os={{ id: os.id, status: os.status }} itensIniciais={editavel ? itens : []} />

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
                <tr className="bg-papel"><td colSpan={4} className="px-5 py-3 text-right font-semibold">Total</td><td className="px-5 py-3 text-right font-mono font-bold">{fmtBRL(totalItensOS(itens))}</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
