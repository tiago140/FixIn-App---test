import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import FormAbrirChamado from '@/components/chamados/FormAbrirChamado';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Abrir chamado', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function PaginaAbrirChamado({ params }) {
  const slug = String(params.slug || '').toLowerCase().slice(0, 80);
  const { data: cli } = await createAdminClient().from('clientes').select('nome_empresa, chamados_ativo').eq('slug_chamados', slug).maybeSingle();
  if (!cli || cli.chamados_ativo === false) notFound();
  return (
    <main className="min-h-screen bg-fundo py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-marinho text-white rounded-t-lg px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-white/60">Chamados · atendimento FixIn</div>
          <h1 className="font-slab text-2xl font-bold">{cli.nome_empresa}</h1>
          <p className="text-sm text-white/80">Abra um chamado para o seu imóvel e acompanhe tudo por aqui.</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-marinho via-[#2C5570] to-verde mb-4" />
        <FormAbrirChamado slug={slug} imobiliaria={cli.nome_empresa} />
      </div>
    </main>
  );
}
