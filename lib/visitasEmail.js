import { createAdminClient } from '@/lib/supabase/admin';
import { destinatariosDaImobiliaria } from '@/lib/destinatarios';
import { enviarEmailAvisoImobiliaria } from '@/lib/email';
import { fmtDataHoraSP } from '@/lib/format';
import { urlSite } from '@/lib/chamados';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Avisa a imobiliária (administradores + quem pediu a visita) quando a equipe agenda, confirma, cancela ou sugere outra data.
// tipo: agendada | confirmada | cancelada | sugerida. Nunca lança erro.
export async function avisarImobiliariaVisita(visita, tipo) {
  try {
    const admin = createAdminClient();
    const dest = await destinatariosDaImobiliaria(admin, visita.cliente_id, { criadoPor: visita.criado_por || null });
    if (!dest.emails.length) return { enviado: false };
    const quando = visita.data_hora ? ` para <strong>${esc(fmtDataHoraSP(visita.data_hora))}</strong>` : '';
    const m = {
      agendada: ['Visita agendada', 'Visita agendada pela FixIn', `A FixIn agendou uma visita${quando} no imóvel <strong>${esc(visita.endereco)}</strong>.`],
      confirmada: ['Visita confirmada', 'Visita confirmada', `A visita${quando} no imóvel <strong>${esc(visita.endereco)}</strong> foi confirmada.`],
      cancelada: ['Visita cancelada', 'Visita cancelada', `A visita no imóvel <strong>${esc(visita.endereco)}</strong> foi cancelada.`],
      sugerida: ['Nova data sugerida para a visita', 'Nova data sugerida', `A FixIn sugeriu outra data${quando} para a visita no imóvel <strong>${esc(visita.endereco)}</strong>. Acesse o sistema para aceitar ou recusar.`],
    }[tipo];
    if (!m) return { enviado: false };
    return await enviarEmailAvisoImobiliaria({ para: dest.emails, assunto: `${m[0]} — ${visita.endereco}`, titulo: m[1], corpoHtml: `<p>${m[2]}</p>`, link: `${urlSite()}/imobiliaria/visitas` });
  } catch (e) { return { enviado: false }; }
}
