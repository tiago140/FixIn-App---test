import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { pdfDaOrdem } from '@/lib/ordensPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PDF da ordem de serviço (sem margem). Abre para a equipe FixIn e para o prestador dono da ordem.
export async function GET(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  if (profile.role !== 'master') {
    if (profile.role !== 'prestador') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
    const { data: minha } = await supabase.from('ordens_servico').select('id').eq('id', params.id).maybeSingle();
    if (!minha) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const r = await pdfDaOrdem(params.id);
  if (!r) return NextResponse.json({ error: 'ordem não encontrada' }, { status: 404 });
  return new NextResponse(r.buffer, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${r.nome}"`, 'Cache-Control': 'private, no-store' } });
}
