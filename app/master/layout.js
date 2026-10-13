import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';

// Prestador e imobiliária não entram na área da equipe: voltam para a área deles.
export default async function MasterLayout({ children }) {
  const { profile } = await getProfile();
  if (profile?.role === 'prestador') redirect('/prestador/dashboard');
  if (profile && profile.role !== 'master') redirect('/imobiliaria/dashboard');
  return children;
}
