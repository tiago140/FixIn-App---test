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

export function imobiliariaTabs(profile) {
  const base = [
    { href: '/imobiliaria/dashboard', label: 'Orçamentos' },
    { href: '/imobiliaria/kanban', label: 'Kanban' },
    { href: '/imobiliaria/financeiro', label: 'Financeiro' },
    { href: '/imobiliaria/avisos', label: 'Avisos' },
    { href: '/imobiliaria/visitas', label: 'Visitas' },
  ];
  if (profile.subrole !== 'operacional') {
    base.push({ href: '/imobiliaria/equipe', label: 'Equipe' });
  }
  return base;
}
