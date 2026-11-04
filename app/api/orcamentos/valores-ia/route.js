import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { ErroIA, LIMITE_ITENS, normalizarItemEntrada, semPreco, carregarBase, promptPrecos, chamarClaudeDetalhado, extrairJson, aplicarPrecos } from '@/lib/iaOrcamento';
import { separarPrecosSeguroFianca, elevarDemais, AUMENTO_DEMAIS_SEGURO_FIANCA } from '@/lib/precoSeguroFianca';

export const runtime = 'nodejs';
export const maxDuration = 60;

// "Gerar valores com IA": preenche MO e MA dos itens que já estão na tela. Só devolve sugestões
// (id, mo, ma, origem) — quem decide é o dono, que revisa e salva. Nunca grava nada no banco.
export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  let corpo = {};
  try { corpo = await req.json(); } catch (e) {}
  const entrada = Array.isArray(corpo.itens) ? corpo.itens : [];
  if (entrada.length === 0) return NextResponse.json({ error: 'Não há itens no orçamento para precificar.' }, { status: 400 });
  if (entrada.length > LIMITE_ITENS) return NextResponse.json({ error: `São itens demais para uma vez só (máximo ${LIMITE_ITENS}).` }, { status: 400 });

  const itens = entrada.map(normalizarItemEntrada);
  const soSemPreco = corpo.apenas_sem_preco !== false;
  const alvos = soSemPreco ? itens.filter(semPreco) : itens;
  if (alvos.length === 0) return NextResponse.json({ valores: [], preenchidos: 0, ignorados: 0, total_alvos: 0, aviso: 'Todos os itens já têm preço. Desmarque "só os sem preço" para a IA refazer todos.' });

  // SEGURO FIANÇA: pintura de parede/porta/teto e planejado danificado têm preço de tabela (sem IA);
  // os demais itens saem da base/IA com +20%.
  const seguro = corpo.seguro_fianca === true;
  const { fixos, demais } = seguro ? separarPrecosSeguroFianca(alvos) : { fixos: [], demais: alvos };

  try {
    let valores = [];
    let extra = {};
    if (demais.length > 0) {
      const base = await carregarBase(supabase);
      const jaPrecificados = itens.filter((i) => !semPreco(i)).slice(0, 60).map((i) => ({ ambiente: i.ambiente, servico: i.servico, mo: i.mo, ma: i.ma }));
      const prompt = promptPrecos({ base, alvos: demais, jaPrecificados: soSemPreco ? jaPrecificados : [], instrucao: String(corpo.instrucao || '').slice(0, 600), endereco: String(corpo.endereco || '').slice(0, 200) });
      const { texto, cortada } = await chamarClaudeDetalhado({ prompt, maxTokens: 8000 });
      const resposta = extrairJson(texto, { tolerante: true });
      const r = aplicarPrecos(demais, resposta);
      valores = seguro ? elevarDemais(r.valores) : r.valores;
      extra = { ignorados: r.ignorados, sem_resposta: r.sem_resposta, aviso_cortada: cortada ? 'A resposta da IA veio incompleta: rode de novo para os itens restantes (deixe marcado "só os sem preço").' : undefined };
    }
    const origens = { catalogo: 0, historico: 0, estimativa: 0, regra: fixos.length };
    for (const v of valores) origens[v.origem_base || v.origem] = (origens[v.origem_base || v.origem] || 0) + 1;
    const todos = [...fixos, ...valores];
    return NextResponse.json({
      valores: todos, preenchidos: todos.length, total_alvos: alvos.length, origens, ...extra,
      seguro_fianca: seguro ? { tabela: fixos.length, elevados: valores.length, aumento_percentual: Math.round(AUMENTO_DEMAIS_SEGURO_FIANCA * 100) } : undefined,
    });
  } catch (e) {
    if (e instanceof ErroIA) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Não foi possível gerar os valores agora.' }, { status: 500 });
  }
}
