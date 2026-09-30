import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { calcularProximoStatusAutomatico, STATUS_LABEL } from '@/lib/format';
import { enviarEmailStatusOrcamento } from '@/lib/email';

export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const id = params.id;
  const body = await req.json();
  const { itens, ...camposOrcamento } = body;

  const { data: antes } = await supabase.from('orcamentos').select('*, orcamento_itens(mo,ma)').eq('id', id).single();

  if (Object.keys(camposOrcamento).length > 0) {
    camposOrcamento.atualizado_em = new Date().toISOString();
    if (camposOrcamento.status === 'aprovado') camposOrcamento.aprovado_em = new Date().toISOString();
    if (camposOrcamento.status) camposOrcamento.migrado_automaticamente = false;
    const { error } = await supabase.from('orcamentos').update(camposOrcamento).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (antes) {
      if (camposOrcamento.cliente_id && camposOrcamento.cliente_id !== antes.cliente_id) {
        await registrarAuditoria(supabase, user, profile, 'Trocou imobiliária do orçamento', `${antes.numero}`, 'orcamento', id);
      }
      if (camposOrcamento.status && camposOrcamento.status !== antes.status) {
        await registrarAuditoria(supabase, user, profile, 'Mudou status', `${antes.numero}: ${STATUS_LABEL[antes.status]} → ${STATUS_LABEL[camposOrcamento.status]}`, 'orcamento', id);
        await enviarEmailPorMudancaDeStatus(supabase, id, camposOrcamento.status);
      }
      const camposControle = ['numero_contrato', 'data_deposito', 'data_inicio', 'comissao_percentual'].filter((c) => c in camposOrcamento);
      if (camposControle.length) {
        await registrarAuditoria(supabase, user, profile, 'Editou controle', `${antes.numero}: ${camposControle.map((c) => `${c} = ${camposOrcamento[c] ?? '(vazio)'}`).join(', ')}`, 'orcamento', id);
      }
      if (camposOrcamento.valor_pago != null) {
        await registrarAuditoria(supabase, user, profile, 'Registrou pagamento', `${antes.numero}`, 'orcamento', id);
      }
      if (camposOrcamento.prestador_id !== undefined) {
        await registrarAuditoria(supabase, user, profile, 'Atribuiu prestador', `${antes.numero}`, 'orcamento', id);
        const orcAtualizado = { ...antes, prestador_id: camposOrcamento.prestador_id };
        const novoStatus = await aplicarMigracaoAutomatica(supabase, orcAtualizado, 'prestador');
        if (novoStatus) await enviarEmailPorMudancaDeStatus(supabase, id, novoStatus);
      }
      if (camposOrcamento.valor_pago != null) {
        const orcAtualizado = { ...antes, valor_pago: camposOrcamento.valor_pago };
        const novoStatus = await aplicarMigracaoAutomatica(supabase, orcAtualizado, 'pagamento');
        if (novoStatus) await enviarEmailPorMudancaDeStatus(supabase, id, novoStatus);
      }
    }
  }

  if (Array.isArray(itens)) {
    const { error: erroDelete } = await supabase.from('orcamento_itens').delete().eq('orcamento_id', id);
    if (erroDelete) return NextResponse.json({ error: erroDelete.message }, { status: 400 });

    if (itens.length > 0) {
      const paraInserir = itens.map((it, i) => ({
        orcamento_id: id,
        ambiente: it.ambiente,
        servico: it.servico,
        descricao: it.descricao || '',
        mo: Number(it.mo) || 0,
        ma: Number(it.ma) || 0,
        ordem: i,
      }));
      const { error: erroInsert } = await supabase.from('orcamento_itens').insert(paraInserir);
      if (erroInsert) return NextResponse.json({ error: erroInsert.message }, { status: 400 });
    }
    if (antes) await registrarAuditoria(supabase, user, profile, 'Editou itens/margem', `${antes.numero}: ${itens.length} item(ns)`, 'orcamento', id);
  }

  return NextResponse.json({ ok: true });
}

async function aplicarMigracaoAutomatica(supabase, orcamento, gatilho) {
  const novoStatus = calcularProximoStatusAutomatico(orcamento, gatilho);
  if (!novoStatus) return null;
  await supabase.from('orcamentos').update({ status: novoStatus, atualizado_em: new Date().toISOString(), migrado_automaticamente: true }).eq('id', orcamento.id);
  return novoStatus;
}

// "enviado" já dispara pelo botão de gerar PDF (enviarEmailOrcamentoPronto, com o link do PDF).
// Aqui cobrimos os outros 3: aprovado, em_execucao, finalizado — venha a mudança manual do dono
// ou de uma migração automática (prestador atribuído, pagamento completo).
async function enviarEmailPorMudancaDeStatus(supabase, orcamentoId, novoStatus) {
  if (!['aprovado', 'em_execucao', 'finalizado'].includes(novoStatus)) return;
  const { data: orc } = await supabase
    .from('orcamentos')
    .select('numero, endereco, clientes(nome_empresa, email)')
    .eq('id', orcamentoId)
    .single();
  if (!orc) return;
  await enviarEmailStatusOrcamento({
    paraEmail: orc.clientes?.email,
    nomeImobiliaria: orc.clientes?.nome_empresa,
    numero: orc.numero,
    endereco: orc.endereco,
    status: novoStatus,
  }).catch(() => {});
}

async function registrarAuditoria(supabase, user, profile, acao, detalhe, alvoTipo, alvoId) {
  try {
    await supabase.from('auditoria').insert({
      acao, detalhe, alvo_tipo: alvoTipo, alvo_id: alvoId,
      autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
    });
  } catch (e) {
    // auditoria nunca deve travar a operação principal
  }
}

