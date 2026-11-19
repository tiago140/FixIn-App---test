import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { montarDre, totalAno, MESES } from '@/lib/dre';
import { hojeSP } from '@/lib/lancamentos';
import { fmtBRL } from '@/lib/format';
import { Rosca, BarrasMensais } from '@/components/Graficos';
import ExportarCsv from '@/components/ExportarCsv';
import { CircleDollarSign, TrendingUp, PiggyBank, CalendarCheck } from 'lucide-react';
import KpiCard from '@/components/KpiCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'DRE gerencial' };

export default async function DrePage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!profile.dono) redirect('/master/dashboard');

  const anoAtual = Number(hojeSP().slice(0, 4));
  const ano = Math.min(anoAtual + 1, Math.max(2024, Number(searchParams?.ano) || anoAtual));
  const regime = searchParams?.regime === 'previsto' ? 'previsto' : 'caixa';

  const { data: lancs } = await supabase.from('lancamentos').select('tipo, categoria, status, valor, valor_pago, vencimento, data_pagamento, cliente_id, orcamento_id').neq('status', 'cancelado').limit(20000);
  const { data: orcs } = await supabase.from('orcamentos').select('id, numero, endereco, cliente_id').in('id', [...new Set((lancs || []).map((l) => l.orcamento_id).filter(Boolean))].slice(0, 1000));
  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').order('nome_empresa');
  const orcPorId = Object.fromEntries((orcs || []).map((o) => [o.id, o]));
  const clienteDe = (l) => (l.orcamento_id && orcPorId[l.orcamento_id]?.cliente_id) || l.cliente_id || null;
  const filtroCliente = (clientes || []).some((c) => c.id === searchParams?.cliente) ? searchParams.cliente : '';
  const filtroOrc = orcPorId[searchParams?.orc] ? searchParams.orc : '';
  const base = lancs || [];
  const filtradas = filtroOrc ? base.filter((l) => l.orcamento_id === filtroOrc) : filtroCliente ? base.filter((l) => clienteDe(l) === filtroCliente) : base;
  const d = montarDre(filtradas, ano, regime);
  const escopoNome = filtroOrc ? `Obra ${orcPorId[filtroOrc].numero}` : filtroCliente ? (clientes || []).find((c) => c.id === filtroCliente)?.nome_empresa : null;

  // quadro por imobiliária (só lançamentos ligados a uma imobiliária ou orçamento)
  const porCliente = (clientes || []).map((c) => {
    const x = montarDre(base.filter((l) => clienteDe(l) === c.id), ano, regime);
    const rec = totalAno(x.receitaBruta), res = totalAno(x.resultado);
    return { id: c.id, nome: c.nome_empresa, rec, custos: totalAno(x.custos) + totalAno(x.L.impostos), res, pct: rec > 0 ? (res / rec) * 100 : null };
  }).filter((r) => r.rec > 0 || r.custos > 0).sort((a, b) => b.res - a.res);
  const obras = (orcs || []).slice().sort((a, b) => String(b.numero).localeCompare(String(a.numero)));
  const tRec = totalAno(d.receitaBruta);

  const link = (a, r) => `/master/financeiro/dre?ano=${a}&regime=${r}${filtroOrc ? `&orc=${filtroOrc}` : filtroCliente ? `&cliente=${filtroCliente}` : ''}`;
  const pct = (v) => (tRec > 0 ? `${((v / tRec) * 100).toFixed(1).replace('.', ',')}%` : '—');
  const cel = (v, neg) => (v === 0 ? <span className="text-marinho/30">–</span> : <span className={v < 0 || neg ? 'text-red-700' : ''}>{neg ? '(' : ''}{fmtBRL(Math.abs(v))}{neg ? ')' : ''}</span>);

  const tRes = totalAno(d.resultado);
  const tMargem = totalAno(d.margem);
  const melhor = d.resultado.reduce((m, v, i) => (v > m.v ? { v, i } : m), { v: -Infinity, i: 0 });
  const pctMargem = tRec > 0 ? `${((tMargem / tRec) * 100).toFixed(1).replace('.', ',')}% da receita` : undefined;
  const dadosMes = MESES.map((mes, i) => ({ mes, Receita: d.receitaBruta[i], Saídas: d.L.impostos[i] + d.custos[i] + d.despesas[i], Resultado: d.resultado[i] }));
  const composicao = [
    { nome: 'Prestadores', valor: totalAno(d.L.prestadores), cor: '#B8862E' },
    { nome: 'Material', valor: totalAno(d.L.material), cor: '#D9A441' },
    { nome: 'Impostos e taxas', valor: totalAno(d.L.impostos), cor: '#6C9BB8' },
    { nome: 'Software, pessoal e outras', valor: totalAno(d.despesas), cor: '#5A6459' },
    { nome: 'Sobrou (resultado)', valor: Math.max(0, tRes), cor: '#3F7A5E' },
  ];

  // tipo: 'linha' normal, 'sub' subtotal (negrito), 'res' resultado final
  const linhas = [
    { n: '(+) Receita de serviços', a: d.L.servicos },
    { n: '(+) Outras receitas e reembolsos', a: d.L.outrasRec },
    { n: '(=) Receita bruta', a: d.receitaBruta, t: 'sub' },
    { n: '(–) Impostos e taxas', a: d.L.impostos, neg: true },
    { n: '(=) Receita líquida', a: d.receitaLiquida, t: 'sub' },
    { n: '(–) Prestadores (mão de obra)', a: d.L.prestadores, neg: true },
    { n: '(–) Material', a: d.L.material, neg: true },
    { n: '(=) Margem de contribuição', a: d.margem, t: 'sub' },
    { n: '(–) Software e sistemas', a: d.L.software, neg: true },
    { n: '(–) Pessoal', a: d.L.pessoal, neg: true },
    { n: '(–) Outras despesas', a: d.L.outrasDesp, neg: true },
    { n: '(=) Resultado do período', a: d.resultado, t: 'res' },
  ];

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="financeiro" titulo="DRE gerencial" subtitulo="Quanto entrou, quanto saiu e quanto sobrou, mês a mês" />
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <Link href="/master/financeiro" className="rounded-full px-4 py-1.5 border border-linha bg-white text-marinho font-medium hover:border-marinho mr-1">Contas a receber e a pagar</Link>
        <Link href="/master/financeiro/visao" className="rounded-full px-4 py-1.5 border border-linha bg-white text-marinho font-medium hover:border-marinho mr-1">Visão por orçamento</Link>
        <span className="rounded-full px-4 py-1.5 bg-marinho text-white font-medium mr-2">DRE gerencial</span>
        <Link href={link(ano, 'caixa')} className={`rounded-lg px-3 py-1.5 border ${regime === 'caixa' ? 'bg-marinho text-white border-marinho' : 'border-linha'}`}>Caixa (o que foi pago)</Link>
        <Link href={link(ano, 'previsto')} className={`rounded-lg px-3 py-1.5 border ${regime === 'previsto' ? 'bg-marinho text-white border-marinho' : 'border-linha'}`}>Previsto (tudo lançado)</Link>
        <span className="mx-2 text-marinho/30">|</span>
        <Link href={link(ano - 1, regime)} className="rounded-lg px-3 py-1.5 border border-linha">‹ {ano - 1}</Link>
        <span className="font-semibold">{ano}</span>
        {ano < anoAtual + 1 && <Link href={link(ano + 1, regime)} className="rounded-lg px-3 py-1.5 border border-linha">{ano + 1} ›</Link>}
      </div>
      <div className="mb-3"><ExportarCsv nome={`dre-${ano}-${regime}`} cabecalho={['Linha', ...MESES, 'Ano']} linhas={linhas.map((l) => [l.n.replace(/^\([+–=]\)\s*/, ''), ...l.a.map((v) => (l.neg ? -v : v)), l.neg ? -totalAno(l.a) : totalAno(l.a)])} /></div>
      <p className="text-xs text-marinho/60 mb-3">
        {regime === 'caixa'
          ? 'Caixa: conta só o dinheiro que realmente entrou e saiu, no mês em que foi pago.'
          : 'Previsto: conta todo valor lançado (pago ou não), no mês do vencimento. Mostra o que ainda vai entrar e sair.'}
      </p>
      <form method="get" className="card rounded-xl p-3 mb-5 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="ano" value={ano} /><input type="hidden" name="regime" value={regime} />
        <label className="flex flex-col gap-0.5 text-[10.5px] uppercase tracking-wide font-semibold text-marinho/60">Imobiliária
          <select name="cliente" defaultValue={filtroCliente} className="border border-linha rounded-lg bg-white px-2 py-2 text-sm normal-case font-normal text-marinho min-w-[14rem]">
            <option value="">Todas (empresa toda)</option>
            {(clientes || []).map((c) => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-[10.5px] uppercase tracking-wide font-semibold text-marinho/60">Obra (orçamento)
          <select name="orc" defaultValue={filtroOrc} className="border border-linha rounded-lg bg-white px-2 py-2 text-sm normal-case font-normal text-marinho min-w-[16rem]">
            <option value="">Todas</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.numero} · {o.endereco}</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-marinho text-white font-medium px-4 py-2">Ver DRE</button>
        {(filtroCliente || filtroOrc) && <Link href={`/master/financeiro/dre?ano=${ano}&regime=${regime}`} className="underline text-marinho/70 pb-2">Limpar</Link>}
        {escopoNome && <span className="ml-auto text-xs text-marinho/60 pb-2">Mostrando só: <b className="text-marinho">{escopoNome}</b> (despesas gerais da empresa ficam de fora)</span>}
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard icone={CircleDollarSign} cor="#182F50" num={fmtBRL(tRec)} lbl="Receita bruta no ano" />
        <KpiCard icone={TrendingUp} cor="#3B6B8C" num={fmtBRL(tMargem)} lbl="Margem de contribuição" sub={pctMargem} />
        <KpiCard icone={PiggyBank} cor={tRes >= 0 ? '#3F7A5E' : '#C0392B'} num={fmtBRL(tRes)} lbl="Resultado do ano" sub={tRec > 0 ? `${((tRes / tRec) * 100).toFixed(1).replace('.', ',')}% da receita` : undefined} />
        <KpiCard icone={CalendarCheck} cor="#B8862E" num={melhor.v > 0 ? MESES[melhor.i] : '—'} lbl="Melhor mês" sub={melhor.v > 0 ? fmtBRL(melhor.v) : undefined} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="card rounded-xl p-5">
          <h3 className="font-semibold text-marinho mb-0.5">Receita x saídas, mês a mês</h3>
          <p className="text-xs text-marinho/50 mb-3">{regime === 'caixa' ? 'Dinheiro que entrou e saiu' : 'Tudo que está lançado'} em {ano}</p>
          <BarrasMensais altura={230} dados={dadosMes} series={[{ chave: 'Receita', nome: 'Receita', cor: '#3F7A5E' }, { chave: 'Saídas', nome: 'Saídas', cor: '#B8862E' }]} />
        </div>
        <div className="card rounded-xl p-5">
          <h3 className="font-semibold text-marinho mb-0.5">Para onde vai cada R$ 1 de receita</h3>
          <p className="text-xs text-marinho/50 mb-3">Como a receita do ano se divide entre custos, impostos e o que sobra</p>
          <Rosca altura={190} centroTitulo="receita" dados={composicao} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-marinho/60 border-b border-linha">
              <th className="p-2 min-w-[210px] sticky left-0 bg-white">Linha</th>
              {MESES.map((m) => <th key={m} className="p-2 text-right">{m}</th>)}
              <th className="p-2 text-right">Ano</th>
              <th className="p-2 text-right">% receita</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const tot = totalAno(l.a);
              const forte = l.t === 'sub' || l.t === 'res';
              return (
                <tr key={l.n} className={`border-b border-linha/60 ${forte ? 'font-semibold bg-papel' : ''} ${l.t === 'res' ? 'text-marinho' : ''}`}>
                  <td className={`p-2 sticky left-0 ${forte ? 'bg-papel' : 'bg-white'}`}>{l.n}</td>
                  {l.a.map((v, i) => <td key={i} className="p-2 text-right whitespace-nowrap">{cel(v, l.neg)}</td>)}
                  <td className="p-2 text-right whitespace-nowrap">{cel(tot, l.neg)}</td>
                  <td className="p-2 text-right text-marinho/60">{pct(tot)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!escopoNome && porCliente.length > 0 && (
        <div className="card rounded-xl overflow-x-auto mt-6">
          <div className="px-4 py-3 border-b border-linha"><h3 className="font-semibold text-marinho">Resultado por imobiliária em {ano}</h3><p className="text-xs text-marinho/50">Receita menos prestadores, material e impostos de cada uma. Clique para abrir a DRE dela.</p></div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-marinho/60 border-b border-linha"><th className="p-3">Imobiliária</th><th className="p-3 text-right">Receita</th><th className="p-3 text-right">Custos</th><th className="p-3 text-right">Resultado</th><th className="p-3 text-right">Margem</th></tr></thead>
            <tbody>
              {porCliente.map((r) => (
                <tr key={r.id} className="border-b border-linha/60 hover:bg-papel">
                  <td className="p-3"><Link href={`/master/financeiro/dre?ano=${ano}&regime=${regime}&cliente=${r.id}`} className="font-semibold text-marinho underline">{r.nome}</Link></td>
                  <td className="p-3 text-right whitespace-nowrap">{fmtBRL(r.rec)}</td>
                  <td className="p-3 text-right whitespace-nowrap text-marinho/70">{fmtBRL(r.custos)}</td>
                  <td className={`p-3 text-right whitespace-nowrap font-semibold ${r.res < 0 ? 'text-red-700' : 'text-sucesso'}`}>{fmtBRL(r.res)}</td>
                  <td className="p-3 text-right whitespace-nowrap text-marinho/70">{r.pct == null ? '—' : `${r.pct.toFixed(1).replace('.', ',')}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-marinho/50 mt-3">Cancelados ficam de fora. Para cada lançamento escolha a categoria certa em Financeiro: é ela que decide em qual linha da DRE o valor aparece.</p>
    </AppShell>
  );
}
