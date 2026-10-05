import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { imobiliariaTabs } from '@/lib/navTabs';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Só leitura: o banco só devolve os laudos PUBLICADOS desta imobiliária.
export default async function LaudosImobiliariaPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role === 'master') redirect('/master/laudos');
  const { data: laudos } = await supabase.from('laudos').select('id, numero, endereco, data_inspecao, fotos, publicado_em').order('data_inspecao', { ascending: false });
  return (
    <AppShell profile={profile} tabs={imobiliariaTabs(profile)} homeHref="/imobiliaria/dashboard">
      <PageHeader icone="laudos" titulo="Laudos de inspeção" etiqueta={profile.empresa} subtitulo="Laudos técnicos dos seus imóveis, com fotos e PDF" />
      {(laudos || []).length === 0 ? (
        <div className="border-2 border-dashed border-linha rounded-lg p-10 text-center text-marinho/50 bg-white">Nenhum laudo disponível por enquanto.</div>
      ) : (
        <div className="grid gap-3">
          {laudos.map((l) => (
            <Link key={l.id} href={`/imobiliaria/laudos/${l.id}`} className="card p-4 flex items-center gap-4 hover:bg-papel flex-wrap">
              <span className="font-mono text-xs text-marinho/50">{l.numero}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-marinho">{l.endereco}</div>
                <div className="text-xs text-marinho/60">Inspeção em {fmtDate(l.data_inspecao)} · {(l.fotos || []).length} foto(s)</div>
              </div>
              <span className="text-sm font-semibold text-marinho">Abrir →</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
