import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

// Notificação no celular (Web Push). Precisa de 3 variáveis na Vercel:
// NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e (opcional) VAPID_SUBJECT. Sem elas, nada é enviado e nada quebra.
export function pushConfigurado() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// Envia para todos os aparelhos do prestador. Remove os que já não existem. Nunca lança erro.
export async function enviarPushPrestador(prestadorId, { titulo, corpo, url }) {
  if (!pushConfigurado()) return { enviados: 0 };
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@fixinreformas.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const admin = createAdminClient();
    const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('prestador_id', prestadorId);
    const payload = JSON.stringify({ titulo, corpo, url });
    let enviados = 0;
    for (const s of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
        enviados++;
      } catch (e) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
      }
    }
    return { enviados };
  } catch (e) { return { enviados: 0 }; }
}
