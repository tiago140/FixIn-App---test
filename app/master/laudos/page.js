import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function LaudosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: laudos, error } = await supabase
    .from('laudos')
    .select('id, numero, endereco, data_inspecao, publicado, fotos, clientes(nome_empresa)')
    .order('criado_em', { ascending: false });

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="laudos"
        titulo="Laudos de inspeção"
        subtitulo="Fotos, descrição técnica e PDF no padrão FixIn — só você cria e edita; a imobiliária lê o que você publicar"
        direita={<Link href="/master/laudos/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">+ Novo laudo</Link>}
      />
      {error && <div className="mb-5 bg-erro/10 border border-erro text-erro rounded-lg px-4 py-3 text-sm"><b>Não consegui carregar os laudos.</b> {error.message}</div>}
      {(laudos || []).length === 0 && !error ? (
        <div className="border-2 border-dashed border-linha rounded-lg p-10 text-center text-marinho/50 bg-white">Nenhum laudo ainda. Clique em “+ Novo laudo”.</div>
      ) : (
        <div className="grid gap-3">
          {(laudos || []).map((l) => (
            <Link key={l.id} href={`/master/laudos/${l.id}`} className="card p-4 flex items-center gap-4 hover:bg-papel flex-wrap">
              <span className="font-mono text-xs text-marinho/50">{l.numero}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-marinho">{l.endereco}</div>
                <div className="text-xs text-marinho/60">{l.clientes?.nome_empresa} · inspeção em {fmtDate(l.data_inspecao)} · {(l.fotos || []).length} foto(s)</div>
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wide rounded px-2 py-1 text-white ${l.publicado ? 'bg-sucesso' : 'bg-[#6B7280]'}`}>{l.publicado ? 'Publicado' : 'Rascunho'}</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
