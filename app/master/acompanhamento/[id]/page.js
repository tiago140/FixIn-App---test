import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import AcompanhamentoEquipe from '@/components/AcompanhamentoEquipe';
import LinhaDoTempoObra from '@/components/LinhaDoTempoObra';
import AcoesEventoObra from '@/components/AcoesEventoObra';
import { MASTER_TABS } from '@/lib/navTabs';
import { carregarObras } from '@/lib/obras';
import { ETAPA_LABEL, ETAPA_COR, UUID, linhaDoTempo, linkObra, mensagemWhatsApp } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';

export default async function AcompanhamentoDetalheMaster({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  if (!UUID.test(params.id)) notFound();
  const { data: a } = await supabase.from('acompanhamentos').select('*').eq('id', params.id).maybeSingle();
  if (!a) notFound();
  const { data: o } = await supabase.from('orcamentos').select('id, numero, endereco, clientes(nome_empresa)').eq('id', a.orcamento_id).maybeSingle();
  if (!o) notFound();
  const admin = createAdminClient();
  const itens = await linhaDoTempo(a, { equipe: true }, admin);
  const obras = await carregarObras(a.orcamento_id);
  const interessados = obras.flatMap((x) => x.interessados);
  const link = a.link_ativo && a.token ? linkObra(a.token) : null;
  const mensagem = link ? mensagemWhatsApp({ endereco: o.endereco, link, etapa: a.etapa, percentual: a.percentual }) : '';
  const Acoes = (p) => <AcoesEventoObra {...p} acompId={a.id} />;

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <Link href="/master/acompanhamento" className="text-sm text-marinho/50">← voltar</Link>
      <div className="mt-3">
        <PageHeader
          icone="acompanhamento" titulo={`Obra · ${o.numero}`} etiqueta={o.clientes?.nome_empresa} subtitulo={o.endereco}
          direita={<><span className={`text-xs font-semibold rounded-full px-3 py-1 ${ETAPA_COR[a.etapa]}`}>{ETAPA_LABEL[a.etapa]} · {a.percentual}%</span><Link href={`/master/orcamentos/${o.id}`} className="text-sm underline text-marinho/60">Ver orçamento</Link></>}
        />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
        <AcompanhamentoEquipe acomp={{ id: a.id, etapa: a.etapa, percentual: a.percentual }} link={link} mensagem={mensagem} interessados={interessados} />
        <div>
          <div className="mb-4 h-2.5 rounded-full bg-linha overflow-hidden"><div className="h-full bg-verde" style={{ width: `${a.percentual}%` }} /></div>
          <h2 className="font-semibold mb-3">Linha do tempo</h2>
          <LinhaDoTempoObra itens={itens} fotoBase={`/api/acompanhamento/${a.id}/foto`} Acoes={Acoes} equipe />
        </div>
      </div>
    </AppShell>
  );
}
