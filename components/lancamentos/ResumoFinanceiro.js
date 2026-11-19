import { Rosca, BarrasMensais } from '@/components/Graficos';
import { emAberto, saldoAberto, vencido } from '@/lib/lancamentos';
import { MESES } from '@/lib/dre';
import { fmtBRL } from '@/lib/format';

// Gráficos do topo do Financeiro: para onde vai o dinheiro (distribuição) e o movimento dos últimos 6 meses.
export default function ResumoFinanceiro({ lancamentos, hoje }) {
  const ls = (lancamentos || []).filter((l) => l.status !== 'cancelado');
  const soma = (arr, f) => arr.reduce((a, l) => a + f(l), 0);

  const rec = ls.filter((l) => l.tipo === 'receber');
  const pag = ls.filter((l) => l.tipo === 'pagar');
  const recebido = soma(rec, (l) => Number(l.valor_pago || 0));
  const recAtraso = soma(rec.filter((l) => vencido(l, hoje)), saldoAberto);
  const recEmDia = soma(rec.filter((l) => emAberto(l) && !vencido(l, hoje)), saldoAberto);
  const pago = soma(pag, (l) => Number(l.valor_pago || 0));
  const pagAtraso = soma(pag.filter((l) => vencido(l, hoje)), saldoAberto);
  const pagEmDia = soma(pag.filter((l) => emAberto(l) && !vencido(l, hoje)), saldoAberto);

  // últimos 6 meses (caixa): entrou = valor pago dos a receber, saiu = valor pago dos a pagar, no mês do pagamento
  const [ano, mes] = hoje.split('-').map(Number);
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(ano, mes - 1 - (5 - i), 1));
    return { chave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, mes: MESES[d.getUTCMonth()], Entrou: 0, Saiu: 0 };
  });
  for (const l of ls) {
    const v = Number(l.valor_pago || 0);
    if (!(v > 0)) continue;
    const m = meses.find((x) => x.chave === (l.data_pagamento || l.vencimento || '').slice(0, 7));
    if (!m) continue;
    if (l.tipo === 'receber') m.Entrou += v; else m.Saiu += v;
  }

  return (
    <div className="grid xl:grid-cols-3 gap-4 mb-6">
      <div className="card rounded-xl p-5">
        <h3 className="font-semibold text-marinho mb-0.5">A receber: distribuição</h3>
        <p className="text-xs text-marinho/50 mb-3">Quanto já caiu, o que está em dia e o que está atrasado</p>
        <Rosca vertical altura={170} centroTitulo="total" dados={[
          { nome: 'Já caiu', valor: recebido, cor: '#3F7A5E' },
          { nome: 'A receber em dia', valor: recEmDia, cor: '#3B6B8C' },
          { nome: 'Atrasado', valor: recAtraso, cor: '#C0392B' },
        ]} />
      </div>
      <div className="card rounded-xl p-5">
        <h3 className="font-semibold text-marinho mb-0.5">A pagar: distribuição</h3>
        <p className="text-xs text-marinho/50 mb-3">Prestadores e despesas: pago, a pagar e atrasado</p>
        <Rosca vertical altura={170} centroTitulo="total" dados={[
          { nome: 'Já pago', valor: pago, cor: '#3F7A5E' },
          { nome: 'A pagar em dia', valor: pagEmDia, cor: '#B8862E' },
          { nome: 'Atrasado', valor: pagAtraso, cor: '#C0392B' },
        ]} />
      </div>
      <div className="card rounded-xl p-5">
        <h3 className="font-semibold text-marinho mb-0.5">Entrou x saiu</h3>
        <p className="text-xs text-marinho/50 mb-3">Últimos 6 meses, pelo dia do pagamento · saldo {fmtBRL(meses.reduce((a, m) => a + m.Entrou - m.Saiu, 0))}</p>
        <BarrasMensais altura={190} dados={meses} series={[{ chave: 'Entrou', nome: 'Entrou', cor: '#3F7A5E' }, { chave: 'Saiu', nome: 'Saiu', cor: '#B8862E' }]} />
      </div>
    </div>
  );
}
