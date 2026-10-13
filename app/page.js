import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';

export default async function Home() {
  const { user, profile } = await getProfile();

  if (!user || !profile) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');
  if (profile.role === 'prestador') redirect('/prestador/dashboard');
  redirect('/imobiliaria/dashboard');
}
