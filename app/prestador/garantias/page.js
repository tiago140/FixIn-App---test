import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { PRESTADOR_TABS } from '@/lib/navTabs';
import { garantiasDoPrestador } from '@/lib/garantias';

export const dynamic = 'force-dynamic';

export default async function PrestadorGarantias() {
  const { profile } = await getProfile();
  const lista = await garantiasDoPrestador(profile.prestador_id);
  const hoje = new Date();
  const fmt = (d) => new Date(d).toLocaleDateString('pt-BR');
  return (
    <AppShell profile={profile} tabs={PRESTADOR_TABS} homeHref="/prestador/dashboard">
      <PageHeader icone="orcamentos" titulo="Garantias" subtitulo="Serviços aprovados e até quando cada garantia vale" />
      {!lista.length ? <div className="border border-dashed border-linha rounded-xl p-8 text-center text-marinho/50">Os serviços aprovados aparecem aqui com o prazo de garantia.</div> : (
        <div className="space-y-2">
          {lista.map((g) => {
            const vigente = g.vencimento && g.vencimento > hoje;
            return (
              <Link key={g.id} href={`/prestador/ordens/${g.id}`} className="card rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:shadow-md transition-shadow">
                <span className="min-w-0">
                  <span className="block font-semibold">{g.endereco}</span>
                  <span className="block text-xs text-marinho/55">{g.numero}{g.orcamento_numero ? ` · orçamento ${g.orcamento_numero}` : ''} · aprovado em {g.revisado_em ? fmt(g.revisado_em) : '—'}</span>
                </span>
                <span className="text-right text-sm">
                  <span className="block text-marinho/60">{g.garantia || 'Prazo não informado'}</span>
                  {g.vencimento && <span className={`block font-semibold ${vigente ? 'text-sucesso' : 'text-marinho/50'}`}>{vigente ? 'Vale até' : 'Venceu em'} {fmt(g.vencimento)}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
