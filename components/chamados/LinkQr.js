'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Link público da imobiliária para abrir chamados + QR Code (para imprimir e colar no imóvel/contrato).
export default function LinkQr({ slug, nome }) {
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState('');
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    const u = `${window.location.origin}/chamados/${slug}`;
    setUrl(u);
    QRCode.toDataURL(u, { width: 320, margin: 1, color: { dark: '#182F50', light: '#FFFFFF' } }).then(setQr).catch(() => {});
  }, [slug]);
  return (
    <div className="bg-white border border-linha rounded-lg p-4 flex gap-4 items-center flex-wrap mb-6">
      {qr && <img src={qr} alt="QR Code para abrir chamado" className="w-28 h-28 border border-linha rounded" />}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-marinho">Link para locatários e locadores{nome ? ` — ${nome}` : ''}</div>
        <div className="text-sm break-all text-marinho/70 mt-1">{url}</div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <button onClick={() => { navigator.clipboard?.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }} className="text-sm border border-linha rounded-md px-3 py-1.5 hover:bg-fundo">{copiado ? 'Copiado!' : 'Copiar link'}</button>
          {qr && <a href={qr} download={`qr-chamados-${slug}.png`} className="text-sm border border-linha rounded-md px-3 py-1.5 hover:bg-fundo">Baixar QR Code</a>}
        </div>
      </div>
    </div>
  );
}
