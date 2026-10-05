import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { montarEGravarPdf } from '@/lib/laudos';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Gera (ou regera) o PDF do laudo a partir do que está salvo. SÓ a equipe FixIn.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const { data: laudo } = await supabase.from('laudos').select('id').eq('id', params.id).maybeSingle();
  if (!laudo) return NextResponse.json({ error: 'laudo não encontrado' }, { status: 404 });
  try {
    await montarEGravarPdf(createAdminClient(), laudo.id);
  } catch (e) {
    return NextResponse.json({ error: 'Não consegui gerar o PDF: ' + e.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
