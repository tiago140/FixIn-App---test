import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { concluirOS } from '@/lib/ordensExec';
import { hashLaudo } from '@/lib/laudoFinalizacao';

export const runtime = 'nodejs';
const ABRE = ['em_execucao', 'reprovada', 'conclusao_pendente', 'aprovada', 'paga'];

// O prestador assina o laudo de finalização. Se a ordem ainda está em execução, a assinatura também conclui o serviço.
export async function POST(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*').eq('id', params.id).eq('prestador_id', profile.prestador_id).maybeSingle();
  if (!os) return NextResponse.json({ error: 'ordem não encontrada' }, { status: 404 });
  if (!ABRE.includes(os.status)) return NextResponse.json({ error: 'Esta ordem ainda não pode ter o laudo assinado.' }, { status: 409 });

  const nome = String(b.nome || '').trim().slice(0, 120);
  const doc = String(b.doc || '').trim().slice(0, 30) || null;
  const obs = String(b.obs || '').trim().slice(0, 1000) || null;
  const png = String(b.assinatura || '');
  if (nome.length < 3) return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 });
  if (b.aceite !== true) return NextResponse.json({ error: 'Confirme a declaração do laudo.' }, { status: 400 });
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png) || png.length < 1500 || png.length > 400000) return NextResponse.json({ error: 'Faça sua assinatura no quadro.' }, { status: 400 });

  const rodada = os.rodada || 0;
  const { count: ja } = await admin.from('os_laudos_finalizacao').select('id', { count: 'exact', head: true }).eq('os_id', os.id).eq('rodada', rodada);
  if (ja) return NextResponse.json({ error: 'O laudo desta etapa já foi assinado.' }, { status: 409 });
  const { count: depois } = await admin.from('os_fotos').select('id', { count: 'exact', head: true }).eq('os_id', os.id).eq('tipo', 'depois').eq('rodada', rodada);
  if (!depois) return NextResponse.json({ error: 'Envie pelo menos uma foto do serviço pronto (Final) antes de assinar.' }, { status: 400 });

  const ip = String(req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  const quando = new Date().toISOString();
  const hash = hashLaudo({ osNumero: os.numero, endereco: os.endereco, nome, doc, obs, assinaturaPng: png, quando });
  const { error } = await admin.from('os_laudos_finalizacao').insert({ os_id: os.id, rodada, criado_em: quando, assinante_nome: nome, assinante_doc: doc, observacoes: obs, assinatura_png: png, ip, user_agent: String(req.headers.get('user-agent') || '').slice(0, 300), hash });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  try { await admin.from('auditoria').insert({ acao: 'Prestador assinou o laudo de finalização', detalhe: `${os.numero} · ${os.endereco}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: 'prestador' }); } catch (e) {}

  if (['em_execucao', 'reprovada'].includes(os.status)) {
    const r = await concluirOS(admin, os, obs, profile.nome_completo || nome);
    if (r.erro) return NextResponse.json({ error: r.erro, assinado: true }, { status: r.status || 400 });
  }
  return NextResponse.json({ ok: true });
}
