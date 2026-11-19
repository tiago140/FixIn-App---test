'use client';

import { useState } from 'react';

export default function BotaoCopiar({ texto, rotulo = 'Copiar' }) {
  const [ok, setOk] = useState(false);
  async function copiar() { try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch (e) {} }
  return <button type="button" onClick={copiar} className="w-full rounded-lg border border-marinho text-marinho py-2 text-sm font-medium">{ok ? 'Copiado!' : rotulo}</button>;
}
