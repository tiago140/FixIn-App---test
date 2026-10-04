'use client';

import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';

// Alterna o fundo entre "Creme" (padrão) e "Claro" (branco). A escolha fica salva no navegador.
export default function ThemeToggle() {
  const [tema, setTema] = useState('creme');

  useEffect(() => {
    setTema(document.documentElement.getAttribute('data-bg') === 'claro' ? 'claro' : 'creme');
  }, []);

  function alternar() {
    const novo = tema === 'claro' ? 'creme' : 'claro';
    setTema(novo);
    document.documentElement.setAttribute('data-bg', novo);
    try {
      localStorage.setItem('fixin_bg_theme', novo);
    } catch (e) {}
  }

  return (
    <button
      onClick={alternar}
      title="Alternar fundo claro/creme"
      aria-label="Alternar fundo claro/creme"
      className="bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-lg px-2.5 sm:px-3 py-2 flex items-center gap-2 whitespace-nowrap"
    >
      <Palette size={18} /> <span className="hidden md:inline">{tema === 'claro' ? 'Creme' : 'Claro'}</span>
    </button>
  );
}
