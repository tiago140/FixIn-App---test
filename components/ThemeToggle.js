'use client';

import { useEffect, useState } from 'react';

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
      className="text-marinho/70 hover:text-marinho text-xs border border-linha rounded px-2 py-1 whitespace-nowrap"
    >
      🎨 {tema === 'claro' ? 'Creme' : 'Claro'}
    </button>
  );
}
