import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import TermoPrestador from '@/components/TermoPrestador';
import { TERMO_CLAUSULAS, TERMO_TITULO, TERMO_VERSAO, prestadorAceitouTermo } from '@/lib/termoPrestador';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Termo do prestador · FixIn', robots: { index: false, follow: false } };

// Fica fora de /prestador de propósito: o layout de lá manda para cá quem ainda não assinou.
export default async function TermoPagina() {
  const { user, profile } = await getProfile();
  if (!user || !profile) redirect('/login');
  if (profile.role !== 'prestador') redirect('/');
  if (await prestadorAceitouTermo(createAdminClient(), profile.prestador_id)) redirect('/prestador/dashboard');
  return (
    <main className="min-h-screen bg-papel">
      <header className="bg-marinho text-white px-4 py-4"><div className="max-w-3xl mx-auto"><b className="text-2xl">FixIn</b> <span className="text-xs tracking-[0.25em] opacity-80">REFORMAS</span></div></header>
      <div className="px-4 py-6">
        <TermoPrestador titulo={TERMO_TITULO} clausulas={TERMO_CLAUSULAS} versao={TERMO_VERSAO} nomeEsperado={profile.nome_completo} />
      </div>
    </main>
  );
}
