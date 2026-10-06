import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { gerarPdfPrestador } from '@/lib/gerarPdfPrestador';
import { nomeArquivoPdf } from '@/lib/nomeArquivo';

export const runtime = 'nodejs';

// Só o dono gera — mostra o custo base (sem a margem), pro prestador.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const id = params.id;
  const { data: orcamento, error: erroOrc } = await supabase
    .from('orcamentos')
    .select('*, prestadores(nome), clientes(nome_empresa)')
    .eq('id', id)
    .single();
  if (erroOrc || !orcamento) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });

  const { data: itens } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id).order('ordem');

  let pdfBuffer;
  try {
    pdfBuffer = await gerarPdfPrestador(orcamento, orcamento.prestadores, itens || []);
  } catch (e) {
    return NextResponse.json({ error: 'erro ao gerar PDF: ' + e.message }, { status: 500 });
  }

  await supabase.from('auditoria').insert({
    acao: 'Gerou PDF interno do prestador',
    detalhe: orcamento.numero || '',
    alvo_tipo: 'orcamento', alvo_id: id,
    autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
  });

  const nomeBonito = nomeArquivoPdf({ imobiliaria: orcamento.clientes?.nome_empresa, endereco: orcamento.endereco, numero: orcamento.numero, sufixo: 'Prestador' });
  const nomeSeguro = nomeBonito.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '-');
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nomeSeguro}"; filename*=UTF-8''${encodeURIComponent(nomeBonito)}`,
    },
  });
}
