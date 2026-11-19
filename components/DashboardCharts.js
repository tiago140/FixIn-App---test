'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Rosca, BarrasRanking } from '@/components/Graficos';

const CORES_STATUS = {
  pendente: '#B8862E', em_preparacao: '#6C9BB8', enviado: '#3B6B8C', aprovado: '#3F7A5E',
  em_execucao: '#2C5570', finalizado: '#5A6459', rejeitado: '#A63A2D',
};
const CORES = ['#182F50', '#3F7A5E', '#B8862E', '#3B6B8C', '#A63A2D', '#5A6459', '#6C9BB8', '#253728'];

export function GraficoPizzaStatus({ dados }) {
  const lista = (dados || []).filter((d) => d.value > 0).map((d, i) => ({ nome: d.name, valor: d.value, cor: CORES_STATUS[d.key] || CORES[i % CORES.length] }));
  const total = lista.reduce((a, d) => a + d.valor, 0);
  return <Rosca dados={lista} formato="num" centroTitulo="orçamentos" centroValor={String(total)} />;
}

export function GraficoBarrasClientes({ dados }) {
  return <BarrasRanking dados={(dados || []).map((d) => ({ nome: d.nome, valor: d.valor }))} />;
}

export function GraficoBarrasAprovadoReprovado({ dados }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ECEDE6" vertical={false} />
        <XAxis dataKey="tipo" tick={{ fontSize: 12, fill: '#5A6459' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8A9088' }} axisLine={false} tickLine={false} width={46} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : v)} />
        <Tooltip formatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} cursor={{ fill: 'rgba(24,47,80,.05)' }} contentStyle={{ borderRadius: 10, border: '1px solid #E4E6DF', fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Aprovado" fill="#3F7A5E" radius={[6, 6, 0, 0]} maxBarSize={44} />
        <Bar dataKey="Reprovado" fill="#A63A2D" radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}
