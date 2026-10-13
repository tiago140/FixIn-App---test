import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';

// Área exclusiva do prestador. Equipe FixIn e imobiliária voltam para o painel delas.
export default async function PrestadorLayout({ children }) {
  const { user, profile } = await getProfile();
  if (!user || !profile) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');
  if (profile.role !== 'prestador') redirect('/imobiliaria/dashboard');
  return children;
}
