'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronsLeft, ChevronsRight, LogOut, Menu, User } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const ROLE_LABEL = { dono: 'dono', master: 'master', imobiliaria_admin: 'administrador', imobiliaria_operacional: 'operacional' };

export default function AppShell({ profile, tabs, children, homeHref, fullWidth = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [chavesAvisos, setChavesAvisos] = useState([]);
  const [vistos, setVistos] = useState({});

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('fixin_sidebar_collapsed') === '1');
    } catch (e) {}
  }, []);

  // bolinha vermelha do menu "Avisos": avisos atuais que ainda não foram dispensados
  useEffect(() => {
    let vivo = true;
    fetch('/api/avisos/chaves')
      .then((r) => (r.ok ? r.json() : { chaves: [] }))
      .then((d) => vivo && setChavesAvisos(d.chaves || []))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [pathname]);

  useEffect(() => {
    const ler = () => {
      try {
        setVistos(JSON.parse(localStorage.getItem('fixin_avisos_vistos') || '{}'));
      } catch (e) {
        setVistos({});
      }
    };
    ler();
    window.addEventListener('fixin-avisos', ler);
    window.addEventListener('storage', ler);
    return () => {
      window.removeEventListener('fixin-avisos', ler);
      window.removeEventListener('storage', ler);
    };
  }, [pathname]);

  const contagemAvisos = chavesAvisos.filter((k) => !vistos[k]).length;

  function alternarColapso() {
    setCollapsed((v) => {
      const novo = !v;
      try {
        localStorage.setItem('fixin_sidebar_collapsed', novo ? '1' : '0');
      } catch (e) {}
      return novo;
    });
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const roleKey = profile.role === 'master' ? (profile.dono ? 'dono' : 'master') : profile.subrole === 'operacional' ? 'imobiliaria_operacional' : 'imobiliaria_admin';

  return (
    <div className="min-h-screen flex flex-col">
      <div className="app-topbar flex items-center justify-between px-5 py-3.5 border-b border-linha bg-white sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-2">
          <button className="md:hidden border border-linha rounded px-2.5 py-1.5" onClick={() => setOpen((v) => !v)}>
            <Menu size={16} />
          </button>
          <Link href={homeHref} className="flex items-baseline gap-2.5 cursor-pointer">
            <span className="font-slab font-bold text-3xl text-marinho tracking-tight">FixIn</span>
            <span className="text-sm font-mono font-semibold text-verde tracking-wide">REFORMAS</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/conta" title="Minha conta (trocar senha)" className="text-marinho/70 hover:text-marinho hover:underline hidden sm:inline">{profile.nome_completo}</Link>
          <Link href="/conta" title="Minha conta" className="sm:hidden text-marinho/60 border border-linha rounded px-2 py-1"><User size={13} /></Link>
          <span className="text-[10px] font-mono border border-linha rounded px-2 py-0.5 text-marinho/60">{ROLE_LABEL[roleKey]}</span>
          <ThemeToggle />
          <button onClick={sair} className="text-marinho/60 hover:text-erro text-xs border border-linha rounded px-2 py-1 flex items-center gap-1">
            <LogOut size={13} /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-stretch">
        <aside
          className={`app-aside fixed md:static top-[49px] md:top-0 bottom-0 left-0 ${collapsed ? 'md:w-14' : 'w-64'} flex-shrink-0 bg-white border-r border-linha py-3 z-20 overflow-y-auto transition-all md:transition-[width] flex flex-col ${
            open ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="flex-1">
            {tabs.map((t) => {
              const active = pathname === t.href || pathname.startsWith(t.href + '/');
              const ehAvisos = t.href.endsWith('/avisos');
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  title={collapsed ? t.label : undefined}
                  className={`block px-5 py-3 text-base border-l-2 whitespace-nowrap overflow-hidden ${
                    collapsed ? 'md:px-0 md:text-center' : ''
                  } ${active ? 'border-marinho text-marinho font-semibold bg-papel' : 'border-transparent text-marinho/70 hover:bg-papel'}`}
                >
                  <span className={collapsed ? 'md:hidden' : ''}>{t.label}</span>
                  <span className={collapsed ? 'hidden md:inline text-[11px]' : 'hidden'}>{t.label.slice(0, 3).toUpperCase()}</span>
                  {ehAvisos && contagemAvisos > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center bg-erro text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 align-middle">
                      {contagemAvisos}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <button
            onClick={alternarColapso}
            className="hidden md:flex items-center justify-center gap-1 text-xs text-marinho/50 hover:text-marinho border-t border-linha pt-3 mt-2 px-3"
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Minimizar</>}
          </button>
        </aside>

        {open && <div className="fixed inset-0 top-[49px] bg-black/30 z-10 md:hidden" onClick={() => setOpen(false)} />}

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-5 pb-16">{children}</main>
      </div>
    </div>
  );
}
