// Quem pode ver valores em R$.
//  - dono / funcionário master: tudo (incluindo custo e margem, que só existem nas telas deles)
//  - administrador da imobiliária: todos os valores, sempre o preço cheio (nunca margem, comissão ou custo base)
//  - operacional da imobiliária: nenhum valor em R$, só quantidades
// O banco aplica a mesma regra (visões orcamentos_cliente etc.), então isto é só para a tela se adaptar.
export function ehMaster(profile) {
  return profile?.role === 'master';
}

export function veValores(profile) {
  if (!profile) return false;
  if (profile.role === 'master') return true;
  return profile.role === 'imobiliaria' && profile.subrole !== 'operacional';
}

export const ROTULO_PERFIL = {
  dono: 'Dono',
  master: 'Equipe FixIn',
  admin: 'Administrador',
  operacional: 'Operacional',
};

export function rotuloPerfil(profile) {
  if (!profile) return '';
  if (profile.role === 'master') return profile.dono ? ROTULO_PERFIL.dono : ROTULO_PERFIL.master;
  return profile.subrole === 'operacional' ? ROTULO_PERFIL.operacional : ROTULO_PERFIL.admin;
}
