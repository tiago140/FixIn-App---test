export const SENHA_MIN = 8;

export function validarSenha(senha) {
  if (!senha || String(senha).length < SENHA_MIN) return `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  return null;
}

// Gera uma senha aleatória fácil de ditar (sem letras/números que se confundem: 0/O, 1/l/I).
export function gerarSenha(tamanho = 10) {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}
