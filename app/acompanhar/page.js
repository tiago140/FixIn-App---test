import BuscarObra from '@/components/BuscarObra';

export const metadata = { title: 'Acompanhe sua obra · FixIn', robots: { index: false, follow: false } };

export default function AcompanharBusca() {
  return (
    <main className="min-h-screen bg-papel">
      <header className="bg-marinho text-white px-4 py-4"><div className="max-w-md mx-auto"><b className="text-2xl">FixIn</b> <span className="text-xs tracking-[0.25em] opacity-80">REFORMAS</span></div></header>
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Acompanhe sua obra</h1>
        <p className="text-sm text-marinho/65 mt-2">Digite o endereço e o código do orçamento para ver as fotos e o andamento do serviço.</p>
        <BuscarObra />
      </div>
    </main>
  );
}
