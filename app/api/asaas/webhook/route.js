import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { asaas, asaasConfigurado } from '@/lib/asaas';

export const dynamic = 'force-dynamic';
const URL_AVISO = 'https://app.fixinreformas.com/api/webhooks/asaas';

// Liga (ou confere) o aviso de pagamento do Asaas apontando para o sistema. Só o dono.
export async function POST() {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (!asaasConfigurado() || !process.env.ASAAS_WEBHOOK_TOKEN) return NextResponse.json({ error: 'Chave do Asaas ou token do aviso não configurados.' }, { status: 400 });
  try {
    const lista = await asaas('/webhooks');
    const existente = (lista?.data || []).find((w) => w.url === URL_AVISO);
    const corpo = {
      name: 'FixIn - pagamentos', url: URL_AVISO, enabled: true, interrupted: false, apiVersion: 3,
      authToken: process.env.ASAAS_WEBHOOK_TOKEN, sendType: 'SEQUENTIALLY',
      events: ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED'],
    };
    if (existente) await asaas(`/webhooks/${existente.id}`, { method: 'PUT', body: corpo });
    else await asaas('/webhooks', { method: 'POST', body: corpo });
    return NextResponse.json({ ok: true, atualizado: !!existente });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Não foi possível ligar o aviso.' }, { status: 400 });
  }
}
