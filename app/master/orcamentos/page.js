import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import KanbanBoard from '@/components/KanbanBoard';
import { MASTER_TABS } from '@/lib/navTabs';
import { createAdminClient } from '@/lib/supabase/admin';
import { ACOES_FEITO, ACAO_ENVIADO } from '@/lib/orcamentosEnviados';

export const dynamic = 'force-dynamic';

export default async function OrcamentosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*, clientes(nome_empresa), orcamento_itens(servico, descricao, ambiente, mo, ma)')
    .order('criado_em', { ascending: false });

  // Quem fez e quem enviou cada orçamento (vem do histórico de ações): alimenta os filtros de data e de pessoa.
  const { data: eventos } = await createAdminClient().from('auditoria').select('alvo_id, acao, autor_nome, criado_em')
    .eq('alvo_tipo', 'orcamento').in('acao', ACOES_FEITO).order('criado_em').limit(5000);
  const porOrc = new Map();
  for (const e of eventos || []) { const l = porOrc.get(e.alvo_id) || []; l.push({ t: e.criado_em, e: e.acao === ACAO_ENVIADO, n: e.autor_nome }); porOrc.set(e.alvo_id, l); }
  const lista = (orcamentos || []).map((o) => ({ ...o, _ev: porOrc.get(o.id) || [] }));
  const { data: eq } = await createAdminClient().from('profiles').select('nome_completo').eq('role', 'master').eq('ativo', true).order('nome_completo');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="kanban"
        titulo="Orçamentos"
        subtitulo="Toque num cartão para abrir. Use as setinhas do cartão para mudar de etapa."
        direita={
          <>
        <div className="flex gap-2">
          <Link href="/master/orcamentos/novo?tipo=manutencao" className="border border-linha text-sm font-semibold px-3 py-2 rounded">
            + Manutenção
          </Link>
          <Link href="/master/orcamentos/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
            Novo
          </Link>
        </div>
          </>
        }
      />
      <KanbanBoard orcamentos={lista} basePath="/master/orcamentos" equipe={(eq || []).map((x) => x.nome_completo).filter(Boolean)} />
    </AppShell>
  );
}
