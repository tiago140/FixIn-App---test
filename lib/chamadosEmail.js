import { enviarEmailChamado, enviarEmailAvisoImobiliaria } from './email';
import { destinatariosDaImobiliaria } from './destinatarios';
import { linkDoChamado, formatarCodigo, STATUS_CHAMADO, urlSite } from './chamados';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Avisa o solicitante por e-mail (se ele informou um). Nunca lança erro. "tipo": aberto | resposta | status.
// Respostas seguidas: no máximo 1 e-mail a cada 10 minutos por chamado, para não encher a caixa dele.
export async function avisarSolicitante(admin, ch, tipo, extra = {}) {
  try {
    if (!ch.solicitante_email) return { enviado: false };
    if (tipo === 'resposta' && ch.ultimo_email_em && Date.now() - new Date(ch.ultimo_email_em).getTime() < 10 * 60 * 1000) return { enviado: false };
    const { data: cli } = await admin.from('clientes').select('nome_empresa').eq('id', ch.cliente_id).maybeSingle();
    const link = await linkDoChamado(admin, ch);
    const t = esc(ch.titulo);
    const modelos = {
      aberto: { assunto: `Chamado ${ch.numero} aberto`, titulo: 'Recebemos o seu chamado ✅', corpo: `<p>Olá, ${esc(ch.solicitante_nome)}!</p><p>O seu chamado <strong>${esc(ch.numero)}</strong> (${t}) foi aberto.${extra.codigo ? ` <br/><strong>Protocolo:</strong> ${esc(ch.numero)} · código de acesso <strong style="font-size:18px;letter-spacing:2px;">${esc(formatarCodigo(extra.codigo))}</strong>. Guarde estes dados: com seu e-mail ou telefone e o código você recupera o chamado se perder o link.<br/>` : ''} Por este link você acompanha o andamento, conversa com a equipe, envia fotos e, quando houver, aprova o orçamento.</p>` },
      resposta: { assunto: `Nova mensagem no chamado ${ch.numero}`, titulo: 'Você tem uma nova mensagem 💬', corpo: `<p>Olá, ${esc(ch.solicitante_nome)}!</p><p>Há uma nova mensagem no chamado <strong>${esc(ch.numero)}</strong> (${t}).</p>` },
      status: { assunto: `Chamado ${ch.numero}: ${STATUS_CHAMADO[extra.status] || 'atualização'}`, titulo: 'Seu chamado foi atualizado', corpo: `<p>Olá, ${esc(ch.solicitante_nome)}!</p><p>O chamado <strong>${esc(ch.numero)}</strong> (${t}) agora está: <strong>${esc(STATUS_CHAMADO[extra.status] || '')}</strong>.</p>${extra.status === 'orcamento' ? '<p>Há um orçamento para você analisar e aprovar pelo link abaixo.</p>' : ''}` },
    };
    const m = modelos[tipo];
    const r = await enviarEmailChamado({ para: ch.solicitante_email, assunto: m.assunto, titulo: m.titulo, corpoHtml: m.corpo, link, imobiliaria: cli?.nome_empresa });
    if (r.enviado) await admin.from('chamados').update({ ultimo_email_em: new Date().toISOString() }).eq('id', ch.id);
    return r;
  } catch (e) { return { enviado: false }; }
}


// Avisa a IMOBILIÁRIA por e-mail: administradores + o usuário que abriu o chamado (se foi alguém da equipe dela).
// tipo: novo | resposta | equipe | aprovado | recusado | status. Nunca lança erro.
export async function avisarImobiliariaChamado(admin, ch, tipo, extra = {}) {
  try {
    const dest = await destinatariosDaImobiliaria(admin, ch.cliente_id, { criadoPor: ch.criado_por || null });
    if (!dest.emails.length) return { enviado: false };
    const t = esc(ch.titulo);
    const quem = esc(ch.solicitante_nome);
    const papel = ch.solicitante_tipo === 'locador' ? 'locador' : 'locatário';
    const modelos = {
      novo: { assunto: `Novo chamado ${ch.numero}: ${ch.titulo}`, titulo: 'Novo chamado aberto', corpo: `<p>O ${papel} <strong>${quem}</strong> abriu o chamado <strong>${esc(ch.numero)}</strong>: ${t}.</p><p>Endereço: ${esc(ch.endereco)}</p>` },
      resposta: { assunto: `Nova mensagem no chamado ${ch.numero}`, titulo: 'O solicitante respondeu', corpo: `<p>${quem} enviou uma mensagem no chamado <strong>${esc(ch.numero)}</strong> (${t}).</p>` },
      equipe: { assunto: `Atualização no chamado ${ch.numero}`, titulo: 'A equipe FixIn respondeu', corpo: `<p>Há uma nova mensagem da equipe FixIn no chamado <strong>${esc(ch.numero)}</strong> (${t}).</p>` },
      aprovado: { assunto: `Orçamento aprovado no chamado ${ch.numero}`, titulo: 'Orçamento aprovado pelo solicitante', corpo: `<p>${quem} aprovou o orçamento do chamado <strong>${esc(ch.numero)}</strong> (${t}).</p>` },
      recusado: { assunto: `Orçamento recusado no chamado ${ch.numero}`, titulo: 'Orçamento recusado pelo solicitante', corpo: `<p>${quem} recusou o orçamento do chamado <strong>${esc(ch.numero)}</strong> (${t}).</p>` },
      status: { assunto: `Chamado ${ch.numero}: ${STATUS_CHAMADO[extra.status] || 'atualização'}`, titulo: 'Chamado atualizado', corpo: `<p>O chamado <strong>${esc(ch.numero)}</strong> (${t}) mudou para <strong>${esc(STATUS_CHAMADO[extra.status] || '')}</strong>.</p>` },
    };
    const m = modelos[tipo];
    if (!m) return { enviado: false };
    return await enviarEmailAvisoImobiliaria({ para: dest.emails, assunto: m.assunto, titulo: m.titulo, corpoHtml: m.corpo, link: `${urlSite()}/imobiliaria/chamados/${ch.id}` });
  } catch (e) { return { enviado: false }; }
}
