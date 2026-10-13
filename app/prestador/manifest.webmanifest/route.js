import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

// Faz o portal do prestador poder ser instalado no celular como aplicativo (necessário para notificações no iPhone).
export async function GET() {
  return NextResponse.json({
    name: 'FixIn · Portal do Prestador',
    short_name: 'FixIn Prestador',
    start_url: '/prestador/dashboard',
    scope: '/prestador',
    display: 'standalone',
    background_color: '#182F50',
    theme_color: '#182F50',
    icons: [
      { src: '/icons/foto-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/foto-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }, { headers: { 'Content-Type': 'application/manifest+json' } });
}
