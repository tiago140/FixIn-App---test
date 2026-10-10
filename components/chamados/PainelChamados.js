import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { comLinksTemporarios } from '@/lib/chamados';
import { STATUS_CHAMADO, COR_STATUS_CHAMADO, PRIORIDADES } from '@/lib/chamadosTextos';
import { fmtDataHoraSP } from '@/lib/format';
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
export async function ListaChamadosPainel({ supabase, base, master, profile, filtro }) {
  let q = supabase.from('chamados').select('*, clientes(nome_empresa, slug_chamados)').order('atualizado_em', { ascending: false }).limit(300);
  if (filtro && STATUS_CHAMADO[filtro]) q = q.eq('status', filtro);
  const { data } = await q;
  const lista = (data || []).slice().sort((a, b) => {
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
        <Link href={base} className={`text-sm rounded-full px-3 py-1 border ${!filtro ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho'}`}>Todos</Link>
        {Object.entries(STATUS_CHAMADO).map(([k, v]) => (
          <Link key={k} href={`${base}?s=${k}`} className={`text-sm rounded-full px-3 py-1 border ${filtro === k ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho'}`}>{v}</Link>
        ))}
      </div>
      {lista.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum chamado por aqui.</div>
      ) : (
        <div className="bg-white border border-linha rounded-lg divide-y divide-linha">
          {lista.map((c) => (
            <Link key={c.id} href={`${base}/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fundo flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-marinho/50">{c.numero}{master ? ` · ${c.clientes?.nome_empresa || ''}` : ''} · {c.solicitante_tipo === 'locador' ? 'Locador' : 'Locatário'}: {c.solicitante_nome}</div>
                <div className="font-semibold text-marinho truncate">{c.titulo}</div>
                <div className="text-xs text-marinho/60 truncate">📍 {c.endereco} · atualizado {fmtDataHoraSP(c.atualizado_em)}</div>
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

export async function DetalheChamadoPainel({ supabase, id, master, orcamentoHref }) {
  const { data: c } = await supabase.from('chamados').select('*, clientes(nome_empresa)').eq('id', id).maybeSingle();
  if (!c) return null;
  const { data: msgs } = await supabase.from('chamado_mensagens').select('*').eq('chamado_id', id).order('criado_em');
  const mensagens = await comLinksTemporarios(createAdminClient(), msgs); // só chega aqui depois do banco confirmar que o chamado é visível para este usuário
  return <DetalheChamado chamado={c} mensagens={mensagens} meuTipo={master ? 'fixin' : 'imobiliaria'} orcamentoHref={orcamentoHref} empresa={master ? c.clientes?.nome_empresa : null} />;
}
