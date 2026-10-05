import {
  LayoutDashboard, ClipboardList, Columns3, Table2, CalendarDays, HardHat, Wallet, ShieldCheck,
  Building2, Users, BookOpen, Bell, FilePlus2, UserCog, ClipboardCheck,
} from 'lucide-react';

// Ícone por seção. Recebe o NOME (texto) e não o componente, para funcionar tanto em páginas de servidor quanto de navegador.
const ICONES = {
  painel: LayoutDashboard, orcamentos: ClipboardList, kanban: Columns3, controle: Table2, visitas: CalendarDays,
  prestadores: HardHat, financeiro: Wallet, auditoria: ShieldCheck, clientes: Building2, acessos: Users,
  catalogo: BookOpen, avisos: Bell, solicitar: FilePlus2, conta: UserCog, equipe: Users, laudos: ClipboardCheck,
};

// Cabeçalho padrão de todas as telas: ícone da seção, título forte, etiqueta (ex.: nome da imobiliária)
// e um espaço à direita para indicadores/botões. Mesmas cores e fontes que já usamos.
export default function PageHeader({ icone = 'painel', titulo, subtitulo, etiqueta, direita }) {
  const Icone = ICONES[icone] || LayoutDashboard;
  return (
    <header className="page-header relative bg-white border border-linha rounded-lg shadow-sm mb-6 overflow-hidden">
      <div className="flex items-center gap-4 px-5 sm:px-6 py-4 sm:py-5 flex-wrap">
        <span className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-marinho text-white flex items-center justify-center shadow">
          <Icone size={26} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-slab text-2xl sm:text-3xl font-bold text-marinho leading-tight">{titulo}</h1>
          {(subtitulo || etiqueta) && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {etiqueta && (
                <span className="inline-block bg-verde/10 text-verde border border-verde/25 text-xs sm:text-sm font-semibold rounded-full px-3 py-0.5">
                  {etiqueta}
                </span>
              )}
              {subtitulo && <span className="text-sm text-marinho/60">{subtitulo}</span>}
            </div>
          )}
        </div>
        {direita && <div className="flex items-center gap-2 flex-wrap">{direita}</div>}
      </div>
      <div className="h-1 bg-gradient-to-r from-marinho via-[#2C5570] to-verde" />
    </header>
  );
}
