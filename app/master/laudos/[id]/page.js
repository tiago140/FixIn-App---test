import { redirect, notFound } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import LaudoEditor from '@/components/LaudoEditor';
import { MASTER_TABS } from '@/lib/navTabs';
import { destinatariosDoCliente } from '@/lib/destinatarios';

export const dynamic = 'force-dynamic';

export default async function EditarLaudoPage({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: laudo } = await supabase.from('laudos').select('*, clientes(nome_empresa)').eq('id', params.id).maybeSingle();
  if (!laudo) notFound();
  const { data: orcamentos } = await supabase.from('orcamentos').select('id, numero, endereco').eq('cliente_id', laudo.cliente_id).order('numero', { ascending: false });
  const destino = await destinatariosDoCliente(supabase, laudo.cliente_id, { orcamentoId: laudo.orcamento_id });

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="laudos" titulo={laudo.numero} etiqueta={laudo.clientes?.nome_empresa} subtitulo={laudo.endereco} />
      <LaudoEditor
        laudo={{ id: laudo.id, numero: laudo.numero, endereco: laudo.endereco, titulo: laudo.titulo, data_inspecao: laudo.data_inspecao, orcamento_id: laudo.orcamento_id, descricao_original: laudo.descricao_original, texto_tecnico: laudo.texto_tecnico, fotos: (laudo.fotos || []).map((f) => ({ id: f.id, legenda: f.legenda || '' })), publicado: laudo.publicado, pdf_gerado_em: laudo.pdf_gerado_em }}
        clienteNome={laudo.clientes?.nome_empresa || ''}
        orcamentos={orcamentos || []}
        emailsDestino={destino.emails}
      />
    </AppShell>
  );
}
