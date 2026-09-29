import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'imobiliaria') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const { endereco, tipo, descricao, nome_cliente_final, cpf_cliente_final, cnpj_cliente_final, itens, vistoria_texto_bruto } = await req.json();
  if (!endereco) return NextResponse.json({ error: 'informe o endereço' }, { status: 400 });

  const { data, error } = await supabase.rpc('solicitar_orcamento', {
    p_endereco: endereco,
    p_tipo: tipo || 'rescisao',
    p_descricao: descricao || null,
    p_nome_cliente_final: nome_cliente_final || null,
    p_cpf_cliente_final: cpf_cliente_final || null,
    p_cnpj_cliente_final: cnpj_cliente_final || null,
    p_itens: itens || [],
    p_vistoria_texto: vistoria_texto_bruto || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data });
}

