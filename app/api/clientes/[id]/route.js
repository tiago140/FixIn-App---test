import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { cnpjValido, soDigitos } from '@/lib/cnpj';

const BAN_LONGO = '876000h';
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

async function registrar(ctx, acao, detalhe) {
  try {
    await ctx.supabase.from('auditoria').insert({ acao, detalhe, alvo_tipo: 'cliente', alvo_id: ctx.cliente.id, autor_id: ctx.user.id, autor_nome: ctx.profile.nome_completo, autor_role: ctx.profile.role });
  } catch (e) {}
}

// Só equipe FixIn. Editar o cadastro, desativar e reativar a imobiliária. Nada é apagado: orçamentos, financeiro e histórico ficam.
export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return erro('sem permissão', 403);
  const admin = createAdminClient();
  const { data: cliente } = await admin.from('clientes').select('*').eq('id', params.id).maybeSingle();
  if (!cliente) return erro('imobiliária não encontrada', 404);
  const ctx = { user, profile, supabase, cliente };

  let corpo = {};
  try { corpo = await req.json(); } catch (e) {}

  if (corpo.acao === 'editar') {
    const empresa = String(corpo.nome_empresa || '').trim().slice(0, 150);
    const contato = String(corpo.nome || '').trim().slice(0, 120);
    const email = String(corpo.email || '').trim().toLowerCase();
    const cnpj = String(corpo.cnpj || '').trim();
    if (!empresa) return erro('Informe o nome da imobiliária.');
    if (email && !EMAIL_OK.test(email)) return erro('Informe um e-mail válido (ou deixe em branco).');

    // O CNPJ só é conferido quando você o MUDA — cadastros antigos com número provisório não travam a edição de outros campos.
    const cnpjMudou = soDigitos(cnpj) !== soDigitos(cliente.cnpj);
    if (cnpjMudou && cnpj) {
      if (!cnpjValido(cnpj)) return erro('CNPJ inválido: confira os 14 números (os dois últimos dígitos são de verificação).');
      const { data: todos } = await admin.from('clientes').select('id, nome_empresa, cnpj');
      const igual = (todos || []).find((c) => c.id !== cliente.id && soDigitos(c.cnpj) === soDigitos(cnpj));
      if (igual) return erro(`Já existe a imobiliária "${igual.nome_empresa}" com esse CNPJ.`, 409);
    }

    const novo = { nome_empresa: empresa, nome: contato || empresa, email: email || null, cnpj: cnpj || null };
    const { error } = await admin.from('clientes').update(novo).eq('id', cliente.id);
    if (error) return erro(error.message);
    const mudou = [
      empresa !== cliente.nome_empresa && 'nome', contato && contato !== cliente.nome && 'responsável',
      (email || null) !== (cliente.email || null) && 'e-mail', cnpjMudou && 'CNPJ',
    ].filter(Boolean);
    await registrar(ctx, 'Editou imobiliária', `${cliente.nome_empresa}${mudou.length ? ' — alterou: ' + mudou.join(', ') : ''}`);
    return NextResponse.json({ ok: true });
  }

  if (corpo.acao === 'desativar') {
    const { error: e1 } = await admin.from('clientes').update({ ativo: false }).eq('id', cliente.id);
    if (e1) return erro(e1.message);
    // bloqueia os logins ainda ativos (anota quem foi bloqueado POR ISSO) — o bloqueio no cadastro vale na hora
    const { data: pessoas } = await admin.from('profiles').select('id, ativo').eq('cliente_id', cliente.id).eq('role', 'imobiliaria');
    const ids = (pessoas || []).filter((p) => p.ativo !== false).map((p) => p.id);
    if (ids.length) {
      const { error: e2 } = await admin.from('profiles').update({ ativo: false, bloqueado_por_cliente: true }).in('id', ids);
      if (e2) return erro('Imobiliária desativada, mas não consegui bloquear os usuários: ' + e2.message, 500);
    }
    const falhas = [];
    for (const id of ids) {
      const { error: eb } = await admin.auth.admin.updateUserById(id, { ban_duration: BAN_LONGO });
      if (eb) falhas.push(id);
    }
    await registrar(ctx, 'Desativou imobiliária', `${cliente.nome_empresa} — ${ids.length} usuário(s) bloqueado(s)`);
    if (falhas.length) return erro(`Imobiliária desativada e ${ids.length} usuário(s) bloqueado(s) no sistema, mas o bloqueio de login falhou para ${falhas.length}.`, 500);
    return NextResponse.json({ ok: true, usuarios_bloqueados: ids.length });
  }

  if (corpo.acao === 'reativar') {
    const { error: e1 } = await admin.from('clientes').update({ ativo: true }).eq('id', cliente.id);
    if (e1) return erro(e1.message);
    // devolve o acesso só a quem foi bloqueado pela desativação (quem já estava desativado individualmente continua assim)
    const { data: pessoas } = await admin.from('profiles').select('id, bloqueado_por_cliente').eq('cliente_id', cliente.id).eq('role', 'imobiliaria');
    const ids = (pessoas || []).filter((p) => p.bloqueado_por_cliente === true).map((p) => p.id);
    const falhas = [];
    for (const id of ids) {
      const { error: eb } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' });
      if (eb) falhas.push(id);
    }
    const liberar = ids.filter((id) => !falhas.includes(id));
    if (liberar.length) await admin.from('profiles').update({ ativo: true, bloqueado_por_cliente: false }).in('id', liberar);
    await registrar(ctx, 'Reativou imobiliária', `${cliente.nome_empresa} — ${liberar.length} usuário(s) liberado(s)`);
    if (falhas.length) return erro(`Imobiliária reativada, mas ${falhas.length} usuário(s) não foram liberados no login. Reative-os em Acessos.`, 500);
    return NextResponse.json({ ok: true, usuarios_liberados: liberar.length });
  }

  return erro('ação inválida');
}
