'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCurto = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')} mi`;
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)} mil`;
  return String(Math.round(n));
};
// Para o centro da rosca: só o número, sem "R$" (o rótulo de cima já diz), para caber dentro do círculo.
const numCentro = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')} mi`;
  if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')} mil`;
  return Math.round(n).toLocaleString('pt-BR');
};
const dica = { borderRadius: 10, border: '1px solid #E4E6DF', boxShadow: '0 4px 14px rgba(24,47,80,.12)', fontSize: 12 };

// Rosca com o total no meio e legenda ao lado (some a legenda no celular, o total continua).
// dados: [{ nome, valor, cor }]; formato: 'brl' | 'num'
export function Rosca({ dados, centroTitulo, centroValor, formato = 'brl', altura = 220, vertical = false }) {
  const lista = (dados || []).filter((d) => Number(d.valor) > 0);
  const fmt = formato === 'brl' ? brl : (v) => String(v);
  const total = lista.reduce((a, d) => a + Number(d.valor), 0);
  if (!lista.length) return <div className="text-sm text-marinho/40 flex items-center justify-center" style={{ height: altura }}>Sem dados ainda</div>;
  return (
    <div className={`flex items-center gap-4 ${vertical ? 'flex-col' : 'flex-wrap sm:flex-nowrap'}`}>
      <div className="relative flex-shrink-0 mx-auto" style={{ width: altura, height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={lista} dataKey="valor" nameKey="nome" innerRadius="68%" outerRadius="94%" paddingAngle={lista.length > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270}>
              {lista.map((d, i) => <Cell key={i} fill={d.cor} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={dica} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-[18%]">
          <span className="text-[10px] text-marinho/50 leading-tight">{centroTitulo}{formato === 'brl' ? ' (R$)' : ''}</span>
          <span className="font-bold text-marinho leading-tight" style={{ fontSize: '1.1rem' }}>{centroValor ?? (formato === 'brl' ? numCentro(total) : fmt(total))}</span>
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-1.5 w-full">
        {lista.map((d) => (
          <li key={d.nome} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.cor }} />
            <span className="flex-1 text-marinho/80 truncate">{d.nome}</span>
            <span className="font-semibold text-marinho whitespace-nowrap">{fmt(d.valor)}</span>
            <span className="text-[11px] text-marinho/40 w-9 text-right">{Math.round((d.valor / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Barras agrupadas por mês: séries = [{ chave, nome, cor }], dados = [{ mes, [chave]: valor }]
export function BarrasMensais({ dados, series, altura = 240 }) {
  if (!dados || !dados.some((d) => series.some((s) => Number(d[s.chave]) > 0))) {
    return <div className="text-sm text-marinho/40 flex items-center justify-center" style={{ height: altura }}>Sem movimento nos últimos meses</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ECEDE6" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#5A6459' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8A9088' }} axisLine={false} tickLine={false} tickFormatter={brlCurto} width={56} />
        <Tooltip formatter={(v, n) => [brl(v), n]} cursor={{ fill: 'rgba(24,47,80,.05)' }} contentStyle={dica} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[6, 6, 0, 0]} maxBarSize={34} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Ranking em barras horizontais (nome comprido cabe, sem girar o texto)
export function BarrasRanking({ dados, cor = '#182F50', formato = 'brl' }) {
  if (!dados || !dados.length) return <div className="text-sm text-marinho/40 flex items-center justify-center h-40">Sem dados ainda</div>;
  const altura = Math.max(150, dados.length * 38 + 20);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ECEDE6" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#8A9088' }} axisLine={false} tickLine={false} tickFormatter={formato === 'brl' ? brlCurto : undefined} />
        <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 12, fill: '#182F50' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => (formato === 'brl' ? brl(v) : v)} cursor={{ fill: 'rgba(24,47,80,.05)' }} contentStyle={dica} />
        <Bar dataKey="valor" fill={cor} radius={[0, 6, 6, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
