// DRE gerencial: monta as linhas a partir dos lançamentos (contas a receber e a pagar).
// regime 'caixa'   = o que realmente entrou e saiu (valor pago, no mês do pagamento)
// regime 'previsto' = tudo que está lançado (valor total, no mês do vencimento)
export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CUSTO = ['Prestadores', 'Material'];
const IMPOSTOS = ['Impostos e taxas'];
const OUTRAS_REC = ['Reembolso', 'Outras receitas'];

function mesDe(l, regime, ano) {
  const d = regime === 'caixa' ? (l.data_pagamento || l.vencimento) : l.vencimento;
  if (!d || Number(d.slice(0, 4)) !== ano) return -1;
  return Number(d.slice(5, 7)) - 1;
}

export function montarDre(lancs, ano, regime) {
  const z = () => Array(12).fill(0);
  const L = { servicos: z(), outrasRec: z(), impostos: z(), prestadores: z(), material: z(), software: z(), pessoal: z(), outrasDesp: z() };
  for (const l of lancs) {
    if (l.status === 'cancelado') continue;
    const v = regime === 'caixa' ? Number(l.valor_pago || 0) : Number(l.valor || 0);
    if (!(v > 0)) continue;
    const m = mesDe(l, regime, ano);
    if (m < 0) continue;
    if (l.tipo === 'receber') {
      if (OUTRAS_REC.includes(l.categoria)) L.outrasRec[m] += v; else L.servicos[m] += v;
    } else if (l.categoria === 'Prestadores') L.prestadores[m] += v;
    else if (l.categoria === 'Material') L.material[m] += v;
    else if (IMPOSTOS.includes(l.categoria)) L.impostos[m] += v;
    else if (l.categoria === 'Software e sistemas') L.software[m] += v;
    else if (l.categoria === 'Pessoal') L.pessoal[m] += v;
    else L.outrasDesp[m] += v;
  }
  const soma = (...a) => z().map((_, i) => a.reduce((s, x) => s + x[i], 0));
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const receitaBruta = soma(L.servicos, L.outrasRec);
  const receitaLiquida = sub(receitaBruta, L.impostos);
  const custos = soma(L.prestadores, L.material);
  const margem = sub(receitaLiquida, custos);
  const despesas = soma(L.software, L.pessoal, L.outrasDesp);
  const resultado = sub(margem, despesas);
  return { L, receitaBruta, receitaLiquida, custos, margem, despesas, resultado };
}

export const totalAno = (arr) => arr.reduce((a, b) => a + b, 0);
