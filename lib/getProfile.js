import { createClient } from './supabase/server';

// Retorna { user, profile } ou { user: null, profile: null } se não estiver logado.
export async function getProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // usuário desativado é tratado como "não logado" em todo o sistema
  if (profile && profile.ativo === false) return { user: null, profile: null, supabase };

  return { user, profile, supabase };
}
