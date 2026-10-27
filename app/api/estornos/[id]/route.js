import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { destinatariosDaImobiliaria } from '@/lib/destinatarios';
import { enviarEmailAvisoImobiliaria } from '@/lib/email';
import { urlSite } from '@/lib/chamados';
import { dataValida } from '@/lib/lancamentos';
import { fmtBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Equipe marca "em análise"; só o dono aprova (vira conta a pagar) ou recusa. O banco confere a permissão de novo.
export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const acao = b.acao;
  if (!['em_analise', 'aprovar', 'recusar'].includes(acao)) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  if (acao !== 'em_analise' && !profile.dono) return NextResponse.json({ error: 'Só o dono aprova ou recusa estornos.' }, { status: 403 });
  if (acao === 'aprovar' && !dataValida(b.vencimento)) return NextResponse.json({ error: 'Informe a data do pagamento.' }, { status: 400 });
  if (acao === 'recusar' && !String(b.resposta || '').trim()) return NextResponse.json({ error: 'Explique o motivo da recusa.' }, { status: 400 });

  const { data: est } = await supabase.from('estornos').select('id, numero, cliente_id, valor, endereco, criado_por').eq('id', params.id).single();
  if (!est) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  const { error } = await supabase.rpc('decidir_estorno', {
    p_id: params.id, p_acao: acao, p_resposta: String(b.resposta || '').trim().slice(0, 1000) || null, p_vencimento: acao === 'aprovar' ? b.vencimento : null,
  });
  if (error) return NextResponse.json({ error: error.message || 'Não foi possível salvar.' }, { status: 400 });

  try { await supabase.from('auditoria').insert({ acao: `Estorno ${acao === 'aprovar' ? 'aprovado' : acao === 'recusar' ? 'recusado' : 'em análise'}`, detalhe: `${est.numero} · ${fmtBRL(est.valor)}`, alvo_tipo: 'estorno', alvo_id: est.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}

  // Avisa o administrador da imobiliária por e-mail quando o pedido é decidido. Nunca derruba a resposta.
  if (acao !== 'em_analise') {
    try {
      const dest = await destinatariosDaImobiliaria(createAdminClient(), est.cliente_id, { criadoPor: est.criado_por || null, soAdmins: true });
      if (dest.emails.length) {
        const aprovado = acao === 'aprovar';
        await enviarEmailAvisoImobiliaria({
          para: dest.emails, assunto: `Estorno ${est.numero} ${aprovado ? 'aprovado' : 'recusado'}`, titulo: `Estorno ${aprovado ? 'aprovado' : 'recusado'}`,
          corpoHtml: `<p>Seu pedido de estorno <strong>${esc(est.numero)}</strong> de <strong>${esc(fmtBRL(est.valor))}</strong>${est.endereco ? ` (${esc(est.endereco)})` : ''} foi <strong>${aprovado ? 'aprovado' : 'recusado'}</strong>.</p>${!aprovado && b.resposta ? `<p>Motivo: ${esc(b.resposta)}</p>` : ''}${aprovado ? `<p>O pagamento será feito na data combinada.</p>` : ''}`,
          link: `${urlSite()}/imobiliaria/estornos`,
        });
      }
    } catch (e) {}
  }
  return NextResponse.json({ ok: true });
}
