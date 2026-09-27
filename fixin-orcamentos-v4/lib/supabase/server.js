import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente que roda no servidor USANDO A SESSÃO DO USUÁRIO LOGADO.
// Todas as regras de segurança (RLS) do banco continuam valendo aqui —
// isso é o que garante que uma imobiliária nunca veja dado de outra.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (e) {
            // chamado de um Server Component sem permissão de escrita — ok ignorar
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (e) {}
        },
      },
    }
  );
}
