import { createSign } from 'crypto';

// Push nativo do app Android (Firebase Cloud Messaging v1). Variável na Vercel: FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço).
let cache = { token: null, exp: 0 };

function conta() {
  try { const j = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); return j.private_key && j.client_email && j.project_id ? j : null; } catch (e) { return null; }
}
export const fcmConfigurado = () => !!conta();

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

async function tokenAcesso(c) {
  if (cache.token && Date.now() < cache.exp - 60000) return cache.token;
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: c.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600 })}`;
  const assinatura = createSign('RSA-SHA256').update(corpo).sign(c.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${corpo}.${assinatura}` }) });
  const j = await r.json();
  if (!j.access_token) throw new Error('fcm auth');
  cache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cache.token;
}

// Envia para uma lista de tokens. Devolve { enviados, invalidos } (tokens que o Firebase não aceita mais).
export async function enviarFcm(tokens, { titulo, corpo, url }) {
  const c = conta();
  if (!c || !tokens.length) return { enviados: 0, invalidos: [] };
  let enviados = 0; const invalidos = [];
  try {
    const at = await tokenAcesso(c);
    for (const token of tokens) {
      try {
        const r = await fetch(`https://fcm.googleapis.com/v1/projects/${c.project_id}/messages:send`, {
          method: 'POST', headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: { token, notification: { title: titulo, body: corpo }, data: { url: url || '/prestador/dashboard' }, android: { priority: 'HIGH', notification: { sound: 'default' } } } }),
        });
        if (r.ok) enviados++;
        else { const j = await r.json().catch(() => ({})); const st = j?.error?.status; if (st === 'NOT_FOUND' || st === 'UNREGISTERED' || st === 'INVALID_ARGUMENT') invalidos.push(token); }
      } catch (e) {}
    }
  } catch (e) {}
  return { enviados, invalidos };
}
