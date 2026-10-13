import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acompanhamento da obra · FixIn', robots: { index: false, follow: false }, referrer: 'no-referrer' };

const dia = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const diaCurto = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const SITUACAO = {
  aceita: 'Serviço agendado', orcada: 'Serviço agendado', aplicada: 'Serviço agendado', em_execucao: 'Obra em andamento', reprovada: 'Obra em andamento (ajustes)',
  conclusao_pendente: 'Em conferência final', aprovada: 'Obra concluída', paga: 'Obra concluída',
};

function Fotos({ token, fotos }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
      {fotos.map((f) => (
        <a key={f.id} href={`/api/acompanhar/${token}/foto/${f.id}`} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/acompanhar/${token}/foto/${f.id}`} alt={f.legenda || 'Foto da obra'} loading="lazy" className="w-full aspect-square object-cover rounded-lg border border-linha" />
          {f.legenda && <span className="block text-xs text-marinho/60 mt-1">{f.legenda}</span>}
        </a>
      ))}
    </div>
  );
}

function Marco({ ativo, titulo, data, children, ultimo }) {
  return (
    <li className="relative pl-9 pb-8">
      {!ultimo && <span className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${ativo ? 'bg-sucesso/40' : 'bg-linha'}`} />}
      <span className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${ativo ? 'bg-sucesso border-sucesso text-white' : 'bg-white border-linha'}`}>{ativo && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12l5 5 9-10" /></svg>}</span>
      <div className="flex flex-wrap items-baseline gap-x-3"><h2 className={`font-semibold text-lg ${ativo ? '' : 'text-marinho/45'}`}>{titulo}</h2>{data && <span className="text-sm text-marinho/55">{data}</span>}</div>
      {children}
    </li>
  );
}

export default async function Acompanhar({ params }) {
  const token = params.token;
  let os = null; let fotos = [];
  if (/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    const admin = createAdminClient();
    const { data } = await admin.from('ordens_servico').select('id, numero, endereco, descricao, status, liberado_em, aceito_em, criado_em, concluido_em, revisado_em').eq('token_acompanhamento', token).eq('acompanhamento_ativo', true).maybeSingle();
    os = data;
    if (os) {
      const { data: f } = await admin.from('os_fotos').select('id, tipo, rodada, legenda, criado_em').eq('os_id', os.id).neq('tipo', 'reprovacao').order('criado_em', { ascending: true });
      fotos = f || [];
    }
  }
  if (!os) {
    return <main className="min-h-screen bg-papel flex items-center justify-center p-6"><div className="card rounded-xl p-8 max-w-md text-center"><h1 className="font-bold text-xl">Link indisponível</h1><p className="text-sm text-marinho/60 mt-2">Este link de acompanhamento não existe ou foi desativado. Fale com a FixIn.</p></div></main>;
  }
  const concluida = ['aprovada', 'paga'].includes(os.status);
  const inicio = fotos.filter((f) => f.tipo === 'antes');
  const exec = fotos.filter((f) => f.tipo === 'durante');
  const final = concluida ? fotos.filter((f) => f.tipo === 'depois') : [];
  const porDia = [];
  for (const f of exec) { const d = diaCurto(f.criado_em); const g = porDia.find((x) => x.d === d); if (g) g.fotos.push(f); else porDia.push({ d, ref: f.criado_em, fotos: [f] }); }
  const situacao = SITUACAO[os.status] || 'Em andamento';

  return (
    <main className="min-h-screen bg-papel">
      <header className="bg-marinho text-white px-4 py-4"><div className="max-w-2xl mx-auto"><b className="text-2xl">FixIn</b> <span className="text-xs tracking-[0.25em] opacity-80">REFORMAS</span></div></header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-xs uppercase tracking-wide text-marinho/50">Acompanhamento da obra · {os.numero}</p>
        <h1 className="text-2xl font-bold mt-1">{os.endereco}</h1>
        <span className={`inline-block mt-3 text-sm font-semibold rounded-full px-3 py-1 ${concluida ? 'bg-sucesso/15 text-sucesso' : 'bg-alerta/15 text-alerta'}`}>{situacao}</span>
        {os.descricao && <p className="text-sm text-marinho/70 mt-3 whitespace-pre-wrap">{os.descricao}</p>}

        <ol className="mt-8">
          <Marco ativo titulo="Serviço combinado" data={dia(os.liberado_em || os.aceito_em || os.criado_em)} />
          <Marco ativo={inicio.length > 0} titulo="Início" data={inicio[0] ? dia(inicio[0].criado_em) : ''}>
            {inicio.length ? <Fotos token={token} fotos={inicio} /> : <p className="text-sm text-marinho/45 mt-1">Aguardando as fotos do início da obra.</p>}
          </Marco>
          <Marco ativo={exec.length > 0} titulo="Execução" data={porDia.length ? `${porDia.length} ${porDia.length > 1 ? 'dias registrados' : 'dia registrado'}` : ''}>
            {porDia.length ? porDia.map((g) => <div key={g.d} className="mt-3"><div className="text-sm font-semibold text-marinho/70">{dia(g.ref)}</div><Fotos token={token} fotos={g.fotos} /></div>) : <p className="text-sm text-marinho/45 mt-1">As fotos do andamento aparecem aqui.</p>}
          </Marco>
          <Marco ativo={concluida} titulo="Final" data={concluida && os.revisado_em ? dia(os.revisado_em) : ''} ultimo>
            {concluida && final.length ? <Fotos token={token} fotos={final} /> : <p className="text-sm text-marinho/45 mt-1">{os.status === 'conclusao_pendente' ? 'Serviço entregue, em conferência final pela FixIn.' : 'Disponível quando a obra for concluída e conferida.'}</p>}
          </Marco>
        </ol>
        <p className="text-xs text-marinho/40 text-center mt-4">Este é um link de acompanhamento exclusivo. Não compartilhe com quem não deve ver a obra.</p>
      </div>
    </main>
  );
}
