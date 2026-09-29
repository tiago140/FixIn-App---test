import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ATENÇÃO: usa a Service Role Key, que ignora todas as regras de segurança (RLS).
// NUNCA importar este arquivo em código que roda no navegador.
// Só usar dentro de app/api/**/route.js (código de servidor).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
