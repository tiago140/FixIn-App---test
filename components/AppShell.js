'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronsLeft, ChevronsRight, LogOut, Menu, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { rotuloPerfil } from '@/lib/permissoes';
import { destravarSom, somLigado, definirSom, tocarSomAviso } from '@/lib/somAviso';

// Cor da etiqueta de perfil (sobre o fundo azul-marinho da barra)
const COR_PERFIL = { Dono: '#B8862E', 'Equipe FixIn': '#3B6B8C', Administrador: '#3F7A5E', Operacional: '#6B7280' };

function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

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

  // bolinha vermelha do menu "Avisos": avisos atuais que ainda não foram dispensados.
  // Consulta de novo a cada 30 s (e ao voltar para a aba); aviso NOVO toca o sinal sonoro.
  const [som, setSom] = useState(true);
  const chavesConhecidas = useRef(null);
  useEffect(() => {
    setSom(somLigado());
    destravarSom();
  }, []);
  useEffect(() => {
    let vivo = true;
    function buscar() {
      fetch('/api/avisos/chaves')
        .then((r) => (r.ok ? r.json() : { chaves: [] }))
        .then((d) => {
          if (!vivo) return;
          const chaves = d.chaves || [];
          if (chavesConhecidas.current) {
            let dispensados = {};
            try { dispensados = JSON.parse(localStorage.getItem('fixin_avisos_vistos') || '{}'); } catch (e) {}
            const novos = chaves.filter((k) => !chavesConhecidas.current.has(k) && !dispensados[k]);
            if (novos.length > 0) tocarSomAviso();
          }
          chavesConhecidas.current = new Set(chaves);
          setChavesAvisos(chaves);
        })
        .catch(() => {});
    }
    buscar();
    const timer = setInterval(buscar, 30000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') buscar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      vivo = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [pathname]);

  function alternarSom() {
    const novo = !som;
    setSom(novo);
    definirSom(novo);
    if (novo) tocarSomAviso();
  }

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

  const perfilRotulo = rotuloPerfil(profile);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="app-topbar h-16 flex items-center justify-between px-3 sm:px-6 bg-marinho text-white sticky top-0 z-30 gap-3 shadow-md border-b border-black/20">
        <div className="flex items-center gap-3">
          <button className="md:hidden bg-white/10 hover:bg-white/20 border border-white/25 rounded-lg px-2.5 py-2" onClick={() => setOpen((v) => !v)} aria-label="Abrir menu">
            <Menu size={18} />
          </button>
          <Link href={homeHref} className="flex items-baseline gap-2.5 cursor-pointer">
            <span className="font-slab font-bold text-2xl sm:text-3xl text-white tracking-tight">FixIn</span>
            <span className="hidden sm:inline text-sm font-mono font-semibold text-white/80 tracking-[0.25em]">REFORMAS</span>
          </Link>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 text-sm">
          <Link href="/conta" title="Minha conta (trocar senha)" className="flex items-center gap-2.5 rounded-lg hover:bg-white/10 pl-1 pr-1 sm:pr-3 py-1">
            <span className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center font-bold text-sm">
              {iniciais(profile.nome_completo)}
            </span>
            <span className="hidden sm:block leading-tight text-left">
              <span className="block font-semibold text-white">{profile.nome_completo}</span>
              <span className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 text-white" style={{ background: COR_PERFIL[perfilRotulo] || '#6B7280' }}>
                  {perfilRotulo}
                </span>
                {profile.empresa && <span className="hidden lg:inline text-[11px] text-white/70 truncate max-w-[220px]">{profile.empresa}</span>}
              </span>
            </span>
          </Link>
          <a
            href="https://wa.me/5515996540710?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20sistema%20de%20or%C3%A7amentos%20FixIn."
            target="_blank"
            rel="noreferrer"
            className="bg-[#3F7A5E] hover:brightness-110 text-white font-semibold rounded-lg px-2.5 sm:px-4 py-2 flex items-center gap-2 whitespace-nowrap shadow-sm"
            title="Falar com o suporte pelo WhatsApp"
          >
            <MessageCircle size={18} /> <span className="hidden sm:inline">Suporte</span>
          </a>
          <button onClick={alternarSom} className="bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-lg px-2.5 py-2 flex items-center gap-2" title={som ? 'Som dos avisos ligado (clique para desligar)' : 'Som dos avisos desligado (clique para ligar)'}>
            {som ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <ThemeToggle />
          <button onClick={sair} className="bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-lg px-2.5 sm:px-3 py-2 flex items-center gap-2" title="Sair">
            <LogOut size={18} /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-stretch">
        <aside
          className={`app-aside fixed md:static top-16 md:top-0 bottom-0 left-0 ${collapsed ? 'md:w-14' : 'w-64'} flex-shrink-0 bg-white border-r border-linha py-3 z-20 overflow-y-auto transition-all md:transition-[width] flex flex-col ${
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

        {open && <div className="fixed inset-0 top-16 bg-black/30 z-10 md:hidden" onClick={() => setOpen(false)} />}

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-5 pb-16">{children}</main>
      </div>
    </div>
  );
}
