// Arquivos privados: o navegador nunca recebe o endereço direto do armazenamento.
// Ele abre /api/arquivo/<pasta>/<caminho>, que confere o login e a permissão e só então libera um link temporário.
export const BUCKETS_PRIVADOS = ['orcamentos-pdfs', 'documentos-fiscais', 'comprovantes-pagamento', 'chat-anexos'];

export function urlArquivo(bucket, caminho) {
  return `/api/arquivo/${bucket}/${String(caminho).split('/').map(encodeURIComponent).join('/')}`;
}
