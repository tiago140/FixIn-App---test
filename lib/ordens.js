import { createAdminClient } from '@/lib/supabase/admin';
import { enviarEmailAvisoImobiliaria } from '@/lib/email';
import { urlSite } from '@/lib/chamados';
import { enviarPushPrestador } from '@/lib/push';
import { pdfDaOrdem } from '@/lib/ordensPdf';

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
export async function avisarPrestadorOS(os, tipo, extraPag = '') {
  try {
    const admin = createAdminClient();
    const p = await emailDoPrestador(admin, os.prestador_id);
    const m = {
      nova: ['Nova ordem de serviço', 'Você recebeu uma nova ordem de serviço', `A FixIn enviou a ordem <strong>${esc(os.numero)}</strong> para o imóvel <strong>${esc(os.endereco)}</strong>. Entre no portal para aceitar ou recusar.${os.descricao ? `<br><br>${esc(os.descricao)}` : ''}`],
      liberada: ['Ordem de serviço liberada', 'Orçamento aprovado — pode executar', `O orçamento do imóvel <strong>${esc(os.endereco)}</strong> foi aprovado. A ordem <strong>${esc(os.numero)}</strong> está liberada para execução, com os valores que você orçou.`],
      aprovada: ['Serviço aprovado', 'Serviço aprovado pela FixIn', `A conclusão da ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}) foi aprovada. Obrigado! Anexe sua nota fiscal no portal para agilizar o pagamento.`],
      reprovada: ['Serviço reprovado — ajustes necessários', 'A FixIn pediu ajustes no serviço', `A conclusão da ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}) não foi aprovada.<br><br><strong>O que ajustar:</strong><br>${esc(os.reprovacao_motivo || '')}<br><br>Veja as fotos da reprovação no portal, refaça e envie a conclusão de novo.`],
      paga: ['Pagamento registrado', 'Pagamento registrado', `Registramos um pagamento da ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)})${extraPag ? `: <strong>${esc(extraPag)}</strong>` : ''}. O comprovante está no portal.`],
      nota: ['Falta a nota fiscal', 'Lembrete: anexe a nota fiscal', `A ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}) ainda está sem nota fiscal. Anexe no portal para o pagamento não atrasar.`],
      mensagem: ['Nova mensagem da FixIn', 'A FixIn respondeu sua dúvida', `Sobre a ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}):<br><br>“${esc(extraPag)}”`],
      cancelada: ['Ordem de serviço cancelada', 'Ordem de serviço cancelada', `A ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}) foi cancelada pela FixIn.`],
    }[tipo];
    if (!m) return { enviado: false };
    if (!p.email) { await enviarPushPrestador(os.prestador_id, { titulo: m[0], corpo: os.endereco, url: ['nova', 'liberada'].includes(tipo) ? `/api/ordens/${os.id}/pdf` : `/prestador/ordens/${os.id}` }); return { enviado: false }; }
    // Ordem nova ou liberada: o PDF (sem margem) vai em anexo e é o que abre ao tocar na notificação do celular.
    let anexos = [];
    const comPdf = ['nova', 'liberada'].includes(tipo);
    if (comPdf) { try { const r = await pdfDaOrdem(os.id); if (r) anexos = [{ nome: r.nome, conteudo: r.buffer, tipo: 'application/pdf' }]; } catch (e) {} }
    const urlPush = comPdf ? `/api/ordens/${os.id}/pdf` : `/prestador/ordens/${os.id}`;
    await enviarPushPrestador(os.prestador_id, { titulo: m[0], corpo: os.endereco, url: urlPush });
    return await enviarEmailAvisoImobiliaria({ para: [p.email], assunto: `${m[0]} — ${os.numero}`, titulo: m[1], corpoHtml: `<p>Olá, ${esc(p.nome)}.</p><p>${m[2]}</p>${comPdf ? '<p>O PDF da ordem de serviço está em anexo.</p>' : ''}`, link: `${urlSite()}/prestador/ordens/${os.id}`, textoBotao: 'Abrir no portal', anexos });
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
      concluida: ['concluiu o serviço', `<strong>${esc(nome)}</strong> enviou a conclusão da ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}) com fotos. Abra para aprovar ou reprovar.`],
      mensagem: ['mandou uma mensagem', `<strong>${esc(nome)}</strong> escreveu sobre a ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}):<br><br>“${esc(extra)}”`],
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

// Obra iniciada (primeira foto de Início do prestador): avisa a imobiliária (administradores + quem pediu) e a equipe FixIn.
// A imobiliária então inclui o interessado (locatário/locador). Nunca lança erro.
export async function avisarObraIniciada(os, quem) {
  try {
    const admin = createAdminClient();
    const { destinatariosDoOrcamento } = await import('@/lib/destinatarios');
    const equipe = await emailsEquipe(admin);
    const imob = os.orcamento_id ? (await destinatariosDoOrcamento(admin, os.orcamento_id)).emails : [];
    const corpo = `<p>A obra do imóvel <strong>${esc(os.endereco)}</strong> foi iniciada.</p><p><strong>Obra iniciada por: ${esc(quem)}</strong></p><p>O link de acompanhamento já está pronto. Entre no sistema, abra o orçamento e inclua o WhatsApp e o e-mail de quem deve acompanhar a obra.</p>`;
    if (imob.length) await enviarEmailAvisoImobiliaria({ para: imob, assunto: `Obra iniciada — ${os.endereco}`, titulo: 'Obra iniciada', corpoHtml: corpo, link: `${urlSite()}/imobiliaria/orcamentos/${os.orcamento_id}`, textoBotao: 'Abrir e incluir o interessado' });
    if (equipe.length) await enviarEmailAvisoImobiliaria({ para: equipe, assunto: `Obra iniciada — ${os.numero}`, titulo: 'Obra iniciada', corpoHtml: `<p>${esc(quem)} iniciou a obra da ordem <strong>${esc(os.numero)}</strong> (${esc(os.endereco)}). O link de acompanhamento foi ativado.</p>`, link: `${urlSite()}/master/ordens/${os.id}`, textoBotao: 'Abrir a ordem' });
  } catch (e) {}
}
