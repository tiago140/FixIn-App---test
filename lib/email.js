import { Resend } from 'resend';

// Precisa da variável de ambiente RESEND_API_KEY (grátis em resend.com).
// Se não estiver configurada, a função simplesmente não envia nada e avisa no log —
// o resto do sistema continua funcionando normalmente.
export async function enviarEmailOrcamentoPronto({ paraEmail, nomeImobiliaria, numero, endereco, linkPdf }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY não configurada — e-mail não enviado.');
    return { enviado: false, motivo: 'RESEND_API_KEY ausente' };
  }
  if (!paraEmail) {
    return { enviado: false, motivo: 'imobiliária sem e-mail cadastrado' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.EMAIL_REMETENTE || 'FixIn Reformas <orcamentos@fixinreformas.com.br>',
      to: paraEmail,
      subject: `Orçamento ${numero} pronto — ${endereco}`,
      html: `
        <div style="font-family: sans-serif; color:#182F50;">
          <h2 style="margin-bottom:4px;">FixIn Reformas</h2>
          <p>Olá, ${nomeImobiliaria || ''}!</p>
          <p>O orçamento <strong>${numero}</strong> referente ao imóvel <strong>${endereco}</strong> está pronto.</p>
          <p><a href="${linkPdf}" style="background:#182F50;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Abrir orçamento em PDF</a></p>
          <p style="font-size:12px;color:#777;margin-top:24px;">Este é um e-mail automático do sistema de orçamentos FixIn Reformas.</p>
        </div>
      `,
    });
    return { enviado: true };
  } catch (e) {
    console.error('Erro ao enviar e-mail:', e);
    return { enviado: false, motivo: e.message };
  }
}
