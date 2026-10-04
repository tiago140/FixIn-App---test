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

  // Nome da imobiliária (para a barra de cima). Consulta separada: se falhar, a tela segue sem o nome.
  if (profile?.cliente_id) {
    try {
      const { data: cli } = await supabase.from('clientes').select('nome_empresa').eq('id', profile.cliente_id).maybeSingle();
      profile.empresa = cli?.nome_empresa || null;
    } catch (e) {
      profile.empresa = null;
    }
  }

  return { user, profile, supabase };
}
