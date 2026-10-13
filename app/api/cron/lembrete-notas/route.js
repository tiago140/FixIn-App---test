import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { avisarPrestadorOS } from '@/lib/ordens';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Todo dia: lembra o prestador de anexar a nota fiscal (3 dias depois de concluir; repete a cada 4 dias).
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  const admin = createAdminClient();
  const corte = new Date(Date.now() - 3 * 86400000).toISOString();
  const { data: ordens } = await admin.from('ordens_servico').select('*').in('status', ['conclusao_pendente', 'aprovada', 'paga']).lt('concluido_em', corte).limit(200);
  const { data: notas } = await admin.from('os_notas').select('os_id').in('os_id', (ordens || []).map((o) => o.id));
  const comNota = new Set((notas || []).map((n) => n.os_id));
  const repete = Date.now() - 4 * 86400000;
  let enviados = 0;
  for (const os of ordens || []) {
    if (comNota.has(os.id)) continue;
    if (os.nota_lembrete_em && new Date(os.nota_lembrete_em).getTime() > repete) continue;
    await avisarPrestadorOS(os, 'nota');
    await admin.from('ordens_servico').update({ nota_lembrete_em: new Date().toISOString() }).eq('id', os.id);
    enviados++;
  }
  return NextResponse.json({ ok: true, enviados });
}
