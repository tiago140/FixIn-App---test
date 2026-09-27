import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { parseVistoriaTexto, extrairEnderecoVistoria } from '@/lib/parseVistoria';

export const runtime = 'nodejs';

export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || (profile?.role !== 'master' && profile?.role !== 'imobiliaria')) {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('arquivo');
  if (!file) {
    return NextResponse.json({ error: 'nenhum arquivo enviado' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let texto = '';
  try {
    // import dinâmico evita o pdf-parse tentar rodar seu modo de teste no import estático
    const pdfParse = (await import('pdf-parse')).default;
    const resultado = await pdfParse(buffer);
    texto = resultado.text || '';
  } catch (e) {
    return NextResponse.json({ error: 'não foi possível ler este PDF: ' + e.message }, { status: 400 });
  }

  const itens = parseVistoriaTexto(texto);
  const endereco = extrairEnderecoVistoria(texto);

  return NextResponse.json({ itens, endereco, texto_bruto: texto, total_itens_encontrados: itens.length });
}

