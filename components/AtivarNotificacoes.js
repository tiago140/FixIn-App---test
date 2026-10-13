'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

function chaveParaBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Cartão discreto no canto: pede permissão para avisar de novas ordens no celular. Só aparece se o sistema tiver as chaves configuradas.
export default function AtivarNotificacoes({ chavePublica }) {
  const [estado, setEstado] = useState('oculto'); // oculto | oferecer | ativo | ios | negado
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!chavePublica) return;
    if (!('serviceWorker' in navigator)) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw-prestador.js', { scope: '/prestador' });
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
        if (!('PushManager' in window)) { if (ios && !instalado && localStorage.getItem('fixin_push_ios_visto') !== '1') setEstado('ios'); return; }
        if (Notification.permission === 'denied') return;
        const sub = await reg.pushManager.getSubscription();
        if (sub) { await fetch('/api/prestador/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) }); return; }
        if (localStorage.getItem('fixin_push_dispensado') === '1') return;
        setEstado('oferecer');
      } catch (e) {}
    })();
  }, [chavePublica]);

  async function ativar() {
    setErro('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setEstado('negado'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chavePublica) });
      const res = await fetch('/api/prestador/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!res.ok) throw new Error('falha');
      setEstado('ativo');
      setTimeout(() => setEstado('oculto'), 3500);
    } catch (e) { setErro('Não foi possível ativar. Tente de novo.'); }
  }
  function dispensar(chave) { try { localStorage.setItem(chave, '1'); } catch (e) {} setEstado('oculto'); }

  if (estado === 'oculto' || estado === 'negado') return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-96 z-40 bg-white border border-linha shadow-xl rounded-2xl p-4">
      {estado === 'ativo' ? <p className="text-sm font-semibold text-sucesso">Notificações ativadas neste aparelho.</p> : (
        <div className="flex gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-marinho text-white flex items-center justify-center"><Bell size={18} /></span>
          <div className="flex-1 text-sm">
            {estado === 'oferecer' && (<>
              <p className="font-semibold">Receber aviso de nova ordem no celular?</p>
              <p className="text-xs text-marinho/60 mt-0.5">Quando a FixIn enviar uma ordem, o celular avisa e abre o PDF dela.</p>
              {erro && <p className="text-xs text-erro mt-1">{erro}</p>}
              <div className="flex gap-2 mt-2"><button onClick={ativar} className="bg-verde text-white rounded-lg px-3 py-1.5 text-xs font-semibold">Ativar</button><button onClick={() => dispensar('fixin_push_dispensado')} className="border border-linha rounded-lg px-3 py-1.5 text-xs">Agora não</button></div>
            </>)}
            {estado === 'ios' && (<>
              <p className="font-semibold">Para receber avisos no iPhone</p>
              <p className="text-xs text-marinho/60 mt-0.5">Toque em Compartilhar e em &quot;Adicionar à Tela de Início&quot;. Abra o portal pelo ícone novo e ative as notificações.</p>
              <button onClick={() => dispensar('fixin_push_ios_visto')} className="border border-linha rounded-lg px-3 py-1.5 text-xs mt-2">Entendi</button>
            </>)}
          </div>
          <button onClick={() => dispensar(estado === 'ios' ? 'fixin_push_ios_visto' : 'fixin_push_dispensado')} className="text-marinho/40 self-start" aria-label="Fechar"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
