// Campos do cadastro do prestador e a limpeza deles (usado pela equipe e pelo próprio prestador).
const t = (v, n = 200) => { const s = String(v ?? '').trim().slice(0, n); return s || null; };
const digitos = (v, n = 20) => { const s = String(v ?? '').replace(/\D/g, '').slice(0, n); return s || null; };
const um = (v, lista) => (lista.includes(v) ? v : null);

export function limparCadastro(b) {
  const tipo = b.tipo_pessoa === 'pj' ? 'pj' : 'pf';
  return {
    nome: t(b.nome),
    email: t(b.email, 120)?.toLowerCase() || null,
    telefone: t(b.telefone, 30),
    tipo_pessoa: tipo,
    cpf: t(b.cpf, 20),
    rg: t(b.rg, 20),
    cnpj: t(b.cnpj, 25),
    razao_social: t(b.razao_social),
    banco: t(b.banco, 80),
    agencia: t(b.agencia, 20),
    conta: t(b.conta, 30),
    tipo_conta: um(b.tipo_conta, ['corrente', 'poupanca', 'pagamento']),
    pix_tipo: um(b.pix_tipo, ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']),
    pix_chave: t(b.pix_chave, 120),
  };
}

// O próprio prestador não altera o nome cadastrado nem a carteira Asaas (a equipe confere antes).
export const CAMPOS_DO_PROPRIO = ['email', 'telefone', 'tipo_pessoa', 'cpf', 'rg', 'cnpj', 'razao_social', 'banco', 'agencia', 'conta', 'tipo_conta', 'pix_tipo', 'pix_chave'];

export { digitos };
