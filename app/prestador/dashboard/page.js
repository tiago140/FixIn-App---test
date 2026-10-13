import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import { PRESTADOR_TABS } from '@/lib/navTabs';
import { ORIGEM_OS } from '@/lib/ordensStatus';
import { ArrowRight, ClipboardCheck, Hammer, Hourglass, Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

function Bloco({ Icone, titulo, qtd, cor, href }) {
  return (
    <Link href={href} className="card rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${cor}`}><Icone size={24} /></span>
      <span>
        <span className="block text-3xl font-bold leading-none">{qtd}</span>
        <span className="block text-sm text-marinho/60 mt-1">{titulo}</span>
      </span>
    </Link>
  );
}

export default async function PrestadorDashboard() {
  const { profile, supabase } = await getProfile();
  const { data: ordens } = await supabase.from('ordens_servico').select('id, numero, endereco, origem, status, criado_em').order('criado_em', { ascending: false }).limit(200);
  const todas = ordens || [];
  const conta = (...s) => todas.filter((o) => s.includes(o.status)).length;
  const agir = todas.filter((o) => ['enviada', 'aceita', 'reprovada'].includes(o.status));
  const primeiro = (profile.nome_completo || '').split(' ')[0];

  return (
    <AppShell profile={profile} tabs={PRESTADOR_TABS} homeHref="/prestador/dashboard">
      <PageHeader icone="painel" titulo={`Olá, ${primeiro}`} subtitulo="Suas ordens de serviço com a FixIn" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Bloco Icone={Inbox} titulo="Para aceitar" qtd={conta('enviada')} cor="bg-alerta/15 text-alerta" href="/prestador/ordens?status=enviada" />
        <Bloco Icone={ClipboardCheck} titulo="Para enviar valores" qtd={conta('aceita')} cor="bg-[#3B6B8C]/15 text-[#2c5570]" href="/prestador/ordens?status=aceita" />
        <Bloco Icone={Hourglass} titulo="Em aprovação" qtd={conta('orcada', 'aplicada')} cor="bg-marinho/10 text-marinho" href="/prestador/ordens?status=orcada" />
        <Bloco Icone={Hammer} titulo="Em execução" qtd={conta('em_execucao')} cor="bg-sucesso/15 text-sucesso" href="/prestador/ordens?status=em_execucao" />
      </div>

      <h2 className="font-semibold text-lg mb-3">Precisa da sua ação</h2>
      {!agir.length ? (
        <div className="border border-dashed border-linha rounded-xl p-8 text-center text-marinho/50">Tudo em dia. Quando a FixIn enviar uma nova ordem, ela aparece aqui e chega no seu e-mail.</div>
      ) : (
        <div className="space-y-2">
          {agir.map((o) => (
            <Link key={o.id} href={`/prestador/ordens/${o.id}`} className="card rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
              <span className="min-w-0">
                <span className="block font-semibold truncate">{o.endereco}</span>
                <span className="block text-xs text-marinho/55">{o.numero} · {ORIGEM_OS[o.origem]}</span>
              </span>
              <span className="flex items-center gap-3 shrink-0"><StatusOS status={o.status} /><ArrowRight size={16} className="text-marinho/40" /></span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
