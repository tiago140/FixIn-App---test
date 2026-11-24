import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { MASTER_TABS } from '@/lib/navTabs';
import BotaoCopiar from '@/components/BotaoCopiar';
import DecidirCadastro from '@/components/prestadores/DecidirCadastro';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cadastros' };

export default async function CadastrosPage() {
  const { user, profile, supabase } = await getProfile();
  if (!user) redirect('/login');
  if (profile.role !== 'master') redirect('/imobiliaria/dashboard');
  const { data: lista } = await supabase.from('prestadores_cadastros').select('*').order('criado_em', { ascending: false }).limit(100);
  const pend = (lista || []).filter((c) => c.status === 'pendente');
  const feitos = (lista || []).filter((c) => c.status !== 'pendente');
  const Linha = ({ k, v }) => (v ? <div className="text-sm"><span className="text-marinho/55">{k}: </span>{v}</div> : null);

  return (
    <AppShell profile={profile} tabs={MASTER_TABS} homeHref="/master/dashboard">
      <PageHeader icone="prestadores" titulo="Cadastros" subtitulo="Links de cadastro externo e pedidos aguardando sua aprovação."
        direita={<Link href="/master/prestadores" className="text-sm underline">Prestadores</Link>} />
      <div className="card rounded-xl p-4 mb-5 space-y-3">
        {[['Prestadores de serviço (escolhem as áreas)', 'https://app.fixinreformas.com/cadastro-prestador'], ['Imobiliárias parceiras (Painel Renova)', 'https://portal.renovavistoria.com.br/painel/cadastro-imobiliaria']].map(([n, u]) => (
          <div key={u} className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{n}:</span><code className="text-xs break-all">{u}</code><div className="w-40"><BotaoCopiar texto={u} rotulo="Copiar link" /></div></div>
        ))}
        <div className="text-xs text-marinho/60">Os pedidos de imobiliárias são aprovados no Painel Renova, tela Imobiliárias.</div>
      </div>
      <h3 className="font-semibold mb-2">Prestadores aguardando ({pend.length})</h3>
      {pend.length === 0 ? <div className="border border-dashed border-linha p-8 text-center text-marinho/50 rounded-xl">Nenhum cadastro aguardando.</div> : (
        <div className="space-y-3">
          {pend.map((c) => { const d = c.dados || {}; return (
            <div key={c.id} className="card rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2"><div className="font-semibold">{d.nome}</div><div className="text-xs text-marinho/50">{new Date(c.criado_em).toLocaleString('pt-BR')}</div></div>
              <Linha k={d.tipo_pessoa === 'pj' ? 'CNPJ' : 'CPF'} v={d.tipo_pessoa === 'pj' ? d.cnpj : d.cpf} />
              <Linha k="Razão social" v={d.razao_social} />
              <Linha k="Contato" v={[d.telefone, d.email].filter(Boolean).join(' · ')} />
              <Linha k="Atende em" v={d.cidade} />
              <Linha k="Áreas" v={(d.areas || []).join(' · ')} />
              <Linha k="Experiência" v={d.experiencia} />
              <Linha k="Pix" v={d.pix_chave ? `${d.pix_tipo}: ${d.pix_chave}` : ''} />
              <Linha k="Banco" v={[d.banco, d.agencia && `ag ${d.agencia}`, d.conta && `cc ${d.conta}`].filter(Boolean).join(' · ')} />
              <DecidirCadastro id={c.id} />
            </div>); })}
        </div>
      )}
      {feitos.length > 0 && (
        <div className="mt-8"><h3 className="font-semibold mb-2">Já decididos</h3>
          <div className="divide-y divide-linha card rounded-xl">
            {feitos.map((c) => (<div key={c.id} className="p-3 text-sm flex flex-wrap justify-between gap-2"><span>{c.dados?.nome}</span><span className="text-marinho/55">{c.status === 'aprovado' ? 'Aprovado' : 'Recusado'} · {new Date(c.decidido_em || c.criado_em).toLocaleDateString('pt-BR')}</span></div>))}
          </div></div>
      )}
    </AppShell>
  );
}
