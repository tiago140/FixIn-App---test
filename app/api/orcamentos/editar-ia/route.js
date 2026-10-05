import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { ErroIA, LIMITE_ITENS, normalizarItemEntrada, carregarBase, promptEdicao, chamarClaude, extrairJson, aplicarEdicao } from '@/lib/iaOrcamento';

export const runtime = 'nodejs';
export const maxDuration = 60;

// "Editar com IA": o dono escreve o que quer mudar ("troque o piso do banheiro por porcelanato", "tire a fachada").
// A IA devolve só um "remendo"; a mudança é aplicada aqui, de forma controlada, e o resultado volta para a tela
// ainda sem salvar (com botão Desfazer). Nada é gravado no banco por esta rota.
export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });

  let corpo = {};
  try { corpo = await req.json(); } catch (e) {}
  const instrucao = String(corpo.instrucao || '').trim().slice(0, 800);
  if (!instrucao) return NextResponse.json({ error: 'Escreva o que você quer mudar nos itens.' }, { status: 400 });
  const entrada = Array.isArray(corpo.itens) ? corpo.itens : [];
  if (entrada.length > LIMITE_ITENS) return NextResponse.json({ error: `São itens demais para uma vez só (máximo ${LIMITE_ITENS}).` }, { status: 400 });

  const itens = entrada.map(normalizarItemEntrada);
  try {
    const base = await carregarBase(supabase);
    const prompt = promptEdicao({ base, itens, instrucao, endereco: String(corpo.endereco || '').slice(0, 200) });
    const patch = extrairJson(await chamarClaude({ prompt, maxTokens: 4000 }));
    // aplica sobre os itens ORIGINAIS (com todos os campos que a tela mandou), não sobre a versão resumida
    const originais = entrada.map((it, i) => ({ ...it, id: itens[i].id }));
    return NextResponse.json(aplicarEdicao(originais, patch));
  } catch (e) {
    if (e instanceof ErroIA) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Não foi possível editar com a IA agora.' }, { status: 500 });
  }
}
