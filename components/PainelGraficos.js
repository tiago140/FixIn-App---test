'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ComposedChart, Line, Legend,
} from 'recharts';
import { fmtBRL } from '@/lib/format';
import { CORES_ETAPAS, ROTULOS_ETAPAS } from '@/lib/painel';

const reaisCompacto = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function PainelGraficos({ etapas, meses, papel = 'master' }) {
  const rotulos = ROTULOS_ETAPAS[papel] || ROTULOS_ETAPAS.master;
  const totalQtd = etapas.reduce((a, e) => a + e.qtd, 0);

  const dados = etapas.map((e, i) => ({ nome: rotulos[i], qtd: e.qtd, valor: e.valor, cor: CORES_ETAPAS[i] }));
  const titulos = {
    valor: papel === 'imobiliaria' ? 'Valor (R$) em cada etapa' : 'Valor (R$) parado em cada etapa',
    tendencia: papel === 'imobiliaria' ? 'Seus orçamentos nos últimos 6 meses' : 'Orçamentos criados nos últimos 6 meses',
  };

  return (
    <div className="mb-6">
      <div className="grid xl:grid-cols-2 gap-5 mb-5">
        <div className="card p-6 rounded-md">
          <h3 className="text-base font-semibold mb-3">Onde estão seus orçamentos agora</h3>
          <div className="flex flex-col gap-1 mb-2">
            {dados.filter((d) => d.qtd > 0).map((d) => (
              <span key={d.nome} className="flex items-center gap-1.5 text-sm text-marinho/70">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.cor }} />
                {d.nome} — {d.qtd} ({totalQtd ? Math.round((d.qtd / totalQtd) * 100) : 0}%) · {fmtBRL(d.valor)}
              </span>
            ))}
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dados} dataKey="qtd" nameKey="nome" innerRadius="50%" outerRadius="90%" paddingAngle={1} stroke="#fff">
                  {dados.map((d) => <Cell key={d.nome} fill={d.cor} />)}
                </Pie>
                <Tooltip formatter={(v, n, p) => [`${v} orçamento(s) · ${fmtBRL(p.payload.valor)}`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 rounded-md">
          <h3 className="text-base font-semibold mb-3">{titulos.valor}</h3>
          <div style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DADCD3" horizontal={false} />
                <XAxis type="number" tickFormatter={reaisCompacto} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nome" width={132} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [fmtBRL(v), 'Valor']} cursor={{ fill: 'rgba(24,47,80,.05)' }} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {dados.map((d) => <Cell key={d.nome} fill={d.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-6 rounded-md">
        <h3 className="text-base font-semibold mb-3">{titulos.tendencia}</h3>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={meses} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DADCD3" />
              <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="qtd" allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
              <YAxis yAxisId="valor" orientation="right" tickFormatter={reaisCompacto} tick={{ fontSize: 10 }} width={72} />
              <Tooltip formatter={(v, n) => (n === 'Valor (R$)' ? [fmtBRL(v), n] : [`${v} orçamento(s)`, n])} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="qtd" dataKey="qtd" name="Quantidade" fill="#3B6B8C" radius={[4, 4, 0, 0]} />
              <Line yAxisId="valor" type="monotone" dataKey="valor" name="Valor (R$)" stroke="#182F50" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
