import { gerarSenha } from '@/lib/senha';
import { enviarEmailAvisoImobiliaria } from '@/lib/email';

const h = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Cria o login do prestador (ou gera nova senha provisória se já existir) e manda o e-mail com o acesso.
// Devolve { acesso: 'enviado'|'criado'|'nao_criado', aviso, senha } — a senha só volta quando o e-mail não saiu.
export async function liberarAcessoPrestador(admin, prestador, { aprovacao = false } = {}) {
  const email = String(prestador.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { acesso: 'nao_criado', aviso: 'O prestador não tem um e-mail válido cadastrado.' };
  const senha = gerarSenha(10);

  const { data: perfil } = await admin.from('profiles').select('id').eq('prestador_id', prestador.id).maybeSingle();
  if (perfil) {
    const { error } = await admin.auth.admin.updateUserById(perfil.id, { password: senha, app_metadata: { trocar_senha: true } });
    if (error) return { acesso: 'nao_criado', aviso: error.message };
  } else {
    const { data: cr, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, app_metadata: { trocar_senha: true } });
    if (error) return { acesso: 'nao_criado', aviso: /already|registered|exists/i.test(error.message || '') ? 'Já existe um usuário com este e-mail; crie o acesso manualmente na tela Acessos.' : error.message };
    const { error: ep } = await admin.from('profiles').insert({ id: cr.user.id, role: 'prestador', nome_completo: prestador.nome, email, cpf: prestador.cpf || null, prestador_id: prestador.id, ativo: true, dono: false });
    if (ep) { await admin.auth.admin.deleteUser(cr.user.id); return { acesso: 'nao_criado', aviso: ep.message }; }
  }

  const r = await enviarEmailAvisoImobiliaria({
    para: [email], assunto: aprovacao ? 'Seu acesso à FixIn Reformas' : 'Seu acesso à FixIn Reformas (nova senha)',
    titulo: aprovacao ? 'Cadastro aprovado!' : 'Acesso ao sistema',
    corpoHtml: `<p>Olá, ${h(prestador.nome)}. ${aprovacao ? 'Seu cadastro como prestador foi aprovado.' : 'Segue seu acesso ao sistema.'}</p><p><b>E-mail:</b> ${h(email)}<br><b>Senha provisória:</b> ${h(senha)}</p><p>No primeiro acesso você escolhe uma senha nova.</p>`,
    link: 'https://app.fixinreformas.com/login', textoBotao: 'Entrar no sistema',
  });
  if (r?.enviado) return { acesso: 'enviado' };
  return { acesso: 'criado', aviso: 'Acesso criado, mas o e-mail não foi enviado. ' + (r?.motivo || ''), senha };
}
