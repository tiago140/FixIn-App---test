import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { conferirPagamento } from '@/lib/infinitepay';
import { darBaixaCobranca } from '@/lib/baixaCobranca';

export const dynamic = 'force-dynamic';

// Aviso de pagamento aprovado da InfinitePay. Não tem assinatura: nada é aceito sem conferir na InfinitePay (payment_check).
export async function POST(req) {
  const ev = await req.json().catch(() => ({}));
  const orderNsu = String(ev?.order_nsu || '');
  if (!orderNsu) return NextResponse.json({ ok: true });
  const admin = createAdminClient();
  const { data: cob } = await admin.from('cobrancas').select('*').eq('externo_id', orderNsu).eq('provedor', 'infinitepay').maybeSingle();
  if (!cob) return NextResponse.json({ ok: true }); // não é nossa

  let real;
  try { real = await conferirPagamento({ orderNsu, transactionNsu: ev.transaction_nsu, slug: ev.invoice_slug }); }
  catch (e) { return NextResponse.json({ error: 'tente de novo' }, { status: 400 }); } // fora de 2xx: a InfinitePay reenvia
  if (!real?.success || !real?.paid) return NextResponse.json({ ok: true });
  // o "amount" é o valor original (sem taxa repassada); o paid_amount pode ser maior, então só o amount precisa bater
  if (Math.round(Number(real.amount)) !== Math.round(Number(cob.valor) * 100)) return NextResponse.json({ ok: true, divergente: true });
  const pix = String(real.capture_method || '').toLowerCase().includes('pix');
  await darBaixaCobranca(admin, cob, { novoStatus: pix ? 'no_caixa' : 'aprovado', origem: 'InfinitePay' });
  return NextResponse.json({ ok: true });
}
