import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import LinhaDoTempoObra from '@/components/LinhaDoTempoObra';
import { imobiliariaTabs } from '@/lib/navTabs';
import { ETAPAS, ETAPA_LABEL, ETAPA_COR, UUID, linhaDoTempo, linkObra, mensagemWhatsApp } from '@/lib/acompanhamento';
import CopiarLink from '@/components/CopiarLink';

export const dynamic = 'force-dynamic';

export default async function AcompanhamentoDetalheImobiliaria({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect(`/master/acompanhamento/${params.id}`);
  if (!UUID.test(params.id)) notFound();
  const { data: a } = await supabase.from('acompanhamentos').select('*').eq('id', params.id).maybeSingle();
  if (!a) notFound();
  const { data: o } = await supabase.from('orcamentos_cliente').select('id, numero, endereco').eq('id', a.orcamento_id).maybeSingle();
  if (!o) notFound();
  // As notas internas da equipe não aparecem; o que o locador vê é o que a imobiliária vê.
  const itens = await linhaDoTempo(a, { equipe: false }, createAdminClient());
  const link = a.link_ativo && a.token ? linkObra(a.token) : null;
  const mensagem = link ? mensagemWhatsApp({ endereco: o.endereco, link, etapa: a.etapa, percentual: a.percentual }) : '';
  const idx = ETAPAS.findIndex((e) => e.id === a.etapa);

  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <Link href="/imobiliaria/acompanhamento" className="text-sm text-marinho/50">← voltar</Link>
      <div className="mt-3">
        <PageHeader icone="acompanhamento" titulo={`Obra · ${o.numero}`} etiqueta={profile.empresa} subtitulo={o.endereco}
          direita={<><span className={`text-xs font-semibold rounded-full px-3 py-1 ${ETAPA_COR[a.etapa]}`}>{ETAPA_LABEL[a.etapa]} · {a.percentual}%</span><Link href={`/imobiliaria/orcamentos/${o.id}`} className="text-sm underline text-marinho/60">Ver orçamento</Link></>} />
      </div>
      <div className="card rounded-xl p-4 mb-6">
        <div className="h-2.5 rounded-full bg-linha overflow-hidden"><div className="h-full bg-verde" style={{ width: `${a.percentual}%` }} /></div>
        <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {ETAPAS.map((e, i) => <li key={e.id} className={i <= idx && e.id !== 'aguardando_material' ? 'text-sucesso font-semibold' : e.id === a.etapa ? 'text-erro font-semibold' : 'text-marinho/40'}>{i <= idx && e.id !== 'aguardando_material' ? '✓ ' : ''}{e.label}</li>)}
        </ol>
      </div>
      {link && (
        <div className="card rounded-xl p-4 mb-6 text-sm">
          <div className="font-semibold">Link para o locador acompanhar</div>
          <p className="text-xs text-marinho/60 mt-1">Sem login. Mostra fotos e o que foi feito, sem valores.</p>
          <CopiarLink link={link} mensagem={mensagem} />
        </div>
      )}
      <h2 className="font-semibold mb-3">Linha do tempo</h2>
      <LinhaDoTempoObra itens={itens} fotoBase={`/api/acompanhamento/${a.id}/foto`} />
    </AppShell>
  );
}
