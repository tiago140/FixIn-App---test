'use client';

import { useState } from 'react';
import { fmtDataHora } from '@/lib/format';

const STATUS_COR = { pendente: 'bg-alerta', confirmada: 'bg-sucesso', cancelada: 'bg-erro', sugerida: 'bg-info' };
const NOMES_MES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function CalendarioVisitas({ visitas }) {
  const base = new Date();

  // abre direto no mês da próxima visita (confirmada ou pendente) mais próxima de hoje,
  // em vez de sempre abrir no mês atual — assim uma visita aprovada pra outro mês já aparece.
  function offsetInicial() {
    const futuras = (visitas || [])
      .filter((v) => v.data_hora && v.status !== 'cancelada')
      .map((v) => new Date(v.data_hora))
      .filter((d) => d >= new Date(base.getFullYear(), base.getMonth(), 1))
      .sort((a, b) => a - b);
    if (!futuras.length) return 0;
    const alvo = futuras[0];
    return (alvo.getFullYear() - base.getFullYear()) * 12 + (alvo.getMonth() - base.getMonth());
  }

  const [offset, setOffset] = useState(offsetInicial);
  const mesRef = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const ano = mesRef.getFullYear();
  const mesIdx = mesRef.getMonth();
  const primeiroDiaSemana = new Date(ano, mesIdx, 1).getDay();
  const diasNoMes = new Date(ano, mesIdx + 1, 0).getDate();

  const porDia = {};
  (visitas || []).forEach((v) => {
    if (!v.data_hora) return;
    const d = new Date(v.data_hora);
    if (d.getFullYear() === ano && d.getMonth() === mesIdx) {
      (porDia[d.getDate()] = porDia[d.getDate()] || []).push(v);
    }
  });

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(dia);

  return (
    <div className="card p-4 mb-6">
      <div className="flex justify-between items-center mb-3">
        <button type="button" className="border border-linha rounded px-2 py-1" onClick={() => setOffset((o) => o - 1)}>‹</button>
        <b className="text-sm">{NOMES_MES[mesIdx]} de {ano}</b>
        <button type="button" className="border border-linha rounded px-2 py-1" onClick={() => setOffset((o) => o + 1)}>›</button>
      </div>
      <div className="cal-grid">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="cal-head">{d}</div>
        ))}
        {celulas.map((dia, i) =>
          dia === null ? (
            <div key={i} className="cal-cell empty" />
          ) : (
            <div key={i} className="cal-cell">
              <div className="cal-num">{dia}</div>
              {(porDia[dia] || []).map((v) => (
                <div key={v.id} className={`cal-pill ${STATUS_COR[v.status] || 'bg-marinho'}`} title={`${v.endereco} — ${v.status}`}>
                  {fmtDataHora(v.data_hora).split(' ')[1]}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
