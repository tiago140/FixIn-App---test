import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import { PRESTADOR_TABS } from '@/lib/navTabs';
import { ORIGEM_OS } from '@/lib/ordensStatus';
import { ArrowRight, BadgeCheck, Camera, ClipboardCheck, Hammer, Hourglass, Inbox, Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

function Bloco({ Icone, titulo, qtd, cor, href, desc }) {
  return (
    <Link href={href} className="card rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${cor}`}><Icone size={24} /></span>
      <span>
        <span className="block text-3xl font-bold leading-none">{qtd}</span>
        <span className="block text-sm font-semibold mt-1">{titulo}</span>
        <span className="block text-xs text-marinho/55 mt-0.5">{desc}</span>
      </span>
    </Link>
  );
}

export function PainelPrestadorView({ profile, todas, fin }) {
  const conta = (...s) => todas.filter((o) => s.includes(o.status)).length;
  const agir = todas.filter((o) => ['enviada', 'aceita', 'reprovada', 'em_execucao'].includes(o.status));
  const primeiro = (profile.nome_completo || '').split(' ')[0];
  const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <AppShell profile={profile} tabs={PRESTADOR_TABS} homeHref="/prestador/dashboard">
      <PageHeader icone="painel" titulo={`Olá, ${primeiro}`} subtitulo="Suas ordens de serviço com a FixIn" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <Link href="/prestador/financeiro" className="card rounded-xl p-5 border-l-4 border-l-alerta"><span className="block text-xs uppercase tracking-wide text-marinho/55">A receber</span><span className="block text-2xl font-bold font-mono mt-1">{brl(fin.aReceber)}</span><span className="block text-xs text-marinho/50 mt-1">serviços aprovados ainda não pagos</span></Link>
        <Link href="/prestador/financeiro" className="card rounded-xl p-5 border-l-4 border-l-sucesso"><span className="block text-xs uppercase tracking-wide text-marinho/55">Já recebido</span><span className="block text-2xl font-bold font-mono mt-1">{brl(fin.recebido)}</span><span className="block text-xs text-marinho/50 mt-1">{fin.processando > 0 ? `${brl(fin.processando)} em processamento` : 'com comprovante'}</span></Link>
        <Link href="/prestador/financeiro" className="card rounded-xl p-5 border-l-4 border-l-marinho"><span className="block text-xs uppercase tracking-wide text-marinho/55">Em execução</span><span className="block text-2xl font-bold font-mono mt-1">{brl(fin.emExecucao)}</span><span className="block text-xs text-marinho/50 mt-1">valor dos serviços em andamento</span></Link>
        <Link href="/prestador/financeiro" className={`card rounded-xl p-5 border-l-4 ${fin.semNota ? 'border-l-erro' : 'border-l-sucesso'}`}><span className="block text-xs uppercase tracking-wide text-marinho/55">Notas fiscais</span><span className="block text-2xl font-bold mt-1">{fin.semNota ? `${fin.semNota} pendente${fin.semNota > 1 ? 's' : ''}` : 'Em dia'}</span><span className="block text-xs text-marinho/50 mt-1">{fin.semNota ? 'anexe para agilizar o pagamento' : 'nada pendente'}</span></Link>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Bloco Icone={Inbox} titulo="Para aceitar" desc="Nova ordem: aceite ou recuse" qtd={conta('enviada')} cor="bg-alerta/15 text-alerta" href="/prestador/ordens?status=enviada" />
        <Bloco Icone={ClipboardCheck} titulo="Para enviar valores" desc="Informe mão de obra e material" qtd={conta('aceita')} cor="bg-[#3B6B8C]/15 text-[#2c5570]" href="/prestador/ordens?status=aceita" />
        <Bloco Icone={Hourglass} titulo="Em aprovação" desc="A FixIn está aprovando seus valores" qtd={conta('orcada', 'aplicada')} cor="bg-marinho/10 text-marinho" href="/prestador/ordens?status=orcada" />
        <Bloco Icone={Hammer} titulo="Em execução" desc="Faça o serviço e envie as fotos" qtd={conta('em_execucao')} cor="bg-sucesso/15 text-sucesso" href="/prestador/ordens?status=em_execucao" />
        <Bloco Icone={Camera} titulo="Pendentes de conclusão" desc="Falta enviar as fotos ou refazer" qtd={conta('em_execucao', 'reprovada')} cor="bg-alerta/15 text-alerta" href="/prestador/ordens?status=em_execucao" />
        <Bloco Icone={Hourglass} titulo="Conclusão em análise" desc="A FixIn está conferindo suas fotos" qtd={conta('conclusao_pendente')} cor="bg-marinho/10 text-marinho" href="/prestador/ordens?status=conclusao_pendente" />
        <Bloco Icone={BadgeCheck} titulo="Finalizadas" desc="Aprovadas, prontas para pagamento" qtd={conta('aprovada', 'paga')} cor="bg-sucesso/15 text-sucesso" href="/prestador/ordens?status=aprovada" />
        <Bloco Icone={Wallet} titulo="Pagas" desc="Pagamento feito, com comprovante" qtd={conta('paga')} cor="bg-sucesso/20 text-sucesso" href="/prestador/ordens?status=paga" />
      </div>

      <h2 className="font-semibold text-lg mb-1">Precisa da sua ação</h2>
      <p className="text-sm text-marinho/60 mb-3">O que está esperando por você agora. Toque para abrir.</p>
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

export default async function PrestadorDashboard() {
  const { profile, supabase } = await getProfile();
  const [{ data: ordens }, { data: itens }, { data: pags }, { data: notas }] = await Promise.all([
    supabase.from('ordens_servico').select('id, numero, endereco, origem, status, criado_em').order('criado_em', { ascending: false }).limit(200),
    supabase.from('os_itens').select('os_id, mo, ma'),
    supabase.from('pagamentos_prestador').select('os_id, valor, status'),
    supabase.from('os_notas').select('os_id'),
  ]);
  const todas = ordens || [];
  const totalDe = (id) => (itens || []).filter((i) => i.os_id === id).reduce((s, i) => s + Number(i.mo || 0) + Number(i.ma || 0), 0);
  const ok = (p) => (p.status || 'confirmado') === 'confirmado';
  const pagoDe = (id) => (pags || []).filter((p) => p.os_id === id && ok(p)).reduce((s, p) => s + Number(p.valor), 0);
  const fin = {
    aReceber: todas.filter((o) => o.status === 'aprovada').reduce((s, o) => s + Math.max(0, totalDe(o.id) - pagoDe(o.id)), 0),
    recebido: (pags || []).filter(ok).reduce((s, p) => s + Number(p.valor), 0),
    processando: (pags || []).filter((p) => p.status === 'processando').reduce((s, p) => s + Number(p.valor), 0),
    emExecucao: todas.filter((o) => ['em_execucao', 'reprovada', 'conclusao_pendente'].includes(o.status)).reduce((s, o) => s + totalDe(o.id), 0),
    semNota: todas.filter((o) => ['conclusao_pendente', 'aprovada', 'paga'].includes(o.status) && !(notas || []).some((n) => n.os_id === o.id)).length,
  };
  return <PainelPrestadorView profile={profile} todas={todas} fin={fin} />;
}
