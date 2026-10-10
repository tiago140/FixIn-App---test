import FormRecuperar from '@/components/chamados/FormRecuperar';

export const metadata = { title: 'Recuperar link do chamado', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function Page() {
  return (
    <main className="min-h-screen bg-fundo py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="font-slab text-2xl font-bold text-marinho mb-1">Perdi o link do meu chamado</h1>
        <p className="text-sm text-marinho/70 mb-4">Informe o e-mail ou telefone que você usou. Enviaremos o link para o e-mail cadastrado no chamado.</p>
        <FormRecuperar />
      </div>
    </main>
  );
}
