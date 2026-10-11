import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { ErroIA, LIMITE_ITENS, normalizarItemEntrada, carregarBase, promptEdicao, chamarClaudeDetalhado, extrairJson, aplicarEdicao, redistribuirTotal } from '@/lib/iaOrcamento';

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

  const margem = Number(corpo.margem) || 0;
  const itens = entrada.map(normalizarItemEntrada);
  try {
    const base = await carregarBase(supabase);
    const prompt = promptEdicao({ base, itens, instrucao, endereco: String(corpo.endereco || '').slice(0, 200), margem });
    const { texto, cortada } = await chamarClaudeDetalhado({ prompt, maxTokens: 8000 });
    const patch = extrairJson(texto, { tolerante: true });
    // aplica sobre os itens ORIGINAIS (com todos os campos que a tela mandou), não sobre a versão resumida
    const originais = entrada.map((it, i) => ({ ...it, id: itens[i].id }));
    // pedido de "fechar num valor total": a IA só dá os pesos; a conta exata é feita aqui
    if (patch?.redistribuir && typeof patch.redistribuir === 'object') return NextResponse.json(redistribuirTotal(originais, patch.redistribuir, margem));
    const resultado = aplicarEdicao(originais, patch);
    if (cortada) resultado.aviso = 'A resposta da IA era grande e veio incompleta: apliquei só o que veio completo. Se faltou algo, peça de novo o que ficou de fora.';
    return NextResponse.json(resultado);
  } catch (e) {
    if (e instanceof ErroIA) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Não foi possível editar com a IA agora.' }, { status: 500 });
  }
}
