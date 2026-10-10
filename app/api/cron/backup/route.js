import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { gerarBackup, nomeBackup, enviarParaDrive } from '@/lib/backup';
import { enviarEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Backup diário (Vercel Cron). Sem CRON_SECRET configurado, recusa — ninguém de fora pode disparar.
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }
  const admin = createAdminClient();
  const nome = nomeBackup();
  const { zip, info } = await gerarBackup(admin);

  const drive = await enviarParaDrive(nome, zip);

  // Cópia por e-mail para o dono (se o envio de e-mail estiver configurado e o arquivo couber)
  let email = { enviado: false, motivo: 'não tentado' };
  if (!drive.ok || process.env.BACKUP_EMAIL_SEMPRE === '1') {
    const { data: dono } = await admin.from('profiles').select('email').eq('dono', true).maybeSingle();
    const para = process.env.BACKUP_EMAIL || dono?.email;
    if (zip.length > 15 * 1024 * 1024) email = { enviado: false, motivo: 'arquivo grande demais para e-mail' };
    else email = await enviarEmail({ para, assunto: `Backup FixIn — ${nome}`, html: '<p>Segue o backup completo do sistema FixIn. Guarde em local privado. As instruções de restauração estão dentro do pacote (LEIA-ME.md).</p>', anexos: [{ nome, conteudo: Buffer.from(zip), tipo: 'application/zip' }] });
  }

  const resumo = `${Object.values(info.tabelas).reduce((a, b) => a + b, 0)} linhas, ${info.arquivos} arquivos, ${(zip.length / 1048576).toFixed(1)} MB · Drive: ${drive.ok ? 'ok' : drive.motivo} · E-mail: ${email.enviado ? 'ok' : email.motivo || '-'}${info.avisos.length ? ` · avisos: ${info.avisos.length}` : ''}`;
  try { await admin.from('auditoria').insert({ acao: 'Backup automático', detalhe: resumo, alvo_tipo: 'sistema', autor_nome: 'Sistema', autor_role: 'master' }); } catch (e) {}
  return NextResponse.json({ ok: drive.ok || email.enviado, resumo, avisos: info.avisos });
}
