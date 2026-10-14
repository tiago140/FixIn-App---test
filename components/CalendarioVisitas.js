'use client';

import { useMemo, useState } from 'react';
import { chaveDia, fmtHoraSP, hojeSP, partesSP } from '@/lib/fuso';

// Todas as datas e horas aqui são de Brasília (lib/fuso), iguais no servidor e no navegador.

const STATUS = {
  pendente: { rotulo: 'Aguardando', ponto: 'bg-alerta', borda: 'border-l-alerta', chip: 'bg-alerta/15 text-alerta', pill: 'bg-alerta/15 text-alerta' },
  confirmada: { rotulo: 'Confirmada', ponto: 'bg-sucesso', borda: 'border-l-sucesso', chip: 'bg-sucesso/15 text-sucesso', pill: 'bg-sucesso/15 text-sucesso' },
  sugerida: { rotulo: 'Nova data sugerida', ponto: 'bg-info', borda: 'border-l-info', chip: 'bg-info/15 text-info', pill: 'bg-info/15 text-info' },
  cancelada: { rotulo: 'Cancelada', ponto: 'bg-erro', borda: 'border-l-erro', chip: 'bg-erro/10 text-erro', pill: 'bg-erro/10 text-erro line-through' },
};
const FILTROS = [
  { id: 'ativas', rotulo: 'Em aberto', aceita: (s) => s !== 'cancelada' },
  { id: 'pendente', rotulo: 'Aguardando', aceita: (s) => s === 'pendente' },
  { id: 'confirmada', rotulo: 'Confirmadas', aceita: (s) => s === 'confirmada' },
  { id: 'sugerida', rotulo: 'Nova data', aceita: (s) => s === 'sugerida' },
  { id: 'cancelada', rotulo: 'Canceladas', aceita: (s) => s === 'cancelada' },
];
const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const dois = (n) => String(n).padStart(2, '0');

function rotuloDia(chave, hoje) {
  const [a, m, d] = chave.split('-').map(Number);
  const alvo = Date.UTC(a, m - 1, d);
  const ref = Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia);
  const dif = Math.round((alvo - ref) / 86400000);
  const sem = DIAS_SEM[new Date(alvo).getUTCDay()];
  const data = `${dois(d)}/${dois(m)}`;
  if (dif === 0) return `Hoje · ${sem}, ${data}`;
  if (dif === 1) return `Amanhã · ${sem}, ${data}`;
  if (dif === -1) return `Ontem · ${sem}, ${data}`;
  return `${sem}, ${data}`;
}

function ItemVisita({ v }) {
  const st = STATUS[v.status] || STATUS.pendente;
  const hora = v.data_hora ? fmtHoraSP(v.data_hora) : '—';
  const quem = [v.clientes?.nome_empresa, v.prestadores?.nome ? `Prestador: ${v.prestadores.nome}` : null].filter(Boolean).join(' · ');
  return (
    <div className={`flex items-start gap-3 rounded-lg border border-linha border-l-4 ${st.borda} bg-white p-3`}>
      <div className="w-14 shrink-0 text-lg font-semibold leading-tight text-marinho">{hora}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-snug text-marinho">{v.endereco}</div>
        {quem && <div className="mt-0.5 text-xs text-marinho/60">{quem}</div>}
        {v.status === 'sugerida' && v.data_hora_sugerida && (
          <div className="mt-0.5 text-xs font-medium text-info">Nova data: {dois(partesSP(v.data_hora_sugerida).dia)}/{dois(partesSP(v.data_hora_sugerida).mes)} às {fmtHoraSP(v.data_hora_sugerida)}</div>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.chip}`}>{st.rotulo}</span>
    </div>
  );
}

export default function CalendarioVisitas({ visitas }) {
  const hoje = hojeSP();
  const chaveHoje = `${hoje.ano}-${dois(hoje.mes)}-${dois(hoje.dia)}`;
  const [vista, setVista] = useState('agenda');
  const [filtro, setFiltro] = useState('ativas');
  const [offset, setOffset] = useState(0);
  const [diaSel, setDiaSel] = useState(chaveHoje);
  const [verPassadas, setVerPassadas] = useState(false);

  const todas = visitas || [];
  const contagem = useMemo(() => {
    const c = {};
    FILTROS.forEach((f) => { c[f.id] = todas.filter((v) => f.aceita(v.status)).length; });
    return c;
  }, [todas]);

  const aceita = (FILTROS.find((f) => f.id === filtro) || FILTROS[0]).aceita;
  const lista = useMemo(
    () => todas.filter((v) => aceita(v.status)).map((v) => ({ v, dia: v.data_hora ? chaveDia(v.data_hora) : '' }))
      .sort((a, b) => String(a.v.data_hora || '9').localeCompare(String(b.v.data_hora || '9'))),
    [todas, filtro] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const porDia = useMemo(() => {
    const m = {};
    lista.forEach(({ v, dia }) => { if (dia) (m[dia] = m[dia] || []).push(v); });
    return m;
  }, [lista]);

  // ---------- Agenda: dia a dia, a partir de hoje ----------
  const proximos = Object.keys(porDia).filter((d) => d >= chaveHoje).sort();
  const passados = Object.keys(porDia).filter((d) => d < chaveHoje).sort().reverse();
  const semData = lista.filter(({ dia }) => !dia).map(({ v }) => v);

  function BlocoDia({ dia }) {
    return (
      <div className="mb-4">
        <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${dia === chaveHoje ? 'text-verde' : 'text-marinho/50'}`}>{rotuloDia(dia, hoje)}</div>
        <div className="space-y-2">{porDia[dia].map((v) => <ItemVisita key={v.id} v={v} />)}</div>
      </div>
    );
  }

  // ---------- Mês ----------
  const mesBase = hoje.mes - 1 + offset;
  const ano = hoje.ano + Math.floor(mesBase / 12);
  const mesIdx = ((mesBase % 12) + 12) % 12;
  const primeiroDiaSemana = new Date(Date.UTC(ano, mesIdx, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mesIdx + 1, 0)).getUTCDate();
  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);
  const chaveDoDia = (d) => `${ano}-${dois(mesIdx + 1)}-${dois(d)}`;
  const selecionadas = porDia[diaSel] || [];

  function irParaHoje() { setOffset(0); setDiaSel(chaveHoje); }

  return (
    <div className="card mb-6 p-4">
      {/* Filtros por situação + troca de vista */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => {
            const ativo = filtro === f.id;
            return (
              <button key={f.id} type="button" onClick={() => setFiltro(f.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${ativo ? 'border-marinho bg-marinho text-white' : 'border-linha bg-white text-marinho/70 hover:border-marinho/40'}`}>
                {f.rotulo} <span className={ativo ? 'text-white/70' : 'text-marinho/40'}>{contagem[f.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-linha text-xs font-semibold">
          {[['agenda', 'Agenda'], ['mes', 'Mês']].map(([id, nome]) => (
            <button key={id} type="button" onClick={() => setVista(id)}
              className={`px-4 py-1.5 ${vista === id ? 'bg-marinho text-white' : 'bg-white text-marinho/70'}`}>{nome}</button>
          ))}
        </div>
      </div>

      {vista === 'agenda' && (
        <div>
          {proximos.length === 0 && semData.length === 0 && (
            <div className="rounded-lg border border-dashed border-linha p-8 text-center text-sm text-marinho/50">Nenhuma visita pela frente com este filtro.</div>
          )}
          {proximos.map((d) => <BlocoDia key={d} dia={d} />)}
          {semData.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-marinho/50">Sem data definida</div>
              <div className="space-y-2">{semData.map((v) => <ItemVisita key={v.id} v={v} />)}</div>
            </div>
          )}
          {passados.length > 0 && (
            <div className="mt-2 border-t border-linha pt-3">
              <button type="button" onClick={() => setVerPassadas((x) => !x)} className="text-xs font-semibold text-marinho/60 hover:text-marinho">
                {verPassadas ? 'Esconder visitas passadas' : `Ver visitas passadas (${passados.reduce((s, d) => s + porDia[d].length, 0)})`}
              </button>
              {verPassadas && <div className="mt-3 opacity-80">{passados.map((d) => <BlocoDia key={d} dia={d} />)}</div>}
            </div>
          )}
        </div>
      )}

      {vista === 'mes' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Mês anterior" className="rounded border border-linha px-3 py-1 text-sm" onClick={() => setOffset((o) => o - 1)}>‹</button>
            <div className="flex items-center gap-3">
              <b className="text-sm">{NOMES_MES[mesIdx]} de {ano}</b>
              {offset !== 0 && <button type="button" onClick={irParaHoje} className="rounded-full border border-linha px-3 py-1 text-xs font-semibold text-marinho/70">Hoje</button>}
            </div>
            <button type="button" aria-label="Próximo mês" className="rounded border border-linha px-3 py-1 text-sm" onClick={() => setOffset((o) => o + 1)}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DIAS_SEM.map((d) => <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase text-marinho/40">{d}</div>)}
            {celulas.map((dia, i) => {
              if (dia === null) return <div key={`v${i}`} />;
              const chave = chaveDoDia(dia);
              const doDia = porDia[chave] || [];
              const ehHoje = chave === chaveHoje;
              const sel = chave === diaSel;
              return (
                <button key={chave} type="button" onClick={() => setDiaSel(chave)}
                  className={`min-h-[64px] rounded-lg border p-1.5 text-left align-top transition sm:min-h-[92px] ${sel ? 'border-marinho bg-marinho/5' : 'border-linha bg-white hover:border-marinho/40'}`}>
                  <div className={`mb-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 text-xs font-semibold ${ehHoje ? 'bg-verde text-white' : 'text-marinho/60'}`}>{dia}</div>
                  {/* celular: só pontinhos coloridos; telas maiores: horário + endereço */}
                  <div className="flex flex-wrap gap-1 sm:hidden">
                    {doDia.slice(0, 4).map((v) => <span key={v.id} className={`h-2 w-2 rounded-full ${(STATUS[v.status] || STATUS.pendente).ponto}`} />)}
                  </div>
                  <div className="hidden space-y-1 sm:block">
                    {doDia.slice(0, 2).map((v) => (
                      <div key={v.id} className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${(STATUS[v.status] || STATUS.pendente).pill}`}>
                        {fmtHoraSP(v.data_hora)} {v.endereco}
                      </div>
                    ))}
                    {doDia.length > 2 && <div className="px-1 text-[11px] font-semibold text-marinho/50">+{doDia.length - 2} mais</div>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-linha pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-marinho/50">{rotuloDia(diaSel, hoje)}</div>
            {selecionadas.length === 0
              ? <div className="rounded-lg border border-dashed border-linha p-5 text-center text-sm text-marinho/50">Nenhuma visita neste dia.</div>
              : <div className="space-y-2">{selecionadas.map((v) => <ItemVisita key={v.id} v={v} />)}</div>}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-linha pt-3 text-[11px] text-marinho/60">
        {['pendente', 'confirmada', 'sugerida', 'cancelada'].map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${STATUS[s].ponto}`} />{STATUS[s].rotulo}</span>
        ))}
        <span className="ml-auto">Horário de Brasília</span>
      </div>
    </div>
  );
}
