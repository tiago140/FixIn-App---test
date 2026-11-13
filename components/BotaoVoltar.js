'use client';

import { useRouter } from 'next/navigation';

// Volta para a tela de onde a pessoa veio (ex.: Controle com os filtros que ela tinha).
// Se abriu o link direto (sem histórico do app), vai para a tela padrão.
export default function BotaoVoltar({ fallback, className = 'text-sm text-marinho/50' }) {
  const router = useRouter();
  function voltar(e) {
    e.preventDefault();
    let veioDoApp = false;
    try { veioDoApp = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch (_) {}
    if (veioDoApp && window.history.length > 1) router.back();
    else router.push(fallback);
  }
  return (
    <a href={fallback} onClick={voltar} className={className}>← voltar</a>
  );
}
