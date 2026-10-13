import { createAdminClient } from '@/lib/supabase/admin';
import { enviarEmailAvisoImobiliaria } from '@/lib/email';
import { urlSite } from '@/lib/chamados';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

import { totalItensOS } from '@/lib/ordensStatus';
export { STATUS_OS, ORIGEM_OS, totalItensOS } from '@/lib/ordensStatus';

// E-mails de toda a equipe FixIn (usuários master ativos).
async function emailsEquipe(admin) {
  const { data } = await admin.from('profiles').select('email').eq('role', 'master').neq('ativo', false);
  return [...new Set((data || []).map((p) => (p.email || '').trim()).filter(Boolean))];
}

async function emailDoPrestador(admin, prestadorId) {
  const { data } = await admin.from('prestadores').select('email, nome').eq('id', prestadorId).maybeSingle();
  return { email: (data?.email || '').trim(), nome: data?.nome || '' };
}

// Avisa o prestador. tipo: nova | liberada | cancelada. Nunca lança erro.
export async function avisarPrestadorOS(os, tipo) {
  try {
    const admin = createAdminClient();
    const p = await emailDoPrestador(admin, os.prestador_id);
    if (!p.email) return { enviado: false };
    const m = {
      nova: ['Nova ordem de serviço', 'Você recebeu uma nova ordem de serviço', `A FixIn enviou a ordem <strong>${esc(os.numero)}</strong> para o imóvel <strong>${esc(os.endereco)}</strong>. Entre no portal para aceitar ou recusar.${os.descricao ? `<br><br>${esc(os.descricao)}` : ''}`],
      liberada: ['Ordem de serviço liberada', 'Orçamento aprovado — pode executar', `O orçamento do imóvel <strong>${esc(os.endereco)}</strong> foi aprovado. A ordem <strong>${esc(os.numero)}</strong> está liberada para execução, com os valores que você orçou.`],
      cancelada: ['Ordem de serviço cancelada', 'Ordem de serviço cancelada', `A ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}) foi cancelada pela FixIn.`],
    }[tipo];
    if (!m) return { enviado: false };
    return await enviarEmailAvisoImobiliaria({ para: [p.email], assunto: `${m[0]} — ${os.numero}`, titulo: m[1], corpoHtml: `<p>Olá, ${esc(p.nome)}.</p><p>${m[2]}</p>`, link: `${urlSite()}/prestador/ordens/${os.id}`, textoBotao: 'Abrir no portal' });
  } catch (e) { return { enviado: false }; }
}

// Avisa a equipe FixIn sobre a resposta do prestador. tipo: aceita | recusada | orcada. Nunca lança erro.
export async function avisarEquipeOS(os, tipo, extra = '') {
  try {
    const admin = createAdminClient();
    const para = await emailsEquipe(admin);
    if (!para.length) return { enviado: false };
    const { nome } = await emailDoPrestador(admin, os.prestador_id);
    const m = {
      aceita: ['aceitou a ordem', `<strong>${esc(nome)}</strong> aceitou a ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}).`],
      recusada: ['recusou a ordem', `<strong>${esc(nome)}</strong> recusou a ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}).${extra ? `<br>Motivo: ${esc(extra)}` : ''}`],
      orcada: ['enviou os valores', `<strong>${esc(nome)}</strong> enviou os valores da ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}). Abra para aplicar ao orçamento e definir a margem.`],
    }[tipo];
    if (!m) return { enviado: false };
    return await enviarEmailAvisoImobiliaria({ para, assunto: `Prestador ${m[0]} — ${os.numero}`, titulo: `Prestador ${m[0]}`, corpoHtml: `<p>${m[1]}</p>`, link: `${urlSite()}/master/ordens/${os.id}`, textoBotao: 'Abrir a ordem' });
  } catch (e) { return { enviado: false }; }
}

// Quando o orçamento é aprovado, as ordens ligadas a ele (já com valores aplicados) são liberadas para execução.
// Nunca lança erro.
export async function liberarOrdensDoOrcamento(orcamentoId) {
  try {
    const admin = createAdminClient();
    const { data: ordens } = await admin.from('ordens_servico').select('*').eq('orcamento_id', orcamentoId).eq('status', 'aplicada');
    for (const os of ordens || []) {
      await admin.from('ordens_servico').update({ status: 'em_execucao', liberado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }).eq('id', os.id).eq('status', 'aplicada');
      await avisarPrestadorOS(os, 'liberada');
    }
  } catch (e) {}
}
