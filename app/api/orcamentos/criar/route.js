import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const body = await req.json();
  const {
    cliente_id,
    endereco,
    tipo,
    validade_dias,
    prazo_execucao_dias,
    garantia,
    forma_pagamento,
    nome_cliente_final,
    cpf_cliente_final,
    cnpj_cliente_final,
    margem_percentual,
    vistoria_texto_bruto,
    itens,
  } = body;

  if (!cliente_id || !endereco) {
    return NextResponse.json({ error: 'selecione a imobiliária e informe o endereço' }, { status: 400 });
  }
  if ((!itens || itens.length === 0) && tipo !== 'manutencao') {
    return NextResponse.json({ error: 'adicione pelo menos um item ao orçamento' }, { status: 400 });
  }

  const { data: orcamento, error: erroOrc } = await supabase
    .from('orcamentos')
    .insert({
      cliente_id,
      endereco,
      tipo: tipo === 'manutencao' ? 'manutencao' : 'rescisao',
      validade_dias: validade_dias || 30,
      prazo_execucao_dias: prazo_execucao_dias || null,
      garantia: garantia || null,
      forma_pagamento: forma_pagamento || 'Pix ou Transferência: à vista',
      nome_cliente_final: nome_cliente_final || null,
      cpf_cliente_final: cpf_cliente_final || null,
      cnpj_cliente_final: cnpj_cliente_final || null,
      margem_percentual: margem_percentual || 0,
      vistoria_texto_bruto: vistoria_texto_bruto || null,
      status: 'pendente',
      criado_por: user.id,
    })
    .select()
    .single();

  if (erroOrc) {
    return NextResponse.json({ error: erroOrc.message }, { status: 400 });
  }

  if (itens && itens.length > 0) {
    const itensParaInserir = itens.map((it, i) => ({
      orcamento_id: orcamento.id,
      ambiente: it.ambiente,
      servico: it.servico,
      descricao: it.descricao || '',
      mo: Number(it.mo) || 0,
      ma: Number(it.ma) || 0,
      ordem: i,
    }));

    const { error: erroItens } = await supabase.from('orcamento_itens').insert(itensParaInserir);

    if (erroItens) {
      await supabase.from('orcamentos').delete().eq('id', orcamento.id);
      return NextResponse.json({ error: erroItens.message }, { status: 400 });
    }
  }

  return NextResponse.json({ orcamento });
}
