'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const CORES_STATUS = {
  pendente: '#B8862E',
  em_preparacao: '#6C9BB8',
  enviado: '#3B6B8C',
  aprovado: '#3F7A5E',
  em_execucao: '#2C5570',
  finalizado: '#5A6459',
  rejeitado: '#A63A2D',
};

const CORES_BARRA = ['#182F50', '#253728', '#B8862E', '#3B6B8C', '#A63A2D', '#3F7A5E', '#5A6459', '#6C9BB8'];

export function GraficoPizzaStatus({ dados }) {
  const dadosFiltrados = dados.filter((d) => d.value > 0);
  if (dadosFiltrados.length === 0) {
    return <div className="text-sm text-marinho/40 flex items-center justify-center h-full">Sem dados ainda</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={dadosFiltrados} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name} (${e.value})`}>
          {dadosFiltrados.map((entry, i) => (
            <Cell key={i} fill={CORES_STATUS[entry.key] || CORES_BARRA[i % CORES_BARRA.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarrasClientes({ dados }) {
  if (!dados || dados.length === 0) {
    return <div className="text-sm text-marinho/40 flex items-center justify-center h-full">Sem dados ainda</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#DADCD3" />
        <XAxis dataKey="nome" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
          {dados.map((_, i) => (
            <Cell key={i} fill={CORES_BARRA[i % CORES_BARRA.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarrasAprovadoReprovado({ dados }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#DADCD3" />
        <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
        <Legend />
        <Bar dataKey="Aprovado" fill="#3F7A5E" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Reprovado" fill="#A63A2D" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
