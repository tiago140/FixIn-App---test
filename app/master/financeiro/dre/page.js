import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { montarDre, totalAno, MESES } from '@/lib/dre';
import { hojeSP } from '@/lib/lancamentos';
import { fmtBRL } from '@/lib/format';

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

  const { data: lancs } = await supabase.from('lancamentos').select('tipo, categoria, status, valor, valor_pago, vencimento, data_pagamento').neq('status', 'cancelado').limit(20000);
  const d = montarDre(lancs || [], ano, regime);
  const tRec = totalAno(d.receitaBruta);

  const link = (a, r) => `/master/financeiro/dre?ano=${a}&regime=${r}`;
  const pct = (v) => (tRec > 0 ? `${((v / tRec) * 100).toFixed(1).replace('.', ',')}%` : '—');
  const cel = (v, neg) => (v === 0 ? <span className="text-marinho/30">–</span> : <span className={v < 0 || neg ? 'text-red-700' : ''}>{neg ? '(' : ''}{fmtBRL(Math.abs(v))}{neg ? ')' : ''}</span>);

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
      <p className="text-xs text-marinho/60 mb-3">
        {regime === 'caixa'
          ? 'Caixa: conta só o dinheiro que realmente entrou e saiu, no mês em que foi pago.'
          : 'Previsto: conta todo valor lançado (pago ou não), no mês do vencimento. Mostra o que ainda vai entrar e sair.'}
      </p>
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
      <p className="text-xs text-marinho/50 mt-3">Cancelados ficam de fora. Para cada lançamento escolha a categoria certa em Financeiro: é ela que decide em qual linha da DRE o valor aparece.</p>
    </AppShell>
  );
}
