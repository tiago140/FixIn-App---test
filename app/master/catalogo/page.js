import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import { MASTER_TABS } from '@/lib/navTabs';
import NovoCatalogoItemForm from '@/components/NovoCatalogoItemForm';
import { fmtBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const { data: itens } = await supabase.from('catalogo_itens').select('*').order('ambiente').order('servico');

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <div className="border-b-2 border-marinho pb-3 mb-6">
        <h1 className="font-slab text-3xl font-semibold">Catálogo de itens</h1>
        <div className="text-sm text-marinho/60">Valores de referência de mão de obra e material, reutilizáveis em qualquer orçamento</div>
      </div>

      <NovoCatalogoItemForm />

      {!itens || itens.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum item cadastrado ainda.</div>
      ) : (
        itens.map((it) => (
          <div key={it.id} className="py-2.5 border-b border-linha flex justify-between text-sm">
            <div>
              <span className="text-marinho/50">{it.ambiente} · </span>
              <span className="font-medium">{it.servico}</span>
            </div>
            <div className="font-mono text-marinho/70">
              MO {fmtBRL(it.mo_padrao)} · MA {fmtBRL(it.ma_padrao)}
            </div>
          </div>
        ))
      )}
    </AppShell>
  );
}
