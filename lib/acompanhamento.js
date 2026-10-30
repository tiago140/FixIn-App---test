import { createAdminClient } from '@/lib/supabase/admin';
import { novoToken } from '@/lib/ordensArquivos';
import { urlSite } from '@/lib/chamados';

import { ETAPAS, ETAPA_LABEL, ETAPA_COR } from '@/lib/etapasAcomp';
export { ETAPAS, ETAPA_LABEL, ETAPA_COR };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const linkObra = (token) => `${urlSite()}/obra/${token}`;

// Cria (se faltar) o acompanhamento de um orçamento. Só chamar depois de checar que a obra pode começar.
export async function garantirAcompanhamento(orcamentoId, admin = createAdminClient(), { etapa = 'aprovado' } = {}) {
  const { data: ja } = await admin.from('acompanhamentos').select('*').eq('orcamento_id', orcamentoId).maybeSingle();
  if (ja) return ja;
  const agora = new Date().toISOString();
  const e = ETAPAS.find((x) => x.id === etapa) || ETAPAS[0];
  const { data, error } = await admin.from('acompanhamentos').insert({
    orcamento_id: orcamentoId, token: novoToken(), etapa: e.id, percentual: e.pct || 0,
    iniciado_em: e.id === 'aprovado' ? null : agora, concluido_em: e.id === 'concluida' ? agora : null,
  }).select('*').single();
  if (error) { const { data: de_novo } = await admin.from('acompanhamentos').select('*').eq('orcamento_id', orcamentoId).maybeSingle(); return de_novo || null; }
  await admin.from('acompanhamento_eventos').insert({ acompanhamento_id: data.id, tipo: 'etapa', etapa: e.id, percentual: e.pct || 0, texto: 'Acompanhamento aberto.', autor_tipo: 'sistema' });
  return data;
}

// Linha do tempo: lançamentos da equipe + fotos que o prestador enviou pelo app/link nas ordens do orçamento.
// equipe=true vê tudo; os demais não veem fotos "depois" antes da conclusão nem notas internas (publico=false).
export async function linhaDoTempo(acomp, { equipe = false } = {}, admin = createAdminClient()) {
  const concluida = acomp.etapa === 'concluida';
  const { data: evs } = await admin.from('acompanhamento_eventos').select('*').eq('acompanhamento_id', acomp.id).order('criado_em', { ascending: false });
  const itens = [];
  for (const e of evs || []) {
    if (!equipe && !e.publico) continue;
    itens.push({ ref: `e_${e.id}`, id: e.id, origem: 'evento', tipo: e.tipo, etapa: e.etapa, percentual: e.percentual, texto: e.texto, legenda: e.legenda, autor: e.autor_tipo === 'prestador' ? 'Prestador' : 'FixIn', quando: e.criado_em, publico: e.publico, temFoto: e.tipo === 'foto' && !!e.path });
  }
  const { data: ordens } = await admin.from('ordens_servico').select('id').eq('orcamento_id', acomp.orcamento_id);
  const ids = (ordens || []).map((o) => o.id);
  if (ids.length) {
    const { data: fotos } = await admin.from('os_fotos').select('id, tipo, legenda, origem, criado_em').in('os_id', ids).neq('tipo', 'reprovacao').order('criado_em', { ascending: false });
    for (const f of fotos || []) {
      if (f.tipo === 'depois' && !concluida && !equipe) continue;
      itens.push({ ref: `o_${f.id}`, id: f.id, origem: 'os', tipo: 'foto', legenda: f.legenda, autor: f.origem === 'equipe' ? 'FixIn' : 'Prestador', quando: f.criado_em, publico: true, temFoto: true, momento: f.tipo });
    }
  }
  return itens.sort((a, b) => new Date(b.quando) - new Date(a.quando));
}

// Localiza o arquivo da foto a partir da referência "e_<id>" ou "o_<id>", garantindo que pertence a este acompanhamento.
export async function caminhoDaFoto(acomp, ref, { equipe = false } = {}, admin = createAdminClient()) {
  const m = /^([eo])_([0-9a-f-]{36})$/i.exec(String(ref || ''));
  if (!m || !UUID.test(m[2])) return null;
  if (m[1] === 'e') {
    const { data } = await admin.from('acompanhamento_eventos').select('path, tipo, publico').eq('id', m[2]).eq('acompanhamento_id', acomp.id).maybeSingle();
    if (!data || data.tipo !== 'foto' || !data.path || (!equipe && !data.publico)) return null;
    return data.path;
  }
  const { data: f } = await admin.from('os_fotos').select('path, tipo, os_id').eq('id', m[2]).maybeSingle();
  if (!f || f.tipo === 'reprovacao') return null;
  const { data: os } = await admin.from('ordens_servico').select('orcamento_id').eq('id', f.os_id).maybeSingle();
  if (!os || os.orcamento_id !== acomp.orcamento_id) return null;
  if (f.tipo === 'depois' && acomp.etapa !== 'concluida' && !equipe) return null;
  return f.path;
}

export function mensagemWhatsApp({ endereco, link, etapa, percentual }) {
  const sit = ETAPA_LABEL[etapa] || 'em andamento';
  return `Olá! Segue o link para acompanhar a obra do imóvel ${endereco}. Situação atual: ${sit} (${percentual || 0}% concluído). Você vê as fotos e o que já foi feito, atualizado a cada etapa: ${link}`;
}

export function whatsappUrl(fone, texto) {
  const d = String(fone || '').replace(/\D/g, '');
  const n = d && !d.startsWith('55') && d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

// Abre sozinho o acompanhamento de toda obra que já começou: orçamento em execução/finalizado ou ordem de serviço iniciada.
export async function sincronizarAcompanhamentos(admin = createAdminClient()) {
  try {
    const { data: existentes } = await admin.from('acompanhamentos').select('orcamento_id');
    const tem = new Set((existentes || []).map((x) => x.orcamento_id));
    const { data: orcs } = await admin.from('orcamentos').select('id, status').in('status', ['em_execucao', 'finalizado']);
    const { data: oss } = await admin.from('ordens_servico').select('orcamento_id').not('iniciada_em', 'is', null).not('orcamento_id', 'is', null);
    const alvo = new Map();
    for (const o of orcs || []) if (!tem.has(o.id)) alvo.set(o.id, o.status === 'finalizado' ? 'concluida' : 'iniciada');
    for (const o of oss || []) if (!tem.has(o.orcamento_id) && !alvo.has(o.orcamento_id)) alvo.set(o.orcamento_id, 'iniciada');
    for (const [id, etapa] of alvo) await garantirAcompanhamento(id, admin, { etapa });
  } catch (e) {}
}
