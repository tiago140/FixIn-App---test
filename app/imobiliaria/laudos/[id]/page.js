import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { FileDown } from 'lucide-react';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import TextoLaudo from '@/components/TextoLaudo';
import { imobiliariaTabs } from '@/lib/navTabs';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Só leitura. Se o laudo não for publicado e desta imobiliária, o banco não devolve nada → 404.
export default async function LaudoImobiliariaPage({ params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect(`/master/laudos/${params.id}`);
  const { data: laudo } = await supabase.from('laudos').select('id, numero, endereco, titulo, data_inspecao, texto_tecnico, descricao_original, fotos, pdf_path').eq('id', params.id).maybeSingle();
  if (!laudo) notFound();
  const fotos = laudo.fotos || [];
  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <Link href="/imobiliaria/laudos" className="text-sm text-marinho/60 hover:underline">← voltar</Link>
      <PageHeader
        icone="laudos" titulo={laudo.numero} etiqueta={profile.empresa} subtitulo={`${laudo.endereco} · inspeção em ${fmtDate(laudo.data_inspecao)}`}
        direita={laudo.pdf_path ? <a href={`/api/laudos/${laudo.id}/arquivo?tipo=pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-marinho text-white text-sm font-semibold px-4 py-2.5 rounded-lg"><FileDown size={16} /> Abrir o PDF</a> : null}
      />
      <div className="card p-5 mb-6"><TextoLaudo texto={laudo.texto_tecnico || laudo.descricao_original} /></div>
      {fotos.length > 0 && (
        <div className="card p-5">
          <h3 className="font-slab text-xl font-bold text-marinho mb-3">Registro fotográfico</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fotos.map((f, i) => (
              <figure key={f.id} className="border border-linha rounded-lg overflow-hidden bg-white">
                <a href={`/api/laudos/${laudo.id}/arquivo?foto=${f.id}`} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-papel flex items-center justify-center">
                  <img src={`/api/laudos/${laudo.id}/arquivo?foto=${f.id}`} alt={f.legenda || `Foto ${i + 1}`} loading="lazy" className="max-w-full max-h-full object-contain" />
                </a>
                <figcaption className="p-2 text-xs text-marinho/70"><b className="text-marinho">Foto {i + 1}</b>{f.legenda ? ` — ${f.legenda}` : ''}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
