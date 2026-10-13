import FotoApp from '@/components/FotoApp';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }) {
  return {
    title: 'Fotos do serviço · FixIn',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    manifest: `/foto/${params.token}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: 'FixIn Fotos', statusBarStyle: 'black-translucent' },
    icons: { apple: '/icons/foto-192.png' },
  };
}
export const viewport = { themeColor: '#182F50', width: 'device-width', initialScale: 1 };

export default function FotoPagina({ params }) {
  return <FotoApp token={params.token} />;
}
