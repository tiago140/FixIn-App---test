import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// ===== COMO O E-MAIL SAI =====
// 1) Caixa de e-mail da Hostinger (SMTP) — se SMTP_USER e SMTP_PASS estiverem no Vercel. É o caminho recomendado.
// 2) Resend — alternativa, se só RESEND_API_KEY estiver configurada.
// Sem nenhum dos dois, nada é enviado e o sistema avisa o motivo (o resto continua funcionando).

const MSG_NAO_CONFIGURADO = 'O envio de e-mail ainda não foi configurado: faltam SMTP_USER e SMTP_PASS (a caixa de e-mail da Hostinger) nas variáveis do Vercel.';
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function configEmail(env = process.env) {
  if (env.SMTP_USER && env.SMTP_PASS) {
    const porta = Number(env.SMTP_PORT) || 465;
    return { via: 'smtp', host: env.SMTP_HOST || 'smtp.hostinger.com', porta, seguro: porta === 465, usuario: env.SMTP_USER, senha: env.SMTP_PASS };
  }
  if (env.RESEND_API_KEY) return { via: 'resend', chave: env.RESEND_API_KEY };
  return { via: null };
}

// Para mostrar na tela (nunca devolve senha nem chave).
export function statusEnvioEmail(env = process.env) {
  const c = configEmail(env);
  if (c.via === 'smtp') return { via: 'smtp', ok: true, descricao: `Pronto: enviando pela caixa ${c.usuario} (${c.host}, porta ${c.porta}).`, caixa: c.usuario };
  if (c.via === 'resend') return { via: 'resend', ok: true, descricao: 'Pronto: enviando pelo Resend.' };
  return { via: null, ok: false, descricao: MSG_NAO_CONFIGURADO };
}

function nomeDoRemetente(env) {
  const m = /^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/.exec(env.EMAIL_REMETENTE || '');
  return (m ? m[1] : 'FixIn Reformas').replace(/["<>]/g, '').trim() || 'FixIn Reformas';
}

export function traduzirErroSmtp(e) {
  const msg = String(e?.message || '');
  if (e?.code === 'EAUTH' || /\b535\b|authentication|invalid login/i.test(msg)) return 'O servidor de e-mail recusou o usuário ou a senha. Confira SMTP_USER e SMTP_PASS no Vercel: é a senha da CAIXA de e-mail, não a do painel da Hostinger.';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EDNS', 'ENOTFOUND'].includes(e?.code) || /timeout|getaddrinfo|ECONN/i.test(msg)) return 'Não consegui conectar ao servidor de e-mail. Confira SMTP_HOST e SMTP_PORT (Hostinger: smtp.hostinger.com, porta 465).';
  if (/limit|quota|too many|rate|\b452\b|4\.2\.2/i.test(msg)) return 'A caixa de e-mail atingiu o limite diário de envios do plano. Veja os limites no hPanel (Emails > Caixas de e-mail) ou tente amanhã.';
  if (/\b55\d\b|sender|from address|not allowed|relay|rejected/i.test(msg)) return 'O servidor recusou o envio. O remetente precisa ser a própria caixa configurada em SMTP_USER, e o destinatário precisa ser um e-mail válido.';
  return 'Falha ao enviar o e-mail: ' + msg;
}

// Envia para um ou vários destinatários. Nunca lança erro: devolve { enviado, motivo, via, para }.
export async function enviarEmail({ para, assunto, html, anexos = [], env = process.env, criarTransporte = (o) => nodemailer.createTransport(o) }) {
  const lista = [...new Set((Array.isArray(para) ? para : [para]).map((e) => String(e || '').trim().toLowerCase()).filter((e) => EMAIL_VALIDO.test(e)))];
  if (lista.length === 0) return { enviado: false, motivo: 'Não há e-mail cadastrado para receber esta mensagem.', para: [] };

  const cfg = configEmail(env);
  if (!cfg.via) return { enviado: false, motivo: MSG_NAO_CONFIGURADO, para: lista };

  try {
    if (cfg.via === 'smtp') {
      const transporte = criarTransporte({
        host: cfg.host, port: cfg.porta, secure: cfg.seguro,
        auth: { user: cfg.usuario, pass: cfg.senha },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 25000,
      });
      // A Hostinger só aceita enviar "de" a própria caixa: o endereço do remetente é sempre SMTP_USER.
      await transporte.sendMail({
        from: { name: nomeDoRemetente(env), address: cfg.usuario },
        replyTo: cfg.usuario,
        to: lista,
        bcc: env.EMAIL_COPIA || undefined,
        subject: assunto,
        html,
        attachments: anexos.map((a) => ({ filename: a.nome, content: a.conteudo, contentType: a.tipo || 'application/pdf' })),
      });
    } else {
      const r = await new Resend(cfg.chave).emails.send({
        from: env.EMAIL_REMETENTE || 'FixIn Reformas <orcamentos@fixinreformas.com.br>',
        to: lista, subject: assunto, html,
        attachments: anexos.map((a) => ({ filename: a.nome, content: a.conteudo })),
      });
      if (r?.error) throw new Error(r.error.message || 'erro do Resend');
    }
    return { enviado: true, via: cfg.via, para: lista };
  } catch (e) {
    console.error('Erro ao enviar e-mail:', e);
    return { enviado: false, via: cfg.via, para: lista, motivo: cfg.via === 'smtp' ? traduzirErroSmtp(e) : 'Falha ao enviar o e-mail: ' + (e?.message || '') };
  }
}

function moldura(titulo, corpoHtml) {
  return `
    <div style="font-family: sans-serif; color:#182F50;">
      <h2 style="margin-bottom:4px;">FixIn Reformas</h2>
      <h3 style="margin-top:0;">${titulo}</h3>
      ${corpoHtml}
      <p style="font-size:12px;color:#777;margin-top:24px;">Este é um e-mail automático do sistema de orçamentos FixIn Reformas.</p>
    </div>
  `;
}

// "Gerar PDF e enviar": leva o PDF em anexo e o link. `paraEmail` pode ser um e-mail ou uma lista.
export async function enviarEmailOrcamentoPronto({ paraEmail, nomeImobiliaria, numero, endereco, linkPdf, pdfBuffer }) {
  return enviarEmail({
    para: paraEmail,
    assunto: `Orçamento ${numero} pronto — ${endereco}`,
    anexos: pdfBuffer ? [{ nome: `Orcamento-${numero}.pdf`, conteudo: pdfBuffer, tipo: 'application/pdf' }] : [],
    html: moldura('Seu orçamento está pronto 📄', `
      <p>Olá, ${esc(nomeImobiliaria)}!</p>
      <p>O orçamento <strong>${esc(numero)}</strong> referente ao imóvel <strong>${esc(endereco)}</strong> está pronto${pdfBuffer ? ' e segue em anexo' : ''}.</p>
      <p><a href="${esc(linkPdf)}" style="background:#182F50;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Abrir orçamento em PDF</a></p>
      <p>Para aprovar ou recusar, entre no sistema e abra o orçamento.</p>`),
  });
}

const TEXTO_STATUS = {
  aprovado: { assunto: (n) => `Orçamento ${n} aprovado`, titulo: 'Orçamento aprovado ✅', corpo: (n, e) => `<p>O orçamento <strong>${n}</strong> do imóvel <strong>${e}</strong> foi marcado como <strong>aprovado</strong>. A execução do serviço será organizada em seguida.</p>` },
  em_execucao: { assunto: (n) => `Orçamento ${n} em execução`, titulo: 'Serviço em execução 🔧', corpo: (n, e) => `<p>O serviço do orçamento <strong>${n}</strong> do imóvel <strong>${e}</strong> está <strong>em execução</strong>.</p>` },
  finalizado: { assunto: (n) => `Orçamento ${n} finalizado`, titulo: 'Serviço finalizado 🏁', corpo: (n, e) => `<p>O serviço do orçamento <strong>${n}</strong> do imóvel <strong>${e}</strong> foi <strong>finalizado</strong>. Obrigado pela confiança!</p>` },
};

// aprovado, em_execucao, finalizado (o "enviado" usa enviarEmailOrcamentoPronto, que leva o PDF).
export async function enviarEmailStatusOrcamento({ paraEmail, nomeImobiliaria, numero, endereco, status }) {
  const modelo = TEXTO_STATUS[status];
  if (!modelo) return { enviado: false, motivo: 'status sem modelo de e-mail', para: [] };
  return enviarEmail({
    para: paraEmail,
    assunto: modelo.assunto(numero),
    html: moldura(modelo.titulo, `<p>Olá, ${esc(nomeImobiliaria)}!</p>${modelo.corpo(esc(numero), esc(endereco))}`),
  });
}

// Lembrete diário (cron) enquanto o pagamento não é confirmado. Tem valor em R$: vai só para administradores.
export async function enviarEmailPendenciaFinanceira({ paraEmail, nomeImobiliaria, numero, endereco, valorPendente, diasAtraso }) {
  const valorFmt = Number(valorPendente || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return enviarEmail({
    para: paraEmail,
    assunto: `Pendência financeira — orçamento ${numero}`,
    html: moldura('Pendência financeira ⚠️', `
      <p>Olá, ${esc(nomeImobiliaria)}!</p>
      <p>O orçamento <strong>${esc(numero)}</strong> do imóvel <strong>${esc(endereco)}</strong> está com pagamento pendente há <strong>${esc(diasAtraso)} dia(s)</strong>.</p>
      <p>Valor pendente: <strong>${valorFmt}</strong></p>
      <p>Este lembrete continuará sendo enviado diariamente até a confirmação do pagamento.</p>`),
  });
}

export async function enviarEmailTeste({ para }) {
  return enviarEmail({
    para,
    assunto: 'Teste de envio — FixIn Reformas',
    html: moldura('Teste de envio ✅', '<p>Se você está lendo isto, o envio de e-mails do sistema FixIn está funcionando.</p>'),
  });
}
