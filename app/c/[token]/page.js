import AcompanharChamado from '@/components/chamados/AcompanharChamado';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu chamado', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function PaginaChamado({ params }) {
  return (
    <main className="min-h-screen bg-fundo py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-xs uppercase tracking-wide text-marinho/50 mb-2">FixIn · Acompanhamento de chamado</div>
        <AcompanharChamado token={params.token} />
      </div>
    </main>
  );
}
