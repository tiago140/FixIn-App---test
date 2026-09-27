import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

export const runtime = 'nodejs';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente' }, { status: 400 });
  }

  const { descricao, endereco } = await req.json();
  if (!descricao || !descricao.trim()) {
    return NextResponse.json({ error: 'descreva o imóvel/serviço para a IA gerar os itens' }, { status: 400 });
  }

  // "sua base completa": todo o catálogo de referência + itens de orçamentos
  // anteriores de imóveis parecidos, usados como contexto para a IA.
  const { data: catalogo } = await supabase.from('catalogo_itens').select('ambiente, servico, mo_padrao, ma_padrao').order('ambiente');

  const { data: itensHistoricos } = await supabase
    .from('orcamento_itens')
    .select('ambiente, servico, descricao, mo, ma')
    .order('id', { ascending: false })
    .limit(200);

  const baseTexto = JSON.stringify({
    catalogo: catalogo || [],
    itens_ja_usados_antes: (itensHistoricos || []).slice(0, 120),
  });

  const prompt = `Você monta orçamentos de reforma/manutenção residencial para a empresa FixIn Reformas.
Use como referência de preço a base de dados abaixo (catálogo oficial e itens já usados em orçamentos anteriores de imóveis do mesmo padrão). Sempre que um item pedido já existir na base, reaproveite o valor de MO (mão de obra) e MA (material) dela. Quando não existir nada parecido, estime um valor de mercado razoável e coerente com os outros valores da base.

BASE DE DADOS (JSON):
${baseTexto}

ENDEREÇO/IMÓVEL: ${endereco || 'não informado'}
DESCRIÇÃO DO QUE PRECISA SER FEITO: ${descricao}

Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, no formato:
{"itens":[{"ambiente":"...","servico":"...","descricao":"...","mo":100.00,"ma":50.00}]}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: 'erro na API da IA: ' + errText }, { status: 500 });
    }

    const data = await resp.json();
    const textoResposta = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const limpo = textoResposta.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(limpo);
    } catch (e) {
      return NextResponse.json({ error: 'a IA respondeu em um formato inesperado, tente descrever de outro jeito' }, { status: 500 });
    }

    const itens = (parsed.itens || []).map((it) => ({
      ambiente: it.ambiente || 'Geral',
      servico: it.servico || '',
      descricao: it.descricao || '',
      mo: Number(it.mo) || 0,
      ma: Number(it.ma) || 0,
    }));

    return NextResponse.json({ itens });
  } catch (e) {
    return NextResponse.json({ error: 'erro ao consultar a IA: ' + e.message }, { status: 500 });
  }
}
