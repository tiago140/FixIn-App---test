import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import { PRESTADOR_TABS } from '@/lib/navTabs';
import { STATUS_OS, ORIGEM_OS, totalItensOS } from '@/lib/ordensStatus';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTROS = [['', 'Todas'], ['enviada', 'Para aceitar'], ['aceita', 'Para enviar valores'], ['orcada', 'Valores enviados'], ['aplicada', 'Em aprovação'], ['em_execucao', 'Em execução'], ['recusada', 'Recusadas']];

export default async function PrestadorOrdens({ searchParams }) {
  const { profile, supabase } = await getProfile();
  const { data } = await supabase.from('ordens_servico').select('*, os_itens(mo, ma)').order('criado_em', { ascending: false }).limit(300);
  const todas = data || [];
  const filtro = STATUS_OS[searchParams?.status] ? searchParams.status : '';
  const lista = filtro ? todas.filter((o) => o.status === filtro) : todas;

  return (
    <AppShell profile={profile} tabs={PRESTADOR_TABS} homeHref="/prestador/dashboard">
      <PageHeader icone="ordens" titulo="Ordens de serviço" subtitulo="Aceite, envie valores e acompanhe cada ordem" />
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map(([v, r]) => (
          <Link key={v} href={v ? `/prestador/ordens?status=${v}` : '/prestador/ordens'}
            className={`px-3 py-1.5 rounded-full text-sm border ${filtro === v ? 'bg-marinho text-white border-marinho' : 'border-linha bg-white hover:bg-papel'}`}>{r}</Link>
        ))}
      </div>
      {!lista.length ? (
        <div className="border border-dashed border-linha rounded-xl p-8 text-center text-marinho/50">Nenhuma ordem {filtro ? 'neste status' : 'ainda'}.</div>
      ) : (
        <div className="space-y-2">
          {lista.map((o) => (
            <Link key={o.id} href={`/prestador/ordens/${o.id}`} className="card rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:shadow-md transition-shadow">
              <span className="min-w-0">
                <span className="block font-semibold">{o.endereco}</span>
                <span className="block text-xs text-marinho/55">{o.numero} · {ORIGEM_OS[o.origem]} · {fmtDataHoraSP(o.criado_em)}</span>
              </span>
              <span className="flex items-center gap-3">
                {o.os_itens?.length > 0 && <span className="font-mono text-sm font-semibold">{fmtBRL(totalItensOS(o.os_itens))}</span>}
                <StatusOS status={o.status} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
