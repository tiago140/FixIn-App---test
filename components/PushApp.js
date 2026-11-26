'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Dentro do app Android: pede permissão, registra o aparelho no Firebase e abre a tela certa ao tocar na notificação.
export default function PushApp() {
  const router = useRouter();
  useEffect(() => {
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const P = cap.Plugins?.PushNotifications;
    if (!P) return;
    let ativo = true;
    (async () => {
      try {
        P.addListener('registration', (t) => { if (ativo && t?.value) fetch('/api/prestador/push/fcm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t.value }) }).catch(() => {}); });
        P.addListener('pushNotificationActionPerformed', (a) => { const u = a?.notification?.data?.url; if (u && String(u).startsWith('/')) router.push(u); });
        let perm = await P.checkPermissions();
        if (perm.receive === 'prompt') perm = await P.requestPermissions();
        if (perm.receive === 'granted') await P.register();
      } catch (e) {}
    })();
    return () => { ativo = false; };
  }, [router]);
  return null;
}
