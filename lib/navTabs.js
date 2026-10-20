export const MASTER_TABS = [
  { href: '/master/dashboard', label: 'Painel' },
  { href: '/master/avisos', label: 'Avisos' },
  { href: '/master/orcamentos', label: 'Orçamentos' },
  { href: '/master/chamados', label: 'Chamados' },
  { href: '/master/laudos', label: 'Laudos', dono: true },
  { href: '/master/controle', label: 'Controle' },
  { href: '/master/visitas', label: 'Visitas' },
  { href: '/master/prestadores', label: 'Prestadores' },
  { href: '/master/ordens', label: 'Ordens de serviço' },
  { href: '/master/financeiro', label: 'Financeiro', dono: true },
  { href: '/master/resultados', label: 'Resultados', dono: true },
  { href: '/master/auditoria', label: 'Auditoria', dono: true },
  { href: '/master/clientes', label: 'Clientes' },
  { href: '/master/acessos', label: 'Acessos', dono: true },
  { href: '/master/catalogo', label: 'Catálogo', dono: true },
];

// Mesmos rótulos do menu do dono, na mesma ordem — só aparece o que a imobiliária tem permissão de ver.
export function imobiliariaTabs(profile) {
  const base = [
    { href: '/imobiliaria/dashboard', label: 'Painel' },
    { href: '/imobiliaria/avisos', label: 'Avisos' },
    { href: '/imobiliaria/kanban', label: 'Orçamentos' },
    { href: '/imobiliaria/chamados', label: 'Chamados' },
    { href: '/imobiliaria/controle', label: 'Controle' },
    { href: '/imobiliaria/visitas', label: 'Visitas' },
    { href: '/imobiliaria/laudos', label: 'Laudos' },
  ];
  // Financeiro e Equipe só para o administrador: o operacional não vê valores em R$.
  if (profile.subrole !== 'operacional') {
    base.push({ href: '/imobiliaria/financeiro', label: 'Financeiro' });
    base.push({ href: '/imobiliaria/equipe', label: 'Equipe' });
  }
  return base;
}

// Área do prestador.
export const PRESTADOR_TABS = [
  { href: '/prestador/dashboard', label: 'Painel' },
  { href: '/prestador/ordens', label: 'Ordens de serviço' },
  { href: '/prestador/financeiro', label: 'Financeiro' },
  { href: '/prestador/garantias', label: 'Garantias' },
  { href: '/prestador/dados', label: 'Meus dados' },
];
