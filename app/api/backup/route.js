import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { gerarBackup, nomeBackup } from '@/lib/backup';

export const runtime = 'nodejs';
export const maxDuration = 60;
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
