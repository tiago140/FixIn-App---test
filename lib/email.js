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

async function enviar({ paraEmail, assunto, html }) {
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
      subject: assunto,
      html,
    });
    return { enviado: true };
  } catch (e) {
    console.error('Erro ao enviar e-mail:', e);
    return { enviado: false, motivo: e.message };
  }
}

const TEXTO_STATUS = {
  aprovado: {
    assunto: (n) => `Orçamento ${n} aprovado`,
    titulo: 'Orçamento aprovado ✅',
    corpo: (numero, endereco) => `<p>O orçamento <strong>${numero}</strong> do imóvel <strong>${endereco}</strong> foi marcado como <strong>aprovado</strong>. A execução do serviço será organizada em seguida.</p>`,
  },
  em_execucao: {
    assunto: (n) => `Orçamento ${n} em execução`,
    titulo: 'Serviço em execução 🔧',
    corpo: (numero, endereco) => `<p>O serviço do orçamento <strong>${numero}</strong> do imóvel <strong>${endereco}</strong> está <strong>em execução</strong>.</p>`,
  },
  finalizado: {
    assunto: (n) => `Orçamento ${n} finalizado`,
    titulo: 'Serviço finalizado 🏁',
    corpo: (numero, endereco) => `<p>O serviço do orçamento <strong>${numero}</strong> do imóvel <strong>${endereco}</strong> foi <strong>finalizado</strong>. Obrigado pela confiança!</p>`,
  },
};

// Dispara nas mudanças de status: aprovado, em_execucao, finalizado.
// "enviado" continua usando enviarEmailOrcamentoPronto (que já leva o link do PDF).
export async function enviarEmailStatusOrcamento({ paraEmail, nomeImobiliaria, numero, endereco, status }) {
  const modelo = TEXTO_STATUS[status];
  if (!modelo) return { enviado: false, motivo: 'status sem modelo de e-mail' };
  return enviar({
    paraEmail,
    assunto: modelo.assunto(numero),
    html: moldura(modelo.titulo, `<p>Olá, ${nomeImobiliaria || ''}!</p>${modelo.corpo(numero, endereco)}`),
  });
}

// Lembrete de pendência financeira — disparado pelo cron diário enquanto o pagamento
// não é confirmado pelo dono (valor pago menor que o total, aprovado há mais de 7 dias).
export async function enviarEmailPendenciaFinanceira({ paraEmail, nomeImobiliaria, numero, endereco, valorPendente, diasAtraso }) {
  const valorFmt = Number(valorPendente || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return enviar({
    paraEmail,
    assunto: `Pendência financeira — orçamento ${numero}`,
    html: moldura(
      'Pendência financeira ⚠️',
      `<p>Olá, ${nomeImobiliaria || ''}!</p>
       <p>O orçamento <strong>${numero}</strong> do imóvel <strong>${endereco}</strong> está com pagamento pendente há <strong>${diasAtraso} dia(s)</strong>.</p>
       <p>Valor pendente: <strong>${valorFmt}</strong></p>
       <p>Este lembrete continuará sendo enviado diariamente até a confirmação do pagamento.</p>`
    ),
  });
}
