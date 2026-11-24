import CadastroPrestadorForm from '@/components/prestadores/CadastroPrestadorForm';

export const metadata = { title: 'Cadastro de prestador · FixIn Reformas', robots: { index: false } };

export default function Page() {
  return (
    <main className="min-h-screen bg-papel py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <img src="/logo-fixin.png" alt="FixIn Reformas" className="h-14 mb-5" />
        <h1 className="text-2xl font-bold text-marinho">Cadastro de prestador de serviço</h1>
        <p className="text-sm text-marinho/70 mt-1 mb-6">Preencha seus dados e escolha as áreas em que você atua. A equipe da FixIn confere e entra em contato.</p>
        <CadastroPrestadorForm />
      </div>
    </main>
  );
}
