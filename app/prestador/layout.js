import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { prestadorAceitouTermo } from '@/lib/termoPrestador';
import AtivarNotificacoes from '@/components/AtivarNotificacoes';

export const metadata = {
  manifest: '/prestador/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'FixIn Prestador', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/foto-192.png' },
};
export const viewport = { themeColor: '#182F50' };

// Área exclusiva do prestador. Equipe FixIn e imobiliária voltam para o painel delas.
// Quem ainda não assinou o termo de garantia vai primeiro para a tela do termo.
export default async function PrestadorLayout({ children }) {
  const { user, profile } = await getProfile();
  if (!user || !profile) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');
  if (profile.role !== 'prestador') redirect('/imobiliaria/dashboard');
  if (!(await prestadorAceitouTermo(createAdminClient(), profile.prestador_id))) redirect('/termo-prestador');
  return (
    <>
      {children}
      <AtivarNotificacoes chavePublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''} />
    </>
  );
}
