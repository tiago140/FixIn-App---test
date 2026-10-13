import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardarArquivo, removerArquivo, TAMANHO_MAX_DOC } from '@/lib/ordensArquivos';
import { recalcularPagamentoOS } from '@/lib/ordensExec';
import { avisarPrestadorOS } from '@/lib/ordens';
import { fmtBRL } from '@/lib/format';

export const runtime = 'nodejs';
export const maxDuration = 30;
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

// Registra um pagamento ao prestador (com comprovante). Dinheiro: só o DONO, como o resto das contas.
export async function POST(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return erro('Só o perfil de gestão registra pagamentos.', 403);
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*').eq('id', params.id).maybeSingle();
  if (!os) return erro('ordem não encontrada', 404);
  if (!['aprovada', 'paga', 'conclusao_pendente', 'em_execucao'].includes(os.status)) return erro('Esta ordem ainda não está em fase de pagamento.', 409);

  let form; try { form = await req.formData(); } catch (e) { return erro('envio inválido'); }
  const valor = Math.round(Number(String(form.get('valor') || '').replace(',', '.')) * 100) / 100;
  const data = String(form.get('data_pagamento') || '');
  if (!(valor > 0) || valor > 10000000) return erro('Informe um valor válido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return erro('Informe a data do pagamento.');

  let comprovante = null;
  if (form.get('arquivo') && form.get('arquivo').size > 0) {
    const r = await guardarArquivo(os.id, 'pagamento', form, { permitePdf: true, max: TAMANHO_MAX_DOC });
    if (r.erro) return erro(r.erro, r.status);
    comprovante = r.path;
  }
  const { error } = await admin.from('pagamentos_prestador').insert({
    os_id: os.id, prestador_id: os.prestador_id, valor, data_pagamento: data,
    forma: String(form.get('forma') || '').trim().slice(0, 40) || null,
    observacao: String(form.get('observacao') || '').trim().slice(0, 300) || null,
    comprovante_path: comprovante, criado_por: user.id,
  });
  if (error) { if (comprovante) await removerArquivo(comprovante); return erro(error.message); }
  const res = await recalcularPagamentoOS(admin, os.id);
  try { await admin.from('auditoria').insert({ acao: 'Registrou pagamento ao prestador', detalhe: `${os.numero} · ${fmtBRL(valor)}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  await avisarPrestadorOS({ ...os, status: res?.status || os.status }, 'paga', fmtBRL(valor));
  return NextResponse.json({ ok: true, quitada: !!res?.quitada });
}
