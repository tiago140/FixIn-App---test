import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

const Selo = ({ ok, children }) => (
  <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${ok ? 'bg-sucesso/15 text-sucesso' : 'bg-marinho/10 text-marinho/50'}`}>{children}</span>
);

export default async function PrestadoresPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');

  const [{ data: prestadores }, { data: acessos }, { data: ordens }] = await Promise.all([
    supabase.from('prestadores').select('*').order('nome'),
    supabase.from('profiles').select('prestador_id').eq('role', 'prestador'),
    supabase.from('ordens_servico').select('prestador_id, status'),
  ]);
  const comAcesso = new Set((acessos || []).map((a) => a.prestador_id));
  const abertas = {};
  (ordens || []).forEach((o) => { if (!['paga', 'cancelada', 'recusada'].includes(o.status)) abertas[o.prestador_id] = (abertas[o.prestador_id] || 0) + 1; });

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader
        icone="prestadores"
        titulo="Prestadores"
        subtitulo="Cadastro, acesso ao portal e dados de pagamento"
        direita={<Link href="/master/prestadores/novo" className="bg-verde text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">+ Novo prestador</Link>}
      />

      {!prestadores || prestadores.length === 0 ? (
        <div className="border border-dashed border-linha p-8 text-center text-marinho/50 rounded-xl">Nenhum prestador cadastrado ainda.</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {prestadores.map((p) => (
            <Link key={p.id} href={`/master/prestadores/${p.id}`} className="card rounded-xl p-4 hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.nome}</div>
                  <div className="text-xs text-marinho/55 mt-0.5 truncate">
                    {[p.telefone, p.email, p.tipo_pessoa === 'pj' ? (p.cnpj && `CNPJ ${p.cnpj}`) : (p.cpf && `CPF ${p.cpf}`)].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}
                  </div>
                </div>
                {abertas[p.id] > 0 && <span className="shrink-0 bg-marinho text-white text-xs font-bold rounded-full px-2.5 py-1">{abertas[p.id]} em aberto</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Selo ok={comAcesso.has(p.id)}>{comAcesso.has(p.id) ? 'Acesso criado' : 'Sem acesso'}</Selo>
                <Selo ok={!!p.pix_chave}>{p.pix_chave ? 'Pix cadastrado' : 'Sem Pix'}</Selo>
                <Selo ok={!!p.asaas_wallet_id}>{p.asaas_wallet_id ? 'Asaas vinculado' : 'Asaas não vinculado'}</Selo>
                {p.ativo === false && <Selo ok={false}>Inativo</Selo>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
