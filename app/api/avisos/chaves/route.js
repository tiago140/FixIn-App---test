import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { buscarAvisos } from '@/lib/avisos';

export const dynamic = 'force-dynamic';

// Devolve só as "chaves" dos avisos atuais — o menu compara com os já dispensados (guardados no navegador)
// para mostrar a bolinha vermelha com a quantidade.
export async function GET() {
  const { user, profile, supabase } = await getProfile();
  if (!user || !profile) return NextResponse.json({ chaves: [] }, { status: 401 });
  const a = await buscarAvisos(supabase, profile);
  const chaves = [...a.visitas, ...a.atrasos, ...a.mensagens].map((x) => x.key);
  return NextResponse.json({ chaves });
}
