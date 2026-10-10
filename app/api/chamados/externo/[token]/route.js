import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken, comLinksTemporarios, STATUS_CHAMADO } from '@/lib/chamados';
import { calcularTotalComMargem } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Acompanhamento PÚBLICO por link único: devolve só este chamado (nunca de outras pessoas).
export async function GET(req, { params }) {
  const token = params.token;
  if (!token || token.length < 20 || token.length > 100) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });
  const admin = createAdminClient();
  const { data: ch } = await admin.from('chamados').select('*, clientes(nome_empresa)').eq('token_hash', hashToken(token)).maybeSingle();
  if (!ch) return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });

  const { data: msgs } = await admin.from('chamado_mensagens').select('*').eq('chamado_id', ch.id).order('criado_em');
  const mensagens = await comLinksTemporarios(admin, msgs);

  let orcamento = null;
  if (ch.orcamento_id) {
    const { data: o } = await admin.from('orcamentos').select('numero, status, margem_percentual, validade_dias, forma_pagamento, orcamento_itens(ambiente, servico, descricao, mo, ma)').eq('id', ch.orcamento_id).maybeSingle();
    if (o && ['enviado', 'aprovado', 'em_execucao', 'finalizado', 'rejeitado'].includes(o.status)) {
      const itens = (o.orcamento_itens || []).map((it) => ({ ambiente: it.ambiente, servico: it.servico, descricao: it.descricao }));
      orcamento = {
        numero: o.numero, status: o.status, validade_dias: o.validade_dias, forma_pagamento: o.forma_pagamento, itens,
        total: calcularTotalComMargem(o.orcamento_itens, o.margem_percentual), // o cliente vê o preço cheio, nunca margem/custo
        pode_responder: o.status === 'enviado' && !ch.aprovado_externo_em,
      };
    }
  }
  return NextResponse.json({
    chamado: { numero: ch.numero, titulo: ch.titulo, descricao: ch.descricao, endereco: ch.endereco, status: ch.status, status_rotulo: STATUS_CHAMADO[ch.status], solicitante_nome: ch.solicitante_nome, solicitante_tipo: ch.solicitante_tipo, criado_em: ch.criado_em, imobiliaria: ch.clientes?.nome_empresa || '' },
    mensagens, orcamento,
  });
}
