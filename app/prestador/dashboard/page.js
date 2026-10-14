import Link from 'next/link';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import StatusOS from '@/components/StatusOS';
import { PRESTADOR_TABS } from '@/lib/navTabs';
import { ORIGEM_OS } from '@/lib/ordensStatus';
import { situacaoPrazo, cadastroCompleto } from '@/lib/etapasObra';
import { ArrowRight, BadgeCheck, ClipboardCheck, Hammer, Hourglass, Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

function Bloco({ Icone, titulo, qtd, cor, href, desc }) {
  return (
    <Link href={href} className={`card rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow ${qtd === 0 ? 'opacity-60' : ''}`}>
      <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${cor}`}><Icone size={20} /></span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2"><span className="text-2xl font-bold leading-none">{qtd}</span><span className="text-sm font-semibold">{titulo}</span></span>
        <span className="block text-xs text-marinho/55 mt-1">{desc}</span>
      </span>
    </Link>
  );
}

export function PainelPrestadorView({ profile, todas, fin, cadastro = { pct: 100, faltam: [] }, semPixComOrdemAprovada = false }) {
  const conta = (...s) => todas.filter((o) => s.includes(o.status)).length;
  const agir = todas.filter((o) => ['enviada', 'aceita', 'reprovada', 'em_execucao'].includes(o.status));
  const primeiro = (profile.nome_completo || '').split(' ')[0];
  const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <AppShell profile={profile} tabs={PRESTADOR_TABS} homeHref="/prestador/dashboard">
      <PageHeader icone="painel" titulo={`Olá, ${primeiro}`} subtitulo="Suas ordens de serviço com a FixIn" />
      {semPixComOrdemAprovada && <Link href="/prestador/dados" className="block rounded-xl border border-erro/40 bg-erro/10 p-4 mb-4 text-sm"><b className="text-erro">Você tem serviço aprovado, mas ainda não cadastrou a chave Pix.</b> Sem ela não conseguimos pagar. Toque para cadastrar.</Link>}
      {cadastro.pct < 100 && <Link href="/prestador/dados" className="block card rounded-xl p-4 mb-4"><div className="flex items-center justify-between text-sm"><b>Complete seu cadastro para receber</b><span className="font-mono">{cadastro.pct}%</span></div><div className="h-2 rounded-full bg-linha mt-2 overflow-hidden"><div className="h-full bg-sucesso" style={{ width: `${cadastro.pct}%` }} /></div><p className="text-xs text-marinho/55 mt-2">Falta: {cadastro.faltam.join(', ')}.</p></Link>}
      <h2 className="font-semibold text-lg mb-1">Precisa da sua ação</h2>
      <p className="text-sm text-marinho/60 mb-3">O que está esperando por você agora. Toque para abrir.</p>
      {!agir.length ? (
        <div className="border border-dashed border-linha rounded-xl p-8 text-center text-marinho/50 mb-8">Tudo em dia. Quando a FixIn enviar uma nova ordem, ela aparece aqui e chega no seu e-mail.</div>
      ) : (
        <div className="space-y-2 mb-8">
          {agir.map((o) => (
            <Link key={o.id} href={`/prestador/ordens/${o.id}`} className="card rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
              <span className="min-w-0">
                <span className="block font-semibold truncate">{o.endereco}</span>
                <span className="block text-xs text-marinho/55">{o.numero} · {ORIGEM_OS[o.origem]}</span>
                {o.status === 'reprovada' && o.reprovacao_motivo && <span className="block text-xs text-erro mt-1 line-clamp-2">Ajustar: {o.reprovacao_motivo}</span>}
                {(() => { const pz = situacaoPrazo(o.prazo_em, o.status); return pz ? <span className={`inline-block text-[11px] font-semibold mt-1 ${pz.cor === 'erro' ? 'text-erro' : pz.cor === 'alerta' ? 'text-alerta' : 'text-marinho/55'}`}>{pz.texto}</span> : null; })()}
              </span>
              <span className="flex items-center gap-3 shrink-0"><StatusOS status={o.status} /><ArrowRight size={16} className="text-marinho/40" /></span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-lg mb-3">Seu dinheiro</h2>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
        <Link href="/prestador/financeiro" className="card rounded-xl p-4 border-l-4 border-l-alerta"><span className="block text-xs text-marinho/55">A receber</span><span className="block text-xl font-bold font-mono mt-1">{brl(fin.aReceber)}</span><span className="block text-[11px] text-marinho/50 mt-1">aprovado, ainda não pago</span></Link>
        <Link href="/prestador/financeiro" className="card rounded-xl p-4 border-l-4 border-l-sucesso"><span className="block text-xs text-marinho/55">Já recebido</span><span className="block text-xl font-bold font-mono mt-1">{brl(fin.recebido)}</span><span className="block text-[11px] text-marinho/50 mt-1">{fin.processando > 0 ? `${brl(fin.processando)} em processamento` : 'com comprovante'}</span></Link>
        <Link href="/prestador/financeiro" className="card rounded-xl p-4 border-l-4 border-l-marinho"><span className="block text-xs text-marinho/55">Em execução</span><span className="block text-xl font-bold font-mono mt-1">{brl(fin.emExecucao)}</span><span className="block text-[11px] text-marinho/50 mt-1">serviços em andamento</span></Link>
        <Link href="/prestador/financeiro" className={`card rounded-xl p-4 border-l-4 ${fin.semNota ? 'border-l-erro' : 'border-l-sucesso'}`}><span className="block text-xs text-marinho/55">Notas fiscais</span><span className="block text-xl font-bold mt-1">{fin.semNota ? `${fin.semNota} pendente${fin.semNota > 1 ? 's' : ''}` : 'Em dia'}</span><span className="block text-[11px] text-marinho/50 mt-1">{fin.semNota ? 'anexe para receber' : 'nada pendente'}</span></Link>
      </div>

      <h2 className="font-semibold text-lg mb-3">Suas ordens</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <Bloco Icone={Inbox} titulo="Para aceitar" desc="Aceite ou recuse" qtd={conta('enviada')} cor="bg-alerta/15 text-alerta" href="/prestador/ordens?status=enviada" />
        <Bloco Icone={ClipboardCheck} titulo="Enviar valores" desc="Mão de obra e material" qtd={conta('aceita')} cor="bg-[#3B6B8C]/15 text-[#2c5570]" href="/prestador/ordens?status=aceita" />
        <Bloco Icone={Hammer} titulo="Em execução" desc="Faça e envie as fotos (inclui refazer)" qtd={conta('em_execucao', 'reprovada')} cor="bg-sucesso/15 text-sucesso" href="/prestador/ordens?status=em_execucao" />
        <Bloco Icone={Hourglass} titulo="Com a FixIn" desc="Valores ou fotos em conferência" qtd={conta('orcada', 'aplicada', 'conclusao_pendente')} cor="bg-marinho/10 text-marinho" href="/prestador/ordens" />
        <Bloco Icone={BadgeCheck} titulo="Concluídas" desc="Aprovadas e pagas" qtd={conta('aprovada', 'paga')} cor="bg-sucesso/20 text-sucesso" href="/prestador/ordens?status=aprovada" />
      </div>
    </AppShell>
  );
}

export default async function PrestadorDashboard() {
  const { profile, supabase } = await getProfile();
  const [{ data: ordens }, { data: itens }, { data: pags }, { data: notas }, { data: prest }] = await Promise.all([
    supabase.from('ordens_servico').select('id, numero, endereco, origem, status, criado_em, prazo_em, reprovacao_motivo').order('criado_em', { ascending: false }).limit(200),
    supabase.from('os_itens').select('os_id, mo, ma'),
    supabase.from('pagamentos_prestador').select('os_id, valor, status'),
    supabase.from('os_notas').select('os_id'),
    supabase.from('prestadores').select('telefone, tipo_pessoa, cpf, cnpj, pix_chave, banco, agencia, conta').eq('id', profile.prestador_id).maybeSingle(),
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
  const cadastro = cadastroCompleto(prest);
  const semPix = !String(prest?.pix_chave || '').trim() && todas.some((o) => ['aprovada', 'conclusao_pendente'].includes(o.status));
  return <PainelPrestadorView profile={profile} todas={todas} fin={fin} cadastro={cadastro} semPixComOrdemAprovada={semPix} />;
}
