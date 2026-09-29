export const MASTER_TABS = [
  { href: '/master/dashboard', label: 'Painel' },
  { href: '/master/avisos', label: 'Avisos' },
  { href: '/master/orcamentos', label: 'Orçamentos' },
  { href: '/master/controle', label: 'Controle' },
  { href: '/master/visitas', label: 'Visitas' },
  { href: '/master/prestadores', label: 'Prestadores' },
  { href: '/master/financeiro', label: 'Financeiro' },
  { href: '/master/auditoria', label: 'Auditoria' },
  { href: '/master/clientes', label: 'Clientes' },
  { href: '/master/acessos', label: 'Acessos' },
  { href: '/master/catalogo', label: 'Catálogo' },
];

// Mesmos rótulos do menu do dono, na mesma ordem — só aparece o que a imobiliária tem permissão de ver.
export function imobiliariaTabs(profile) {
  const base = [
    { href: '/imobiliaria/dashboard', label: 'Painel' },
    { href: '/imobiliaria/avisos', label: 'Avisos' },
    { href: '/imobiliaria/kanban', label: 'Orçamentos' },
    { href: '/imobiliaria/controle', label: 'Controle' },
    { href: '/imobiliaria/visitas', label: 'Visitas' },
    { href: '/imobiliaria/financeiro', label: 'Financeiro' },
  ];
  if (profile.subrole !== 'operacional') {
    base.push({ href: '/imobiliaria/equipe', label: 'Equipe' });
  }
  return base;
}
