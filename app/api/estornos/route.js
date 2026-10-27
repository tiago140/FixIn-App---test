import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { PIX_TIPOS, VALOR_MAXIMO_ESTORNO } from '@/lib/estornos';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A imobiliária (administrador) pede um estorno. A regra de quem pode e de qual orçamento vale fica no banco (função solicitar_estorno).
export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'imobiliaria') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (profile.subrole === 'operacional') return NextResponse.json({ error: 'Só o administrador da imobiliária pede estorno.' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const valor = Math.round(Number(String(b.valor ?? '').replace(/\./g, '').replace(',', '.')) * 100) / 100;
  const motivo = String(b.motivo || '').trim();
  const favorecido = String(b.favorecido || '').trim();
  const chave = String(b.pix_chave || '').trim();
  if (!(valor > 0) || valor > VALOR_MAXIMO_ESTORNO) return NextResponse.json({ error: 'Informe um valor válido.' }, { status: 400 });
  if (motivo.length < 5) return NextResponse.json({ error: 'Explique o motivo do estorno.' }, { status: 400 });
  if (favorecido.length < 2) return NextResponse.json({ error: 'Informe quem vai receber o estorno.' }, { status: 400 });
  if (!PIX_TIPOS[b.pix_tipo]) return NextResponse.json({ error: 'Escolha o tipo da chave Pix.' }, { status: 400 });
  if (chave.length < 3) return NextResponse.json({ error: 'Informe a chave Pix.' }, { status: 400 });
  const orcamento_id = b.orcamento_id && UUID.test(b.orcamento_id) ? b.orcamento_id : null;
  const { data, error } = await supabase.rpc('solicitar_estorno', {
    p_orcamento_id: orcamento_id, p_valor: valor, p_motivo: motivo.slice(0, 1500), p_favorecido: favorecido.slice(0, 120),
    p_documento: String(b.documento || '').trim().slice(0, 30) || null, p_pix_tipo: b.pix_tipo, p_pix_chave: chave.slice(0, 120),
  });
  if (error) return NextResponse.json({ error: error.message || 'Não foi possível enviar o pedido.' }, { status: 400 });
  return NextResponse.json({ ok: true, id: data });
}
