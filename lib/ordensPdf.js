import { createAdminClient } from '@/lib/supabase/admin';
import { gerarPdfPrestador } from '@/lib/gerarPdfPrestador';

// PDF da ordem de serviço para o prestador: só endereço, instruções e os valores DELE. Nunca margem nem preço da imobiliária.
export async function pdfDaOrdem(osId) {
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*, prestadores(nome), os_itens(*)').eq('id', osId).maybeSingle();
  if (!os) return null;
  const itens = (os.os_itens || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const buffer = await gerarPdfPrestador(
    { data_orcamento: os.criado_em, endereco: os.endereco, prazo_execucao_dias: null, numero_os: os.numero, instrucoes: os.descricao || '' },
    os.prestadores,
    itens
  );
  return { buffer, os, nome: `Ordem-de-servico-${os.numero}.pdf` };
}
