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

const SENHAS_FRACAS = ['adm12345', '12345678', '123456789', 'senha123', 'senha1234', 'password1', 'qwerty123', 'abc12345', 'fixin123', 'mudar123', 'admin123', 'fixin1234'];

// Regra para a senha que a própria pessoa escolhe: 8+ caracteres, com letra e número, fora das senhas óbvias.
export function validarSenhaForte(senha) {
  const base = validarSenha(senha);
  if (base) return base;
  const s = String(senha);
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Use letras e números na senha.';
  if (SENHAS_FRACAS.includes(s.toLowerCase()) || /^(.)\1+$/.test(s)) return 'Essa senha é muito comum. Escolha outra.';
  return null;
}
