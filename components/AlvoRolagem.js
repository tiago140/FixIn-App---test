'use client';

import { ChevronDown } from 'lucide-react';

// Um temporizador por cartão: se o indicador for clicado de novo, o temporizador antigo é cancelado
// (senão ele apagaria o destaque do clique novo antes da hora).
const temporizadores = new WeakMap();

// Torna um cartão/indicador clicável: leva até a lista de orçamentos lá embaixo, no primeiro cartão que entra
// naquela conta, e destaca por um instante todos os cartões que a compõem (marcados com data-kpi="...").
// n = quantidade; com zero não há o que mostrar, então não vira clicável.
export default function AlvoRolagem({ alvo, n = 1, rotulo, children, dica = true, className = '' }) {
  function ir() {
    // cartões que estão escondidos atrás de "Mostrar os outros N": abre antes, para destacar TODOS
    if (alvo !== 'criado') {
      const botoes = new Set(
        Array.from(document.querySelectorAll(`[data-kpi~="${alvo}"]`))
          .filter((el) => el.closest('[data-extra]')?.classList.contains('hidden'))
          .map((el) => el.closest('section')?.querySelector('[data-mostrar-todos]'))
          .filter(Boolean)
      );
      if (botoes.size) {
        botoes.forEach((b) => b.click());
        setTimeout(rolarEDestacar, 80);
        return;
      }
    }
    rolarEDestacar();
  }

  function rolarEDestacar() {
    const reduzMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const itens = alvo === 'criado' ? [] : Array.from(document.querySelectorAll(`[data-kpi~="${alvo}"]`));
    const secao = itens[0]?.closest('section');
    const destino = secao || document.getElementById('lista-orcamentos');
    destino?.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
    itens.forEach((el) => {
      el.classList.remove('kpi-flash');
      void el.offsetWidth; // reinicia a animação se clicar de novo
      el.classList.add('kpi-flash');
      clearTimeout(temporizadores.get(el));
      temporizadores.set(el, setTimeout(() => el.classList.remove('kpi-flash'), 2400));
    });
  }

  if (!n) return <div className={className} aria-disabled="true">{children}</div>;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={rotulo || 'Ver na lista abaixo'}
      title="Ver na lista abaixo"
      onClick={ir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ir();
        }
      }}
      className={`relative cursor-pointer group transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-marinho rounded-lg ${className}`}
    >
      {children}
      {dica && <ChevronDown size={16} className="absolute right-3 bottom-2 text-marinho/35 group-hover:text-marinho/70" />}
    </div>
  );
}
