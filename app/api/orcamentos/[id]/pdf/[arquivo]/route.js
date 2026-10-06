import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { nomeArquivoPdf, nomeSeguroStorage } from '@/lib/nomeArquivo';

export const runtime = 'nodejs';

// Entrega o último PDF gerado do orçamento COM O NOME PADRÃO ("Imobiliária - Endereço completo - ORC-0000.pdf"),
// como download. O último trecho da URL é só o nome do arquivo; o que vale é o orçamento (id). Só a FixIn.
export async function GET(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const { data: orc } = await supabase.from('orcamentos').select('numero, endereco, clientes(nome_empresa)').eq('id', params.id).maybeSingle();
  if (!orc) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });

  const nome = nomeArquivoPdf({ imobiliaria: orc.clientes?.nome_empresa, endereco: orc.endereco, numero: orc.numero });
  const { data, error } = await supabase.storage.from('orcamentos-pdfs').download(`${params.id}/${nomeSeguroStorage(nome)}`);
  if (error || !data) return NextResponse.json({ error: 'PDF ainda não foi gerado' }, { status: 404 });

  const ascii = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '-');
  const modo = new URL(req.url).searchParams.get('ver') === '1' ? 'inline' : 'attachment';
  return new NextResponse(Buffer.from(await data.arrayBuffer()), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${modo}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      'Cache-Control': 'no-store',
    },
  });
}
