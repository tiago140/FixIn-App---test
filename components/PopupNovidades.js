'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

const COR = { verde: 'bg-verde', erro: 'bg-erro', marinho: 'bg-marinho' };

// Pop-up dentro do app: avisa de ordem nova, ajuste pedido, obra liberada e mensagem, sem precisar de push.
export default function PopupNovidades({ endpoint = '/api/prestador/novidades', chave = 'fixin_vistos' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [fila, setFila] = useState([]);

  const buscar = useCallback(async () => {
    try {
      const r = await fetch(endpoint, { cache: 'no-store' });
      if (!r.ok) return;
      const { itens } = await r.json();
      let vistos = []; try { vistos = JSON.parse(localStorage.getItem(chave) || '[]'); } catch (e) {}
      const novos = (itens || []).filter((i) => !vistos.includes(i.chave) && !pathname.startsWith(i.href));
      setFila((f) => { const ja = new Set(f.map((x) => x.chave)); return [...f, ...novos.filter((n) => !ja.has(n.chave))]; });
    } catch (e) {}
  }, [pathname, endpoint, chave]);

  useEffect(() => {
    buscar();
    const t = setInterval(buscar, 45000);
    const v = () => { if (document.visibilityState === 'visible') buscar(); };
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, [buscar]);

  function dispensar(item, abrir) {
    try { const v = JSON.parse(localStorage.getItem(chave) || '[]'); localStorage.setItem(chave, JSON.stringify([...v, item.chave].slice(-200))); } catch (e) {}
    setFila((f) => f.filter((x) => x.chave !== item.chave));
    if (abrir) router.push(item.href);
  }

  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function aceitar(item) {
    setEnviando(true); setMsg('');
    try {
      const r = await fetch(`/api/prestador/ordens/${item.aceitarId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'aceitar' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j.error || 'Não foi possível aceitar.'); setEnviando(false); return; }
      dispensar(item, true);
    } catch (e) { setMsg('Sem conexão. Tente de novo.'); }
    setEnviando(false);
  }

  const item = fila[0];
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className={`${COR[item.cor] || 'bg-marinho'} text-white px-5 py-4 flex items-center gap-3`}><Bell size={22} /><div className="font-semibold text-lg leading-tight">{item.titulo}</div></div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-marinho/80">{item.texto}</p>
          {msg && <p className="text-sm text-erro">{msg}</p>}
          {fila.length > 1 && <p className="text-xs text-marinho/50">Mais {fila.length - 1} aviso{fila.length > 2 ? 's' : ''} na fila.</p>}
          <div className="flex gap-2">
            {item.aceitarId && <button type="button" disabled={enviando} onClick={() => aceitar(item)} className="flex-1 rounded-full bg-verde text-white py-3 text-sm font-semibold disabled:opacity-60">{enviando ? 'Aceitando…' : 'Aceitar'}</button>}
            <button type="button" onClick={() => dispensar(item, true)} className={`flex-1 rounded-full py-3 text-sm font-semibold ${item.aceitarId ? 'border border-marinho text-marinho' : 'bg-marinho text-white'}`}>{item.aceitarId ? 'Ver detalhes' : 'Abrir'}</button>
            <button type="button" onClick={() => dispensar(item, false)} className="rounded-full border border-linha px-5 py-3 text-sm">Depois</button>
          </div>
        </div>
      </div>
    </div>
  );
}
