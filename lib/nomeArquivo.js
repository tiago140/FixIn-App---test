// Nome padrão dos PDFs que a FixIn salva e envia: "Imobiliária - Endereço completo - ORC-0000.pdf".
// Duas versões: a "bonita" (com acentos, para anexo de e-mail e download) e a "segura" (só ASCII), que é a chave
// no armazenamento — o Supabase Storage recusa acentos e alguns símbolos em nomes de arquivo.
const ILEGAIS = /[\\/:*?"<>|\r\n\t]+/g;

function limpar(s) {
  return String(s || '').replace(ILEGAIS, ' ').replace(/\s+/g, ' ').trim();
}

export function nomeArquivoPdf({ imobiliaria, endereco, numero, sufixo = '' }) {
  const partes = [limpar(imobiliaria), limpar(endereco).slice(0, 120).trim(), limpar(numero)].filter(Boolean);
  const base = (partes.join(' - ') || 'documento') + (sufixo ? ' - ' + limpar(sufixo) : '');
  return base + '.pdf';
}

export function nomeSeguroStorage(nome) {
  const semAcento = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  return semAcento.replace(/,/g, '').replace(/[^A-Za-z0-9 ._()-]+/g, '-').replace(/\s+/g, ' ').replace(/-{2,}/g, '-').trim() || 'documento.pdf';
}
