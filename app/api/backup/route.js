import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { gerarBackup, nomeBackup, enviarParaDrive, criptografarBackup } from '@/lib/backup';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Download do backup completo. Só o DONO.
export async function GET() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const admin = createAdminClient();
  const { zip, info } = await gerarBackup(admin);
  try { await admin.from('auditoria').insert({ acao: 'Baixou backup completo', detalhe: `${Object.values(info.tabelas).reduce((a, b) => a + b, 0)} linhas, ${info.arquivos} arquivos`, alvo_tipo: 'sistema', autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return new NextResponse(Buffer.from(zip), { status: 200, headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${nomeBackup()}"`, 'Cache-Control': 'no-store' } });
}

// Envia um backup ao Google Drive agora (teste e uso manual). Só o DONO.
export async function POST() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const admin = createAdminClient();
  const gerado = await gerarBackup(admin);
  const cifrado = !!process.env.BACKUP_SENHA;
  const zip = cifrado ? criptografarBackup(gerado.zip, process.env.BACKUP_SENHA) : gerado.zip;
  const nome = nomeBackup() + (cifrado ? '.enc' : '');
  const drive = await enviarParaDrive(nome, zip);
  try { await admin.from('auditoria').insert({ acao: 'Enviou backup ao Drive', detalhe: `${nome} · ${drive.ok ? 'ok' : drive.motivo}`, alvo_tipo: 'sistema', autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return NextResponse.json(drive.ok ? { ok: true, nome, mb: +(zip.length / 1048576).toFixed(1) } : { ok: false, error: drive.motivo }, { status: drive.ok ? 200 : 502 });
}
