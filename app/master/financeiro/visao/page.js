import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { hojeSP, emAberto, vencido } from '@/lib/lancamentos';
import { fmtBRL, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Visão por orçamento' };

const dias = (de, ate) => Math.max(1, Math.round((new Date(ate + 'T12:00:00Z') - new Date(de + 'T12:00:00Z')) / 86400000));

function Kpi({ rotulo, valor, sub, cor }) {
  return (
    <div className="card p-4">
      <div className="text-xl font-bold" style={{ color: cor }}>{fmtBRL(valor)}</div>
      <div className="text-xs text-marinho/70">{rotulo}</div>
      {sub && <div className="text-[11px] text-marinho/50 mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function VisaoPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard');

  const hoje = hojeSP();
  const filtro = ['atrasados', 'prestador', 'abertos', 'pagos'].includes(searchParams?.f) ? searchParams.f : 'todos';

  const { data: lancs } = await supabase.from('lancamentos').select('id, tipo, orcamento_id, status, valor, valor_pago, vencimento, data_pagamento, prestadores(nome)').not('orcamento_id', 'is', null).neq('status', 'cancelado').limit(5000);
  const ids = [...new Set((lancs || []).map((l) => l.orcamento_id))];
  const { data: orcs } = ids.length ? await supabase.from('orcamentos').select('id, numero, endereco, parcelado_negociado, clientes(nome_empresa)').in('id', ids) : { data: [] };
  const orcPorId = Object.fromEntries((orcs || []).map((o) => [o.id, o]));

  const linhas = ids.map((id) => {
    const rec = (lancs || []).find((l) => l.orcamento_id === id && l.tipo === 'receber');
    const pag = (lancs || []).find((l) => l.orcamento_id === id && l.tipo === 'pagar');
    const o = orcPorId[id] || {};
    const total = Number(rec?.valor || 0), recebido = Number(rec?.valor_pago || 0);
    const falta = Math.max(0, total - recebido);
    const atrasado = rec ? vencido(rec, hoje) : false;
    const pagarV = Number(pag?.valor || 0), pagoPrest = Number(pag?.valor_pago || 0);
    const faltaPrest = pag && emAberto(pag) ? Math.max(0, pagarV - pagoPrest) : 0;
    return { id, o, rec, pag, total, recebido, falta, atrasado, pagarV, pagoPrest, faltaPrest, prestAtrasado: pag ? vencido(pag, hoje) : false };
  }).filter((r) => r.rec);

  const soma = (arr, f) => arr.reduce((a, r) => a + f(r), 0);
  const kRecebido = soma(linhas, (r) => r.recebido);
  const kAtraso = soma(linhas.filter((r) => r.atrasado), (r) => r.falta);
  const kEmDia = soma(linhas.filter((r) => !r.atrasado), (r) => r.falta);
  const kPrestAberto = soma(linhas, (r) => r.faltaPrest);
  const kPrestPago = soma(linhas, (r) => r.pagoPrest);

  const visiveis = linhas.filter((r) => {
    if (filtro === 'atrasados') return r.atrasado || r.prestAtrasado;
    if (filtro === 'prestador') return r.faltaPrest > 0;
    if (filtro === 'abertos') return r.falta > 0;
    if (filtro === 'pagos') return r.falta === 0;
    return true;
  }).sort((a, b) => (Number(b.atrasado) - Number(a.atrasado)) || (b.falta - a.falta));

  const chip = (f, rot) => <Link key={f} href={`/master/financeiro/visao?f=${f}`} className={`rounded-lg px-3 py-1.5 border text-sm ${filtro === f ? 'bg-marinho text-white border-marinho' : 'border-linha'}`}>{rot}</Link>;

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="financeiro" titulo="Visão por orçamento" subtitulo="O que já caiu, o que está atrasado e o que falta pagar ao prestador, orçamento por orçamento" />
      <div className="mb-4 text-sm flex flex-wrap gap-2 items-center">
        <Link href="/master/financeiro" className="underline text-marinho/70 mr-2">← Financeiro</Link>
        <Link href="/master/financeiro/dre" className="underline text-marinho/70">DRE gerencial</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <Kpi rotulo="Já caiu na conta" valor={kRecebido} cor="#3F7A5E" />
        <Kpi rotulo="A receber, em dia" valor={kEmDia} cor="#182F50" />
        <Kpi rotulo="Em atraso" valor={kAtraso} cor="#B91C1C" sub={`${linhas.filter((r) => r.atrasado).length} orçamentos`} />
        <Kpi rotulo="A pagar aos prestadores" valor={kPrestAberto} cor="#B45309" />
        <Kpi rotulo="Já pago aos prestadores" valor={kPrestPago} cor="#3F7A5E" />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {chip('todos', 'Todos')}{chip('atrasados', 'Atrasados')}{chip('abertos', 'Falta receber')}{chip('prestador', 'Falta pagar prestador')}{chip('pagos', 'Já recebidos')}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-marinho/60 border-b border-linha">
              <th className="p-3">Orçamento</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3 text-right">Já caiu</th>
              <th className="p-3 text-right">Falta receber</th>
              <th className="p-3">Situação</th>
              <th className="p-3">Prestador</th>
              <th className="p-3 text-right">Falta pagar</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-marinho/50">Nenhum orçamento neste filtro.</td></tr>}
            {visiveis.map((r) => (
              <tr key={r.id} className="border-b border-linha/60 align-top">
                <td className="p-3">
                  <Link href={`/master/orcamentos/${r.id}`} className="font-semibold text-marinho underline">{r.o.numero || 'Orçamento'}</Link>
                  <div className="text-xs text-marinho/60">{r.o.endereco}</div>
                  <div className="text-xs text-marinho/50">{r.o.clientes?.nome_empresa}{r.o.parcelado_negociado ? ' · negociado 50% + 50%' : ''}</div>
                </td>
                <td className="p-3 text-right whitespace-nowrap">{fmtBRL(r.total)}</td>
                <td className="p-3 text-right whitespace-nowrap text-verde font-semibold">
                  {fmtBRL(r.recebido)}
                  {r.recebido > 0 && r.rec.data_pagamento && <div className="text-[11px] font-normal text-marinho/50">em {fmtDate(r.rec.data_pagamento)}</div>}
                </td>
                <td className="p-3 text-right whitespace-nowrap">{r.falta > 0 ? fmtBRL(r.falta) : <span className="text-marinho/30">–</span>}</td>
                <td className="p-3">
                  {r.falta === 0 && <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-verde/15 text-verde">Pago</span>}
                  {r.falta > 0 && r.atrasado && <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">Atrasado {dias(r.rec.vencimento, hoje)} dia(s)</span>}
                  {r.falta > 0 && !r.atrasado && <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-marinho/10 text-marinho">Em dia · vence {fmtDate(r.rec.vencimento)}</span>}
                </td>
                <td className="p-3">
                  {r.pag ? (<>
                    <div>{r.pag.prestadores?.nome || 'Prestador'}</div>
                    <div className="text-xs text-marinho/60">combinado {fmtBRL(r.pagarV)}{r.pagoPrest > 0 ? ` · pago ${fmtBRL(r.pagoPrest)}` : ''}</div>
                  </>) : <span className="text-xs text-marinho/40">Sem prestador</span>}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {r.pag && r.faltaPrest > 0 && (<>
                    <span className={r.prestAtrasado ? 'text-red-700 font-semibold' : 'font-semibold'}>{fmtBRL(r.faltaPrest)}</span>
                    <div className="text-[11px] text-marinho/50">{r.pag.status === 'previsto' ? 'aguardando aprovação' : 'aprovado para pagar'}{r.prestAtrasado ? ' · atrasado' : ''}</div>
                  </>)}
                  {r.pag && r.faltaPrest === 0 && <span className="text-xs text-verde font-semibold">Pago</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-marinho/50 mt-3">Só aparecem orçamentos aprovados (que já geram valor a receber). Cancelados ficam de fora.</p>
    </AppShell>
  );
}
