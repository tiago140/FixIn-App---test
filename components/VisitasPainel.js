'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Check, X, Clock, Hammer, ChevronLeft, ChevronRight } from 'lucide-react';
import { chaveDia, fmtHoraSP, hojeSP, partesSP } from '@/lib/fuso';

// Tela de visitas pensada para quem não conhece o sistema: o que precisa de resposta fica no topo, com o botão ao lado;
// cada visita diz em palavras simples em que pé está e o que acontece depois. Horários sempre de Brasília (lib/fuso).

const dois = (n) => String(n).padStart(2, '0');
const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS_EXT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Cor + texto simples por situação. `quem` = de quem é a vez.
function situacao(v, role) {
  const master = role === 'master';
  switch (v.status) {
    case 'pendente':
      return master
        ? { rotulo: 'Esperando sua resposta', dica: 'A imobiliária pediu esta visita. Confirme, proponha outra data ou recuse.', cor: 'alerta', vez: true }
        : { rotulo: 'Esperando a FixIn', dica: 'Pedido enviado. A FixIn vai confirmar ou propor outra data.', cor: 'alerta', vez: false };
    case 'sugerida':
      return master
        ? { rotulo: 'Esperando a imobiliária', dica: 'Você propôs outra data. Falta a imobiliária aceitar.', cor: 'info', vez: false }
        : { rotulo: 'A FixIn propôs outra data', dica: 'Aceite a nova data ou recuse a visita.', cor: 'info', vez: true };
    case 'confirmada':
      return { rotulo: 'Confirmada', dica: 'Está combinada. É só comparecer no dia e horário.', cor: 'sucesso', vez: false };
    default:
      return { rotulo: 'Cancelada', dica: 'Esta visita não vai acontecer.', cor: 'erro', vez: false };
  }
}
const COR = {
  alerta: { borda: 'border-l-alerta', chip: 'bg-alerta/15 text-alerta', ponto: 'bg-alerta' },
  info: { borda: 'border-l-info', chip: 'bg-info/15 text-info', ponto: 'bg-info' },
  sucesso: { borda: 'border-l-sucesso', chip: 'bg-sucesso/15 text-sucesso', ponto: 'bg-sucesso' },
  erro: { borda: 'border-l-erro', chip: 'bg-erro/10 text-erro', ponto: 'bg-erro' },
};

function rotuloDia(chave, hoje, curto = false) {
  const [a, m, d] = chave.split('-').map(Number);
  const dif = Math.round((Date.UTC(a, m - 1, d) - Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia)) / 86400000);
  const sem = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  const data = `${dois(d)}/${dois(m)}`;
  if (dif === 0) return curto ? `hoje, ${data}` : `Hoje — ${DIAS_EXT[sem]}, ${data}`;
  if (dif === 1) return curto ? `amanhã, ${data}` : `Amanhã — ${DIAS_EXT[sem]}, ${data}`;
  if (dif === -1) return curto ? `ontem, ${data}` : `Ontem — ${DIAS_EXT[sem]}, ${data}`;
  return curto ? `${DIAS_SEM[sem]}, ${data}` : `${DIAS_EXT[sem][0].toUpperCase() + DIAS_EXT[sem].slice(1)}, ${data}`;
}
const quandoCurto = (iso, hoje) => (iso ? `${rotuloDia(chaveDia(iso), hoje, true)} às ${fmtHoraSP(iso)}` : 'sem data');

function Botao({ onClick, disabled, tipo = 'neutro', icone: Icone, children }) {
  const estilo = {
    principal: 'bg-verde text-white hover:brightness-110',
    escuro: 'bg-marinho text-white hover:brightness-110',
    neutro: 'bg-white text-marinho border border-linha hover:border-marinho/40',
    perigo: 'bg-white text-erro border border-erro/30 hover:bg-erro/5',
  }[tipo];
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${estilo}`}>
      {Icone && <Icone size={16} />}{children}
    </button>
  );
}

function CartaoVisita({ v, role, hoje, mostrarData = false, destaque = false }) {
  const router = useRouter();
  const master = role === 'master';
  const sit = situacao(v, role);
  const cor = COR[sit.cor];
  const [carregando, setCarregando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [erro, setErro] = useState('');

  async function enviar(body, confirmarTexto) {
    if (confirmarTexto && !window.confirm(confirmarTexto)) return;
    setCarregando(true); setErro('');
    try {
      const res = await fetch(`/api/visitas/${v.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErro(d.error || 'Não foi possível salvar. Tente de novo.'); return; }
      setSugerindo(false);
      router.refresh();
    } finally { setCarregando(false); }
  }

  const hora = v.data_hora ? fmtHoraSP(v.data_hora) : '—';
  const quem = [master ? v.clientes?.nome_empresa : null, v.responsavel ? `responsável: ${v.responsavel}` : null].filter(Boolean).join(' · ');
  const acoes = [];
  if (master && v.status === 'pendente') {
    acoes.push(<Botao key="c" tipo="principal" icone={Check} disabled={carregando} onClick={() => enviar({ status: 'confirmada' })}>Confirmar visita</Botao>);
    acoes.push(<Botao key="s" icone={Clock} disabled={carregando} onClick={() => setSugerindo(true)}>Propor outra data</Botao>);
    acoes.push(<Botao key="r" tipo="perigo" icone={X} disabled={carregando} onClick={() => enviar({ status: 'cancelada' }, 'Recusar esta visita? A imobiliária será avisada.')}>Recusar</Botao>);
  }
  if (master && v.status === 'confirmada') {
    acoes.push(<Link key="o" href={`/master/orcamentos/novo?tipo=rescisao&endereco=${encodeURIComponent(v.endereco)}&cliente_id=${v.cliente_id}`}
      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-marinho px-4 py-2 text-sm font-semibold text-white hover:brightness-110"><Hammer size={16} />Criar orçamento deste imóvel</Link>);
    acoes.push(<Botao key="x" tipo="perigo" disabled={carregando} onClick={() => enviar({ status: 'cancelada' }, 'Cancelar esta visita confirmada? A imobiliária será avisada.')}>Cancelar visita</Botao>);
  }
  if (!master && v.status === 'sugerida') {
    acoes.push(<Botao key="a" tipo="principal" icone={Check} disabled={carregando} onClick={() => enviar({ status: 'confirmada' })}>Aceitar nova data</Botao>);
    acoes.push(<Botao key="r" tipo="perigo" icone={X} disabled={carregando} onClick={() => enviar({ status: 'cancelada' }, 'Recusar a nova data e cancelar esta visita?')}>Recusar</Botao>);
  }
  if (!master && v.status === 'pendente') {
    acoes.push(<Botao key="x" tipo="perigo" disabled={carregando} onClick={() => enviar({ status: 'cancelada' }, 'Cancelar este pedido de visita?')}>Cancelar pedido</Botao>);
  }

  return (
    <div className={`rounded-xl border border-linha border-l-4 ${cor.borda} bg-white p-4 shadow-sm ${destaque ? 'ring-1 ring-marinho/10' : ''}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-[4.5rem]">
          <div className="text-2xl font-bold leading-none text-marinho">{hora}</div>
          {mostrarData && v.data_hora && <div className="mt-1 text-xs font-semibold text-marinho/60">{rotuloDia(chaveDia(v.data_hora), hoje, true)}</div>}
        </div>
        <div className="min-w-0 flex-1 basis-60">
          <div className="text-base font-semibold leading-snug text-marinho break-words">{v.endereco}</div>
          {quem && <div className="mt-0.5 text-sm text-marinho/60">{quem}</div>}
          {v.prestadores?.nome && <div className="mt-1 text-sm text-marinho/70">Prestador: <b>{v.prestadores.nome}</b>{v.prestadores.telefone ? ` · ${v.prestadores.telefone}` : ''}</div>}
          {v.observacoes && <div className="mt-1 text-sm text-marinho/60">“{v.observacoes}”</div>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${cor.chip}`}>{sit.rotulo}</span>
      </div>

      {v.status === 'sugerida' && v.data_hora_sugerida && (
        <div className="mt-3 rounded-lg bg-info/10 px-3 py-2 text-sm text-marinho">
          Nova data proposta: <b>{quandoCurto(v.data_hora_sugerida, hoje)}</b> <span className="text-marinho/50">(antes: {quandoCurto(v.data_hora, hoje)})</span>
        </div>
      )}
      <div className="mt-2 text-sm text-marinho/60">{sit.dica}</div>

      {sugerindo && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-papel p-3">
          <label className="text-sm text-marinho/70">
            Qual dia e horário você pode? <span className="text-marinho/40">(horário de Brasília)</span>
            <input type="datetime-local" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="mt-1 block rounded-lg border border-linha bg-white px-3 py-2 text-base" />
          </label>
          <Botao tipo="escuro" disabled={carregando || !novaData} onClick={() => enviar({ status: 'sugerida', data_hora_sugerida: novaData })}>Enviar proposta</Botao>
          <Botao onClick={() => setSugerindo(false)}>Voltar</Botao>
        </div>
      )}
      {!sugerindo && acoes.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{acoes}</div>}
      {erro && <div className="mt-2 text-sm font-semibold text-erro">{erro}</div>}
    </div>
  );
}

const ETAPAS = {
  master: ['A imobiliária pede a visita', 'Você confirma ou propõe outra data', 'A visita aparece como Confirmada'],
  imobiliaria: ['Você pede a visita', 'A FixIn confirma ou propõe outra data', 'Se propuser outra, você aceita ou recusa'],
};

export default function VisitasPainel({ visitas, role = 'master' }) {
  const hoje = hojeSP();
  const chaveHoje = `${hoje.ano}-${dois(hoje.mes)}-${dois(hoje.dia)}`;
  const master = role === 'master';
  const [aba, setAba] = useState('proximas');
  const [vista, setVista] = useState('lista');
  const [offset, setOffset] = useState(0);
  const [diaSel, setDiaSel] = useState(chaveHoje);
  const [verPassadas, setVerPassadas] = useState(false);

  const todas = visitas || [];
  const ordenar = (arr) => [...arr].sort((a, b) => String(a.data_hora || '9').localeCompare(String(b.data_hora || '9')));
  const precisaDeVoce = ordenar(todas.filter((v) => situacao(v, role).vez));
  const ativas = todas.filter((v) => v.status !== 'cancelada');
  const abas = [
    { id: 'proximas', rotulo: 'Próximas', n: ativas.filter((v) => !situacao(v, role).vez && (!v.data_hora || chaveDia(v.data_hora) >= chaveHoje)).length, f: (v) => v.status !== 'cancelada' && !situacao(v, role).vez },
    { id: 'confirmadas', rotulo: 'Confirmadas', n: todas.filter((v) => v.status === 'confirmada').length, f: (v) => v.status === 'confirmada' },
    { id: 'espera', rotulo: 'Esperando resposta', n: todas.filter((v) => v.status === 'pendente' || v.status === 'sugerida').length, f: (v) => v.status === 'pendente' || v.status === 'sugerida' },
    { id: 'canceladas', rotulo: 'Canceladas', n: todas.filter((v) => v.status === 'cancelada').length, f: (v) => v.status === 'cancelada' },
  ];
  const filtro = abas.find((a) => a.id === aba) || abas[0];
  const lista = ordenar(todas.filter(filtro.f));
  const porDia = useMemo(() => {
    const m = {};
    lista.forEach((v) => { const d = v.data_hora ? chaveDia(v.data_hora) : ''; if (d) (m[d] = m[d] || []).push(v); });
    return m;
  }, [lista]); // eslint-disable-line react-hooks/exhaustive-deps
  const semData = lista.filter((v) => !v.data_hora);
  const diasFuturos = Object.keys(porDia).filter((d) => d >= chaveHoje).sort();
  const diasPassados = Object.keys(porDia).filter((d) => d < chaveHoje).sort().reverse();

  const nHoje = ativas.filter((v) => v.data_hora && chaveDia(v.data_hora) === chaveHoje).length;
  const amanha = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia + 1));
  const chaveAmanha = `${amanha.getUTCFullYear()}-${dois(amanha.getUTCMonth() + 1)}-${dois(amanha.getUTCDate())}`;
  const nAmanha = ativas.filter((v) => v.data_hora && chaveDia(v.data_hora) === chaveAmanha).length;

  // mês
  const mesBase = hoje.mes - 1 + offset;
  const ano = hoje.ano + Math.floor(mesBase / 12);
  const mesIdx = ((mesBase % 12) + 12) % 12;
  const vazios = new Date(Date.UTC(ano, mesIdx, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mesIdx + 1, 0)).getUTCDate();
  const chaveDoDia = (d) => `${ano}-${dois(mesIdx + 1)}-${dois(d)}`;
  const doDiaSel = porDia[diaSel] || [];

  const Dia = ({ dia, passado = false }) => (
    <div className={`mb-5 ${passado ? 'opacity-80' : ''}`}>
      <div className={`mb-2 text-sm font-bold ${dia === chaveHoje ? 'text-verde' : 'text-marinho/70'}`}>{rotuloDia(dia, hoje)}</div>
      <div className="space-y-2.5">{porDia[dia].map((v) => <CartaoVisita key={v.id} v={v} role={role} hoje={hoje} />)}</div>
    </div>
  );

  return (
    <div>
      {/* Como funciona, em 3 passos */}
      <ol className="mb-5 grid gap-2 sm:grid-cols-3">
        {ETAPAS[role].map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-xl border border-linha bg-white px-4 py-3 text-sm text-marinho/80">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marinho text-xs font-bold text-white">{i + 1}</span>{t}
          </li>
        ))}
      </ol>

      {/* Resumo + o que precisa de você */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-marinho/70">
        <span><b className="text-marinho">{nHoje}</b> visita{nHoje === 1 ? '' : 's'} hoje</span>
        <span><b className="text-marinho">{nAmanha}</b> amanhã</span>
        <span className="ml-auto text-xs text-marinho/50">Todos os horários são de Brasília</span>
      </div>

      {precisaDeVoce.length > 0 ? (
        <section className="mb-7 rounded-2xl border-2 border-alerta/40 bg-alerta/5 p-4">
          <h2 className="mb-1 text-lg font-bold text-marinho">
            {master ? `${precisaDeVoce.length} visita${precisaDeVoce.length === 1 ? '' : 's'} esperando sua resposta` : `${precisaDeVoce.length} visita${precisaDeVoce.length === 1 ? '' : 's'} com nova data para você responder`}
          </h2>
          <p className="mb-3 text-sm text-marinho/60">Resolva por aqui mesmo: use os botões de cada visita.</p>
          <div className="space-y-2.5">{precisaDeVoce.map((v) => <CartaoVisita key={v.id} v={v} role={role} hoje={hoje} mostrarData destaque />)}</div>
        </section>
      ) : todas.length > 0 ? (
        <div className="mb-7 flex items-center gap-2 rounded-xl border border-sucesso/30 bg-sucesso/10 px-4 py-3 text-sm font-semibold text-sucesso"><Check size={18} /> Tudo respondido. Nada esperando por você.</div>
      ) : null}

      {/* Abas simples + modo de ver */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {abas.map((a) => (
            <button key={a.id} type="button" onClick={() => setAba(a.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${aba === a.id ? 'border-marinho bg-marinho text-white' : 'border-linha bg-white text-marinho/70 hover:border-marinho/40'}`}>
              {a.rotulo} <span className={aba === a.id ? 'text-white/70' : 'text-marinho/40'}>{a.n}</span>
            </button>
          ))}
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-linha text-sm font-semibold">
          {[['lista', 'Lista'], ['mes', 'Calendário']].map(([id, nome]) => (
            <button key={id} type="button" onClick={() => setVista(id)} className={`px-4 py-2 ${vista === id ? 'bg-marinho text-white' : 'bg-white text-marinho/70'}`}>{nome}</button>
          ))}
        </div>
      </div>

      {vista === 'lista' && (
        <div>
          {aba === 'proximas' && precisaDeVoce.length > 0 && (
            <div className="mb-4 text-sm text-marinho/60">As visitas que esperam sua resposta estão no quadro acima. Aqui estão as demais.</div>
          )}
          {diasFuturos.length === 0 && semData.length === 0 && (
            <div className="rounded-xl border border-dashed border-linha bg-white p-8 text-center text-marinho/60">
              <CalendarDays className="mx-auto mb-2 text-marinho/30" size={32} />
              {todas.length === 0 ? (master ? 'Nenhuma visita ainda. Use “+ Agendar visita” para criar a primeira.' : 'Nenhuma visita ainda. Use “+ Solicitar visita” para pedir a primeira.') : 'Nenhuma visita nesta aba.'}
            </div>
          )}
          {diasFuturos.map((d) => <Dia key={d} dia={d} />)}
          {semData.length > 0 && (
            <div className="mb-5"><div className="mb-2 text-sm font-bold text-marinho/70">Sem data definida</div>
              <div className="space-y-2.5">{semData.map((v) => <CartaoVisita key={v.id} v={v} role={role} hoje={hoje} />)}</div></div>
          )}
          {diasPassados.length > 0 && (
            <div className="border-t border-linha pt-3">
              <button type="button" onClick={() => setVerPassadas((x) => !x)} className="text-sm font-semibold text-marinho/60 hover:text-marinho">
                {verPassadas ? 'Esconder visitas que já passaram' : `Ver visitas que já passaram (${diasPassados.reduce((s, d) => s + porDia[d].length, 0)})`}
              </button>
              {verPassadas && <div className="mt-3">{diasPassados.map((d) => <Dia key={d} dia={d} passado />)}</div>}
            </div>
          )}
        </div>
      )}

      {vista === 'mes' && (
        <div className="rounded-xl border border-linha bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Mês anterior" className="rounded-lg border border-linha p-2" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={18} /></button>
            <div className="flex items-center gap-3">
              <b className="text-base">{NOMES_MES[mesIdx]} de {ano}</b>
              {offset !== 0 && <button type="button" onClick={() => { setOffset(0); setDiaSel(chaveHoje); }} className="rounded-full border border-linha px-3 py-1 text-xs font-semibold text-marinho/70">Voltar para hoje</button>}
            </div>
            <button type="button" aria-label="Próximo mês" className="rounded-lg border border-linha p-2" onClick={() => setOffset((o) => o + 1)}><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DIAS_SEM.map((d) => <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase text-marinho/40">{d}</div>)}
            {Array.from({ length: vazios }).map((_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((dia) => {
              const chave = chaveDoDia(dia);
              const doDia = porDia[chave] || [];
              const sel = chave === diaSel;
              return (
                <button key={chave} type="button" onClick={() => setDiaSel(chave)}
                  className={`min-h-[56px] rounded-lg border p-1.5 text-left transition sm:min-h-[84px] ${sel ? 'border-marinho bg-marinho/5' : 'border-linha hover:border-marinho/40'}`}>
                  <div className={`mb-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 text-xs font-semibold ${chave === chaveHoje ? 'bg-verde text-white' : 'text-marinho/60'}`}>{dia}</div>
                  <div className="flex flex-wrap gap-1">
                    {doDia.slice(0, 6).map((v) => <span key={v.id} className={`h-2.5 w-2.5 rounded-full ${COR[situacao(v, role).cor].ponto}`} />)}
                  </div>
                  {doDia.length > 0 && <div className="mt-1 hidden text-[11px] font-semibold text-marinho/60 sm:block">{doDia.length} visita{doDia.length === 1 ? '' : 's'}</div>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-marinho/60">
            {[['alerta', 'Esperando resposta'], ['info', 'Outra data proposta'], ['sucesso', 'Confirmada'], ['erro', 'Cancelada']].map(([c, t]) => (
              <span key={c} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${COR[c].ponto}`} />{t}</span>
            ))}
          </div>
          <div className="mt-4 border-t border-linha pt-4">
            <div className="mb-2 text-sm font-bold text-marinho/70">{rotuloDia(diaSel, hoje)}</div>
            {doDiaSel.length === 0
              ? <div className="rounded-lg border border-dashed border-linha p-5 text-center text-sm text-marinho/50">Nenhuma visita neste dia.</div>
              : <div className="space-y-2.5">{doDiaSel.map((v) => <CartaoVisita key={v.id} v={v} role={role} hoje={hoje} />)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
