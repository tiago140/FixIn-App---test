import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { ErroIA, LIMITE_ITENS, normalizarItemEntrada, semPreco, carregarBase, promptPrecos, chamarClaude, extrairJson, aplicarPrecos } from '@/lib/iaOrcamento';

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

  try {
    const base = await carregarBase(supabase);
    const jaPrecificados = itens.filter((i) => !semPreco(i)).slice(0, 60).map((i) => ({ ambiente: i.ambiente, servico: i.servico, mo: i.mo, ma: i.ma }));
    const prompt = promptPrecos({ base, alvos, jaPrecificados: soSemPreco ? jaPrecificados : [], instrucao: String(corpo.instrucao || '').slice(0, 600), endereco: String(corpo.endereco || '').slice(0, 200) });
    const resposta = extrairJson(await chamarClaude({ prompt, maxTokens: 4000 }));
    const r = aplicarPrecos(alvos, resposta);
    return NextResponse.json({ ...r, total_alvos: alvos.length });
  } catch (e) {
    if (e instanceof ErroIA) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Não foi possível gerar os valores agora.' }, { status: 500 });
  }
}
