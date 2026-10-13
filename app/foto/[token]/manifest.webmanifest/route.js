import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Manifesto do app da rua: cada link instala um atalho que abre direto naquela ordem.
export async function GET(_req, { params }) {
  const t = String(params.token || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  return NextResponse.json({
    name: 'FixIn · Fotos do serviço',
    short_name: 'FixIn Fotos',
    start_url: `/foto/${t}`,
    scope: `/foto/${t}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#182F50',
    theme_color: '#182F50',
    icons: [
      { src: '/icons/foto-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/foto-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' } });
}
