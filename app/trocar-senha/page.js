import { redirect } from 'next/navigation';
import TrocarSenhaForm from '@/components/TrocarSenhaForm';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function TrocarSenhaPage() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect('/login');
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-slab text-2xl font-bold text-marinho">FixIn</div>
          <p className="text-sm text-marinho/70 mt-2">Primeiro acesso: a senha que você recebeu é provisória. Escolha uma senha só sua.</p>
        </div>
        <TrocarSenhaForm obrigatoria />
      </div>
    </div>
  );
}
