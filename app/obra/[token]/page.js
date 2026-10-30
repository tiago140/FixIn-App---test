import { createAdminClient } from '@/lib/supabase/admin';
import LinhaDoTempoObra from '@/components/LinhaDoTempoObra';
import { ETAPAS, ETAPA_LABEL, ETAPA_COR, linhaDoTempo } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acompanhamento da obra · FixIn', robots: { index: false, follow: false }, referrer: 'no-referrer' };

// Link externo do locador: sem login, sem valores, sem dados do prestador. Notas e fotos ocultas ficam de fora.
export default async function Obra({ params }) {
  const token = params.token;
  let a = null; let o = null; let itens = [];
  if (/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    const admin = createAdminClient();
    const { data } = await admin.from('acompanhamentos').select('*').eq('token', token).eq('link_ativo', true).maybeSingle();
    a = data;
    if (a) {
      const { data: orc } = await admin.from('orcamentos').select('endereco').eq('id', a.orcamento_id).maybeSingle();
      o = orc;
      itens = await linhaDoTempo(a, { equipe: false }, admin);
    }
  }
  if (!a || !o) {
    return <main className="min-h-screen bg-papel flex items-center justify-center p-6"><div className="card rounded-xl p-8 max-w-md text-center"><h1 className="font-bold text-xl">Link indisponível</h1><p className="text-sm text-marinho/60 mt-2">Este link de acompanhamento não existe ou foi desativado. Fale com a FixIn ou com a sua imobiliária.</p></div></main>;
  }
  const idx = ETAPAS.findIndex((e) => e.id === a.etapa);
  const atualizado = new Date(a.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

  return (
    <main className="min-h-screen bg-papel">
      <header className="bg-marinho text-white px-4 py-4"><div className="max-w-2xl mx-auto"><b className="text-2xl">FixIn</b> <span className="text-xs tracking-[0.25em] opacity-80">REFORMAS</span></div></header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-xs uppercase tracking-wide text-marinho/50">Acompanhamento da obra</p>
        <h1 className="text-2xl font-bold mt-1">{o.endereco}</h1>
        <span className={`inline-block mt-3 text-sm font-semibold rounded-full px-3 py-1 ${ETAPA_COR[a.etapa]}`}>{ETAPA_LABEL[a.etapa]}</span>

        <div className="card rounded-xl p-4 mt-5">
          <div className="flex justify-between text-sm mb-2"><b>{a.percentual}% concluído</b><span className="text-marinho/50">Atualizado em {atualizado}</span></div>
          <div className="h-3 rounded-full bg-linha overflow-hidden"><div className="h-full bg-verde" style={{ width: `${a.percentual}%` }} /></div>
          <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {ETAPAS.map((e, i) => <li key={e.id} className={i <= idx && e.id !== 'aguardando_material' ? 'text-sucesso font-semibold' : e.id === a.etapa ? 'text-erro font-semibold' : 'text-marinho/40'}>{i <= idx && e.id !== 'aguardando_material' ? '✓ ' : ''}{e.label}</li>)}
          </ol>
        </div>

        <h2 className="font-semibold text-lg mt-8 mb-3">O que já foi feito</h2>
        <LinhaDoTempoObra itens={itens} fotoBase={`/api/obra/${token}/foto`} />
        <p className="text-xs text-marinho/40 text-center mt-8">Este é um link de acompanhamento exclusivo. Não compartilhe com quem não deve ver a obra.</p>
      </div>
    </main>
  );
}
