import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { comLinksTemporarios } from '@/lib/chamados';
import { STATUS_CHAMADO, COR_STATUS_CHAMADO, PRIORIDADES } from '@/lib/chamadosTextos';
import { fmtDataHoraSP } from '@/lib/format';
import { intervalo, inicioSP, fimSP } from '@/lib/periodos';
import LinkQr from './LinkQr';
import DetalheChamado from './DetalheChamado';

async function MasterLinks({ supabase }) {
  const { data } = await supabase.from('clientes').select('id, nome_empresa, slug_chamados').not('slug_chamados', 'is', null).order('nome_empresa');
  return (
    <details className="bg-white border border-linha rounded-lg p-4 mb-6">
      <summary className="cursor-pointer font-semibold text-marinho">Links e QR de cada imobiliária</summary>
      <div className="mt-3 space-y-3">{(data || []).map((c) => <LinkQr key={c.id} slug={c.slug_chamados} nome={c.nome_empresa} />)}</div>
    </details>
  );
}

const ORDEM_PRIO = { urgente: 0, alta: 1, normal: 2, baixa: 3 };

// Lista (já filtrada pelas regras do banco: dono vê tudo, imobiliária só os dela).
export async function ListaChamadosPainel({ supabase, base, master, profile, filtro, periodo, quem }) {
  let q = supabase.from('chamados').select('*, clientes(nome_empresa, slug_chamados)').order('atualizado_em', { ascending: false }).limit(300);
  // Por padrão só o que está em andamento; encerrados e "todos" a um clique. Um status exato (?s=aberto) continua funcionando.
  const GRUPOS = { andamento: ['aberto', 'em_analise', 'orcamento', 'aprovado', 'em_execucao'], encerrados: ['concluido', 'cancelado'] };
  const ativo = filtro === 'todos' ? 'todos' : GRUPOS[filtro] ? filtro : STATUS_CHAMADO[filtro] ? filtro : 'andamento';
  if (ativo === 'todos') { /* sem filtro */ } else if (GRUPOS[ativo]) q = q.in('status', GRUPOS[ativo]); else q = q.eq('status', ativo);
  // Equipe: filtro por data de abertura (hoje, ontem, semana, mês) e por quem abriu/atendeu.
  const PER = [['', 'Todo o período'], ['hoje', 'Hoje'], ['ontem', 'Ontem'], ['semana', 'Esta semana'], ['mes', 'Este mês']];
  const per = master && PER.some(([v]) => v && v === periodo) ? periodo : '';
  if (per) { const { de, ate } = intervalo(per); q = q.gte('criado_em', inicioSP(de)).lt('criado_em', fimSP(ate)); }
  const { data } = await q;
  let atendimento = new Map(); let equipe = [];
  if (master && data?.length) {
    const admin = createAdminClient();
    const ids = data.map((c) => c.id);
    const { data: abertos } = await admin.from('auditoria').select('alvo_id, autor_nome').eq('alvo_tipo', 'chamado').eq('acao', 'Chamado aberto internamente').in('alvo_id', ids);
    const { data: msgs } = await admin.from('chamado_mensagens').select('chamado_id, autor_nome, criado_em').eq('autor_tipo', 'fixin').in('chamado_id', ids).order('criado_em');
    for (const a of abertos || []) atendimento.set(a.alvo_id, { ...(atendimento.get(a.alvo_id) || {}), abertoPor: a.autor_nome });
    for (const m of msgs || []) atendimento.set(m.chamado_id, { ...(atendimento.get(m.chamado_id) || {}), respondidoPor: m.autor_nome, respondidoEm: m.criado_em });
    const { data: eq } = await admin.from('profiles').select('nome_completo').eq('role', 'master').eq('ativo', true).order('nome_completo');
    equipe = (eq || []).map((e) => e.nome_completo).filter(Boolean);
  }
  const filtroQuem = master && equipe.includes(quem) ? quem : '';
  const linhas = filtroQuem ? (data || []).filter((c) => { const a = atendimento.get(c.id) || {}; return a.abertoPor === filtroQuem || a.respondidoPor === filtroQuem; }) : (data || []);
  const lista = linhas.slice().sort((a, b) => {
    const fa = ['concluido', 'cancelado'].includes(a.status) ? 1 : 0, fb = ['concluido', 'cancelado'].includes(b.status) ? 1 : 0;
    return fa - fb || (ORDEM_PRIO[a.prioridade] ?? 2) - (ORDEM_PRIO[b.prioridade] ?? 2);
  });

  let slug = null, nome = null;
  if (!master && profile.cliente_id) {
    const { data: cli } = await supabase.from('clientes').select('slug_chamados, nome_empresa').eq('id', profile.cliente_id).maybeSingle();
    slug = cli?.slug_chamados; nome = cli?.nome_empresa;
  }
  return (
    <div>
      <div className="mb-4"><Link href={`${base}/novo`} className="inline-block bg-marinho text-white font-semibold rounded-md px-4 py-2 text-sm">+ Novo chamado</Link></div>
      {master && <MasterLinks supabase={supabase} />}
      {slug && <LinkQr slug={slug} nome={nome} />}
      <div className="flex gap-2 flex-wrap mb-4">
        {[['andamento', 'Em andamento'], ['encerrados', 'Encerrados'], ['todos', 'Todos']].map(([k, r]) => (
          <Link key={k} href={k === 'andamento' ? base : `${base}?s=${k}`} className={`text-sm rounded-full px-4 py-1.5 border font-semibold ${ativo === k ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho bg-white'}`}>{r}</Link>
        ))}
        {!GRUPOS[ativo] && ativo !== 'todos' && <span className="text-sm rounded-full px-4 py-1.5 border bg-marinho text-white border-marinho font-semibold">{STATUS_CHAMADO[ativo]}</span>}
      </div>
      {master && (
        <div className="flex gap-2 flex-wrap items-center mb-4">
          <span className="text-xs text-marinho/50">Aberto em</span>
          {PER.map(([v, r]) => { const q2 = new URLSearchParams(); if (filtro) q2.set('s', filtro); if (v) q2.set('p', v); if (filtroQuem) q2.set('u', filtroQuem); const h = q2.toString(); return <Link key={v} href={h ? `${base}?${h}` : base} className={`text-sm rounded-full px-3.5 py-1 border ${per === v ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho/70 bg-white'}`}>{r}</Link>; })}
          {equipe.length > 0 && <span className="text-xs text-marinho/50 ml-2">Quem atendeu</span>}
          {equipe.length > 0 && [['', 'Todos'], ...equipe.map((n) => [n, n.split(' ')[0]])].map(([v, r]) => { const q2 = new URLSearchParams(); if (filtro) q2.set('s', filtro); if (per) q2.set('p', per); if (v) q2.set('u', v); const h = q2.toString(); return <Link key={v || 'todos'} href={h ? `${base}?${h}` : base} className={`text-sm rounded-full px-3.5 py-1 border ${filtroQuem === v ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho/70 bg-white'}`}>{r}</Link>; })}
        </div>
      )}
      {lista.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">{ativo === 'andamento' && !per && !filtroQuem ? 'Nenhum chamado em andamento. Tudo resolvido!' : 'Nenhum chamado por aqui.'}</div>
      ) : (
        <div className="bg-white border border-linha rounded-lg divide-y divide-linha">
          {lista.map((c) => (
            <Link key={c.id} href={`${base}/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fundo flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-marinho/50">{c.numero}{master ? ` · ${c.clientes?.nome_empresa || ''}` : ''} · {c.solicitante_tipo === 'locador' ? 'Locador' : 'Locatário'}: {c.solicitante_nome}</div>
                <div className="font-semibold text-marinho truncate">{c.titulo}</div>
                <div className="text-xs text-marinho/60 truncate">📍 {c.endereco} · atualizado {fmtDataHoraSP(c.atualizado_em)}</div>
                {master && (() => { const a = atendimento.get(c.id) || {}; const t = [a.abertoPor ? `aberto por ${a.abertoPor}` : null, a.respondidoPor ? `último atendimento: ${a.respondidoPor}` : null].filter(Boolean).join(' · '); return t ? <div className="text-xs text-marinho/50 truncate">👤 {t}</div> : null; })()}
              </div>
              {(c.prioridade === 'alta' || c.prioridade === 'urgente') && <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-erro/10 text-erro">{PRIORIDADES[c.prioridade]}</span>}
              <span className={`text-xs font-semibold rounded-full px-3 py-1 ${COR_STATUS_CHAMADO[c.status] || ''}`}>{STATUS_CHAMADO[c.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export async function DetalheChamadoPainel({ supabase, id, master, orcamentoHref, podeExcluir = false }) {
  const { data: c } = await supabase.from('chamados').select('*, clientes(nome_empresa)').eq('id', id).maybeSingle();
  if (!c) return null;
  const { data: msgs } = await supabase.from('chamado_mensagens').select('*').eq('chamado_id', id).order('criado_em');
  const mensagens = await comLinksTemporarios(createAdminClient(), msgs); // só chega aqui depois do banco confirmar que o chamado é visível para este usuário
  return <DetalheChamado chamado={c} mensagens={mensagens} meuTipo={master ? 'fixin' : 'imobiliaria'} orcamentoHref={orcamentoHref} podeExcluir={podeExcluir} empresa={master ? c.clientes?.nome_empresa : null} />;
}
