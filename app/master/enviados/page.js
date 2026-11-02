import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { MASTER_TABS } from '@/lib/navTabs';
import { intervalo, inicioSP, fimSP } from '@/lib/periodos';
import { ACOES_FEITO, resumirEventos, contarPorPessoa } from '@/lib/orcamentosEnviados';
import { calcularTotalComMargem, fmtBRL, fmtDataHoraSP } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PERIODOS = [['hoje', 'Hoje'], ['ontem', 'Ontem'], ['semana', 'Esta semana'], ['mes', 'Este mês'], ['mes_passado', 'Mês passado']];
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dm = (iso) => iso.split('-').reverse().slice(0, 2).join('/');

export default async function EnviadosPage({ searchParams }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const personalizado = DATA.test(searchParams?.de || '') && DATA.test(searchParams?.ate || '');
  const p = PERIODOS.some(([v]) => v === searchParams?.p) ? searchParams.p : 'semana';
  const { de, ate } = personalizado ? { de: searchParams.de, ate: searchParams.ate < searchParams.de ? searchParams.de : searchParams.ate } : intervalo(p);
  const quem = UUID.test(searchParams?.u || '') ? searchParams.u : '';
  const cli = UUID.test(searchParams?.c || '') ? searchParams.c : '';
  const so = searchParams?.so === 'enviados' ? 'enviados' : '';

  const admin = createAdminClient();
  const { data: eventos } = await admin.from('auditoria').select('alvo_id, acao, autor_id, autor_nome, criado_em')
    .eq('alvo_tipo', 'orcamento').in('acao', ACOES_FEITO).gte('criado_em', inicioSP(de)).lt('criado_em', fimSP(ate)).order('criado_em').limit(5000);
  const resumos = resumirEventos(eventos);
  const ids = [...resumos.keys()];
  const { data: orcs } = ids.length
    ? await supabase.from('orcamentos').select('id, numero, endereco, status, cliente_id, margem_percentual, criado_em, clientes(nome_empresa)').in('id', ids)
    : { data: [] };
  const { data: itens } = ids.length ? await supabase.from('orcamento_itens').select('orcamento_id, mo, ma').in('orcamento_id', ids) : { data: [] };
  const { data: clientes } = await supabase.from('clientes').select('id, nome_empresa').order('nome_empresa');
  const { data: equipe } = await admin.from('profiles').select('id, nome_completo').eq('role', 'master').eq('ativo', true).order('nome_completo');

  const linhas = (orcs || []).map((o) => {
    const r = resumos.get(o.id);
    return { o, r, total: calcularTotalComMargem((itens || []).filter((i) => i.orcamento_id === o.id), o.margem_percentual) };
  }).filter(({ o, r }) => (!cli || o.cliente_id === cli) && (!quem || r.feitoPorId === quem || r.enviadoPorId === quem) && (so !== 'enviados' || r.enviadoEm))
    .sort((a, b) => new Date(b.r.enviadoEm || b.r.feitoEm) - new Date(a.r.enviadoEm || a.r.feitoEm));

  const resFiltrados = new Map(linhas.map(({ o, r }) => [o.id, r]));
  const pessoas = contarPorPessoa(resFiltrados);
  const nFeitos = linhas.length;
  const nEnviados = linhas.filter(({ r }) => r.enviadoEm).length;
  const soma = linhas.reduce((s, l) => s + l.total, 0);

  const url = (extra) => {
    const q = new URLSearchParams();
    if (personalizado && !extra.p) { q.set('de', de); q.set('ate', ate); } else q.set('p', extra.p || p);
    const u = 'u' in extra ? extra.u : quem; const c = 'c' in extra ? extra.c : cli; const s = 'so' in extra ? extra.so : so;
    if (u) q.set('u', u); if (c) q.set('c', c); if (s) q.set('so', s);
    return `/master/enviados?${q}`;
  };
  const chip = (ativo) => `text-sm rounded-full px-3.5 py-1.5 border ${ativo ? 'bg-marinho text-white border-marinho' : 'bg-white border-linha text-marinho/70'}`;

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="enviados" titulo="Orçamentos feitos e enviados" subtitulo={`${de === ate ? dm(de) : `${dm(de)} a ${dm(ate)}`} · por dia, semana ou mês, e quem fez cada um`} />

      <div className="card rounded-xl p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map(([v, l]) => <Link key={v} href={url({ p: v })} className={chip(!personalizado && p === v)}>{l}</Link>)}
        </div>
        <form className="flex flex-wrap items-end gap-3 text-xs text-marinho/60" action="/master/enviados">
          <label>De <input type="date" name="de" defaultValue={de} className="block border border-linha rounded-lg px-2 py-1.5 bg-papel text-sm text-marinho" /></label>
          <label>Até <input type="date" name="ate" defaultValue={ate} className="block border border-linha rounded-lg px-2 py-1.5 bg-papel text-sm text-marinho" /></label>
          {quem && <input type="hidden" name="u" value={quem} />}{cli && <input type="hidden" name="c" value={cli} />}{so && <input type="hidden" name="so" value={so} />}
          <button className="border border-linha rounded-lg px-3 py-1.5 text-sm text-marinho bg-white">Ver período</button>
        </form>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-marinho/50">Quem fez</span>
          <Link href={url({ u: '' })} className={chip(!quem)}>Todos</Link>
          {(equipe || []).map((e) => <Link key={e.id} href={url({ u: e.id })} className={chip(quem === e.id)}>{(e.nome_completo || '').split(' ')[0]}</Link>)}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-marinho/50">Mostrar</span>
          <Link href={url({ so: '' })} className={chip(!so)}>Feitos e enviados</Link>
          <Link href={url({ so: 'enviados' })} className={chip(so === 'enviados')}>Só enviados</Link>
          <form action="/master/enviados" className="ml-auto flex gap-2 items-center">
            {personalizado ? <><input type="hidden" name="de" value={de} /><input type="hidden" name="ate" value={ate} /></> : <input type="hidden" name="p" value={p} />}
            {quem && <input type="hidden" name="u" value={quem} />}{so && <input type="hidden" name="so" value={so} />}
            <select name="c" defaultValue={cli} className="border border-linha rounded-lg px-2 py-1.5 bg-papel text-sm"><option value="">Todas as imobiliárias</option>{(clientes || []).map((c) => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}</select>
            <button className="border border-linha rounded-lg px-3 py-1.5 text-sm bg-white">Filtrar</button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[['Feitos', nFeitos], ['Enviados', nEnviados], ['Soma dos totais', fmtBRL(soma)]].map(([r, v]) => (
          <div key={r} className="card rounded-xl p-4"><span className="block text-xs text-marinho/55">{r}</span><span className="block text-2xl font-bold mt-1">{v}</span></div>
        ))}
      </div>

      {pessoas.length > 0 && (
        <div className="card rounded-xl p-4 mb-5">
          <h2 className="font-semibold text-sm mb-2">Por pessoa</h2>
          <ul className="divide-y divide-linha text-sm">
            {pessoas.map((x) => <li key={x.id} className="py-1.5 flex justify-between gap-3"><span>{x.nome || '—'}</span><span className="text-marinho/60">{x.feitos} feito(s) · <b className="text-marinho">{x.enviados}</b> enviado(s)</span></li>)}
          </ul>
        </div>
      )}

      {linhas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-8 text-center text-marinho/60">Nenhum orçamento feito ou enviado neste período com esses filtros.</div>
      ) : (
        <div className="card rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-marinho/50 border-b border-linha"><th className="p-3">Orçamento</th><th className="p-3">Imobiliária / endereço</th><th className="p-3 text-right">Total</th><th className="p-3">Feito por</th><th className="p-3">Enviado</th><th className="p-3">Situação</th></tr></thead>
            <tbody>
              {linhas.map(({ o, r, total }) => (
                <tr key={o.id} className="border-b border-linha last:border-0 align-top">
                  <td className="p-3 font-semibold whitespace-nowrap"><Link href={`/master/orcamentos/${o.id}`} className="underline">{o.numero}</Link></td>
                  <td className="p-3"><div>{o.clientes?.nome_empresa}</div><div className="text-xs text-marinho/55">{o.endereco}</div></td>
                  <td className="p-3 text-right whitespace-nowrap">{fmtBRL(total)}</td>
                  <td className="p-3"><div>{r.feitoPor || '—'}</div><div className="text-xs text-marinho/55">{fmtDataHoraSP(r.feitoEm)}</div></td>
                  <td className="p-3">{r.enviadoEm ? <><div>{r.enviadoPor || '—'}</div><div className="text-xs text-marinho/55">{fmtDataHoraSP(r.enviadoEm)}</div></> : <span className="text-xs text-alerta">Ainda não enviado</span>}</td>
                  <td className="p-3"><StatusTag status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-marinho/45 mt-3">“Feito” = alguém gerou o PDF do orçamento; “Enviado” = enviou por e-mail. Horários de Brasília. A semana vai de segunda a domingo.</p>
    </AppShell>
  );
}
