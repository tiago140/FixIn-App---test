import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';

// Prestador não entra na área da imobiliária.
export default async function ImobiliariaLayout({ children }) {
  const { profile } = await getProfile();
  if (profile?.role === 'prestador') redirect('/prestador/dashboard');
  return children;
}
