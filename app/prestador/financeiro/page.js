import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import { PRESTADOR_TABS } from '@/lib/navTabs';
import { totalItensOS } from '@/lib/ordensStatus';
import { urlArquivo } from '@/lib/arquivos';
import { fmtBRL } from '@/lib/format';
import { FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PrestadorFinanceiro() {
  const { profile, supabase } = await getProfile();
  const [{ data: ordens }, { data: pags }, { data: notas }] = await Promise.all([
    supabase.from('ordens_servico').select('id, numero, endereco, status, os_itens(mo, ma)').in('status', ['em_execucao', 'reprovada', 'conclusao_pendente', 'aprovada', 'paga']).order('criado_em', { ascending: false }),
    supabase.from('pagamentos_prestador').select('*').order('data_pagamento', { ascending: false }),
    supabase.from('os_notas').select('os_id'),
  ]);
  const lista = (ordens || []).map((o) => {
    const total = totalItensOS(o.os_itens);
    const meus = (pags || []).filter((p) => p.os_id === o.id);
    const pago = meus.filter((p) => (p.status || 'confirmado') === 'confirmado').reduce((s, p) => s + Number(p.valor), 0);
    return { ...o, total, pago, saldo: Math.max(0, total - pago), pags: meus, temNota: (notas || []).some((n) => n.os_id === o.id) };
  });
  const aReceber = lista.filter((o) => ['aprovada', 'paga'].includes(o.status)).reduce((s, o) => s + o.saldo, 0);
  const emExecucao = lista.filter((o) => ['em_execucao', 'reprovada', 'conclusao_pendente'].includes(o.status)).reduce((s, o) => s + o.total, 0);
  const recebido = (pags || []).filter((p) => (p.status || 'confirmado') === 'confirmado').reduce((s, p) => s + Number(p.valor), 0);
  const semNota = lista.filter((o) => ['conclusao_pendente', 'aprovada', 'paga'].includes(o.status) && !o.temNota);

  const K = ({ r, v, c = '' }) => <div className="card rounded-xl p-5"><span className="block text-xs text-marinho/55">{r}</span><span className={`block text-2xl font-bold font-mono mt-1 ${c}`}>{fmtBRL(v)}</span></div>;

  return (
    <AppShell profile={profile} tabs={PRESTADOR_TABS} homeHref="/prestador/dashboard">
      <PageHeader icone="financeiro" titulo="Financeiro" subtitulo="O que você já recebeu, o que falta e os comprovantes" />
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <K r="Recebido" v={recebido} c="text-sucesso" />
        <K r="A receber (serviços aprovados)" v={aReceber} />
        <K r="Em execução ou análise" v={emExecucao} />
      </div>
      {semNota.length > 0 && <div className="mb-5 rounded-xl border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm"><b>{semNota.length}</b> ordem(ns) sem nota fiscal anexada. Anexe na própria ordem para agilizar o pagamento.</div>}
      {!lista.length ? <div className="border border-dashed border-linha rounded-xl p-8 text-center text-marinho/50">Quando um serviço for liberado, os valores e pagamentos aparecem aqui.</div> : (
        <div className="card rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-marinho/50 border-b border-linha">
              <th className="px-4 py-3">Ordem</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Pago</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">NF</th><th className="px-4 py-3">Comprovantes</th>
            </tr></thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id} className="border-b border-linha last:border-0 align-top">
                  <td className="px-4 py-3"><Link href={`/prestador/ordens/${o.id}`} className="font-semibold hover:underline">{o.numero}</Link><span className="block text-xs text-marinho/55 max-w-[220px] truncate">{o.endereco}</span></td>
                  <td className="px-4 py-3"><StatusOS status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-mono">{fmtBRL(o.total)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sucesso">{fmtBRL(o.pago)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtBRL(o.saldo)}</td>
                  <td className="px-4 py-3">{o.temNota ? '✓' : <span className="text-marinho/40">—</span>}</td>
                  <td className="px-4 py-3">{o.pags.filter((p) => p.comprovante_url).map((p) => <a key={p.id} href={p.comprovante_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline"><FileText size={13} /> {new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</a>)}{o.pags.filter((p) => p.comprovante_path).map((p) => <a key={p.id} href={urlArquivo('ordens-arquivos', p.comprovante_path)} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline"><FileText size={13} /> {new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</a>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
