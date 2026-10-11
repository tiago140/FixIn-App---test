'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Building2, CalendarDays } from 'lucide-react';

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const rotuloMes = (m) => { const [a, n] = m.split('-'); return `${NOMES_MES[Number(n) - 1]} de ${a}`; };
const dd = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
const fmt = (s) => s.split('-').reverse().join('/');

// Atalhos de período calculados no navegador (data local). Cada um vira ?de=...&ate=... na URL.
function atalho(chave) {
  const h = new Date();
  const ano = h.getFullYear();
  const mes = h.getMonth();
  const recuar = (dias) => { const d = new Date(h); d.setDate(d.getDate() - dias + 1); return d; };
  switch (chave) {
    case 'mes': return [iso(new Date(ano, mes, 1)), iso(new Date(ano, mes + 1, 0))];
    case 'mes-passado': return [iso(new Date(ano, mes - 1, 1)), iso(new Date(ano, mes, 0))];
    case '30': return [iso(recuar(30)), iso(h)];
    case '90': return [iso(recuar(90)), iso(h)];
    case 'ano': return [`${ano}-01-01`, `${ano}-12-31`];
    default: return [null, null];
  }
}

// Filtros do Painel geral: imobiliária e período (atalho, mês ou datas livres). Tudo na URL, então o painel inteiro
// (números, funil, gráficos) é recalculado no servidor e dá para guardar/compartilhar o endereço.
export default function FiltroImobiliaria({ opcoes, selecionado = null, totalGeral = 0, meses = [], de = null, ate = null, qtdNoPeriodo = 0 }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const atual = opcoes.find((o) => o.id === selecionado);

  const ir = (mudancas) => {
    const q = new URLSearchParams(params.toString());
    Object.entries(mudancas).forEach(([k, v]) => { if (v) q.set(k, v); else q.delete(k); });
    const t = q.toString();
    router.push(t ? `${pathname}?${t}` : pathname);
  };

  // Qual opção do seletor corresponde ao período atual?
  let valorPeriodo = 'todos';
  if (de || ate) {
    valorPeriodo = 'custom';
    for (const k of ['mes', 'mes-passado', '30', '90', 'ano']) {
      const [a, b] = atalho(k);
      if (a === de && b === ate) valorPeriodo = k;
    }
    for (const m of meses) {
      const [a, n] = m.split('-').map(Number);
      if (de === `${m}-01` && ate === iso(new Date(a, n, 0))) valorPeriodo = `m:${m}`;
    }
  }

  const trocarPeriodo = (v) => {
    if (v === 'todos') return ir({ de: null, ate: null });
    if (v === 'custom') return ir({ de: de || iso(new Date()), ate: ate || iso(new Date()) });
    if (v.startsWith('m:')) {
      const m = v.slice(2);
      const [a, n] = m.split('-').map(Number);
      return ir({ de: `${m}-01`, ate: iso(new Date(a, n, 0)) });
    }
    const [a, b] = atalho(v);
    ir({ de: a, ate: b });
  };

  const campo = 'border border-linha rounded-lg px-3 py-2 bg-papel text-sm text-marinho';
  return (
    <div role="search" className="flex items-center gap-3 flex-wrap mb-5 bg-white border border-linha rounded-lg px-4 py-3 shadow-sm">
      <label htmlFor="filtro-imobiliaria" className="inline-flex items-center gap-2 text-sm font-semibold text-marinho"><Building2 size={16} /> Imobiliária</label>
      <select id="filtro-imobiliaria" value={selecionado || ''} onChange={(e) => ir({ cliente: e.target.value })} className={`${campo} min-w-[16rem] max-w-full`}>
        <option value="">Todas as imobiliárias ({totalGeral})</option>
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome} ({o.qtd}){o.ativo ? '' : ' — desativada'}</option>)}
      </select>

      <label htmlFor="filtro-periodo" className="inline-flex items-center gap-2 text-sm font-semibold text-marinho md:ml-3"><CalendarDays size={16} /> Período</label>
      <select id="filtro-periodo" value={valorPeriodo} onChange={(e) => trocarPeriodo(e.target.value)} className={`${campo} min-w-[12rem]`}>
        <option value="todos">Todo o período</option>
        <optgroup label="Atalhos">
          <option value="mes">Este mês</option>
          <option value="mes-passado">Mês passado</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="ano">Este ano</option>
        </optgroup>
        {meses.length > 0 && (
          <optgroup label="Por mês">
            {meses.map((m) => <option key={m} value={`m:${m}`}>{rotuloMes(m)}</option>)}
          </optgroup>
        )}
        <option value="custom">Escolher datas…</option>
      </select>
      {valorPeriodo === 'custom' && (
        <span className="inline-flex items-center gap-2 text-sm text-marinho">
          de <input type="date" aria-label="Data inicial" value={de || ''} max={ate || undefined} onChange={(e) => ir({ de: e.target.value })} className={campo} />
          até <input type="date" aria-label="Data final" value={ate || ''} min={de || undefined} onChange={(e) => ir({ ate: e.target.value })} className={campo} />
        </span>
      )}

      {(atual || de || ate) && (
        <span className="ml-auto flex items-center gap-3 flex-wrap text-sm text-marinho/60">
          <span>
            Mostrando {atual ? <b className="text-marinho">{atual.nome}</b> : 'todas'}
            {(de || ate) && <> · <b className="text-marinho">{de ? fmt(de) : 'início'} a {ate ? fmt(ate) : 'hoje'}</b></>}
            {' '}· {qtdNoPeriodo} orçamento(s)
          </span>
          <Link href={pathname} className="font-semibold text-marinho underline">Limpar filtros</Link>
        </span>
      )}
    </div>
  );
}
