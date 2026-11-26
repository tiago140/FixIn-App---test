import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import PopupNovidades from '@/components/PopupNovidades';

// Prestador não entra na área da imobiliária. A imobiliária recebe pop-up de obra iniciada e finalizada.
export default async function ImobiliariaLayout({ children }) {
  const { profile } = await getProfile();
  if (profile?.role === 'prestador') redirect('/prestador/dashboard');
  return (
    <>
      {children}
      {profile && profile.role !== 'master' && profile.cliente_id ? <PopupNovidades endpoint="/api/imobiliaria/novidades" chave="fixin_vistos_imob" /> : null}
    </>
  );
}
