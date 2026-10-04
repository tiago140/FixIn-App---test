import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import EquipeImobiliariaLista from '@/components/EquipeImobiliariaLista';
import { imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function EquipePage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/dashboard');
  if (profile.subrole === 'operacional') redirect('/imobiliaria/dashboard');

  // Quem está cadastrado na MINHA imobiliária (o banco já limita pelas regras de acesso).
  const { data: pessoas, error: erroEquipe } = await supabase
    .from('profiles')
    .select('id, nome_completo, email, cpf, subrole, ativo, criado_em')
    .eq('cliente_id', profile.cliente_id)
    .order('criado_em');

  // Dados que só o servidor sabe: último acesso e se a pessoa tem histórico (decide se pode ser excluída).
  // Só chega aqui depois de confirmar que quem pede é administrador desta imobiliária.
  const lista = pessoas || [];
  let comHistorico = new Set();
  const ultimoAcesso = {};
  try {
    const admin = createAdminClient();
    const ids = lista.map((p) => p.id);
    const { data: hist } = await admin.rpc('pessoas_com_historico', { p_ids: ids });
    comHistorico = new Set((hist || []).map((h) => (typeof h === 'string' ? h : Object.values(h)[0])));
    await Promise.all(ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      ultimoAcesso[id] = data?.user?.last_sign_in_at || null;
    }));
  } catch (e) {}

  const equipe = lista
    .map((p) => ({ ...p, ultimo_acesso: ultimoAcesso[p.id] || null, tem_historico: comHistorico.has(p.id) }))
    .sort((a, b) => (a.ativo === false) - (b.ativo === false) || (a.subrole === 'operacional') - (b.subrole === 'operacional') || String(a.nome_completo).localeCompare(String(b.nome_completo)));

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader
        icone="equipe"
        titulo="Equipe"
        etiqueta={profile.empresa}
        subtitulo="Quem tem acesso ao painel da sua imobiliária"
        direita={
          <Link href="/imobiliaria/equipe/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
            + Novo usuário
          </Link>
        }
      />

      {erroEquipe && (
        <div className="mb-5 bg-erro/10 border border-erro text-erro rounded-lg px-4 py-3 text-sm">
          <b>Não consegui carregar a equipe.</b> {erroEquipe.message}
        </div>
      )}

      {equipe.length === 0 && !erroEquipe ? (
        <div className="border-2 border-dashed border-linha rounded-lg p-10 text-center text-marinho/50 bg-white">Nenhum usuário cadastrado ainda.</div>
      ) : (
        <EquipeImobiliariaLista equipe={equipe} meuId={user.id} />
      )}
    </AppShell>
  );
}
