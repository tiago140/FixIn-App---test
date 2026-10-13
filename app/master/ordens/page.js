import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import { MASTER_TABS } from '@/lib/navTabs';
import { STATUS_OS, ORIGEM_OS, totalItensOS } from '@/lib/ordensStatus';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTROS = [
  ['', 'Todas'], ['enviada', 'Aguardando aceite'], ['aceita', 'Aceitas'], ['orcada', 'Valores enviados'],
  ['aplicada', 'Em aprovação'], ['em_execucao', 'Aprovadas · em execução'], ['conclusao_pendente', 'Conclusão em análise'], ['reprovada', 'Reprovadas'],
  ['aprovada', 'Finalizadas'], ['paga', 'Pagas'], ['recusada', 'Recusadas'],
];

export default async function OrdensPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: ordens } = await supabase
    .from('ordens_servico')
    .select('*, prestadores(nome), os_itens(mo, ma)')
    .order('criado_em', { ascending: false })
    .limit(300);
  const todas = ordens || [];
  const filtro = STATUS_OS[searchParams?.status] ? searchParams.status : '';
  const lista = filtro ? todas.filter((o) => o.status === filtro) : todas;
  const conta = (s) => todas.filter((o) => o.status === s).length;
  const precisaAcao = conta('orcada') + conta('recusada') + conta('conclusao_pendente');
  const soma = (...st) => todas.filter((o) => st.includes(o.status)).reduce((s, o) => s + totalItensOS(o.os_itens), 0);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="ordens"
        titulo="Ordens de serviço"
        subtitulo="O que foi enviado aos prestadores, o que eles aceitaram e os valores que devolveram"
        direita={<Link href="/master/ordens/nova" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">+ Nova ordem</Link>}
      />
      {precisaAcao > 0 && (
        <div className="mb-4 rounded-xl border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm">
          {conta('conclusao_pendente') > 0 && <span><b>{conta('conclusao_pendente')}</b> conclusão(ões) esperando sua aprovação. </span>}
          {conta('orcada') > 0 && <span><b>{conta('orcada')}</b> com valores para você aplicar ao orçamento. </span>}
          {conta('recusada') > 0 && <span><b>{conta('recusada')}</b> recusada(s): escolha outro prestador.</span>}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          ['Aprovadas · em execução', ['em_execucao'], 'em_execucao'],
          ['Pendentes de conclusão', ['em_execucao', 'reprovada', 'conclusao_pendente'], 'conclusao_pendente'],
          ['Finalizadas', ['aprovada', 'paga'], 'aprovada'],
          ['Pagas', ['paga'], 'paga'],
        ].map(([r, st, f]) => (
          <Link key={r} href={`/master/ordens?status=${f}`} className="card rounded-xl p-4 hover:shadow-md transition-shadow">
            <span className="block text-xs text-marinho/55">{r}</span>
            <span className="block text-2xl font-bold mt-1">{todas.filter((o) => st.includes(o.status)).length}</span>
            <span className="block text-xs text-marinho/50 font-mono">{fmtBRL(soma(...st))}</span>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map(([v, r]) => (
          <Link key={v} href={v ? `/master/ordens?status=${v}` : '/master/ordens'}
            className={`px-3 py-1.5 rounded-full text-sm border ${filtro === v ? 'bg-marinho text-white border-marinho' : 'border-linha bg-white hover:bg-papel'}`}>
            {r}{v ? <span className="ml-1.5 opacity-70">{conta(v)}</span> : ''}
          </Link>
        ))}
      </div>

      {!lista.length ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50 rounded-xl">Nenhuma ordem {filtro ? 'neste status' : 'ainda'}.</div>
      ) : (
        <div className="card rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-marinho/50 border-b border-linha">
                <th className="px-4 py-3">Ordem</th><th className="px-4 py-3">Prestador</th><th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Origem</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Valor orçado</th><th className="px-4 py-3">Criada</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id} className="border-b border-linha last:border-0 hover:bg-papel">
                  <td className="px-4 py-3 font-mono font-semibold"><Link href={`/master/ordens/${o.id}`} className="hover:underline">{o.numero}</Link></td>
                  <td className="px-4 py-3">{o.prestadores?.nome}</td>
                  <td className="px-4 py-3 max-w-[280px] truncate">{o.endereco}</td>
                  <td className="px-4 py-3 text-marinho/60">{ORIGEM_OS[o.origem]}</td>
                  <td className="px-4 py-3"><StatusOS status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-mono">{o.os_itens?.length ? fmtBRL(totalItensOS(o.os_itens)) : '—'}</td>
                  <td className="px-4 py-3 text-marinho/60 whitespace-nowrap">{fmtDataHoraSP(o.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
