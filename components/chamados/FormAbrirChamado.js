'use client';
import { useState } from 'react';

export default function FormAbrirChamado({ slug, imobiliaria }) {
  const [tipo, setTipo] = useState('locatario');
  const [arquivos, setArquivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(null);
  const [copiado, setCopiado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true); setErro('');
    const fd = new FormData(e.currentTarget);
    fd.set('slug', slug); fd.set('tipo', tipo);
    fd.delete('arquivos'); arquivos.forEach((f) => fd.append('arquivos', f));
    try {
      const r = await fetch('/api/chamados/abrir', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não foi possível enviar.');
      setOk(j);
    } catch (err) { setErro(err.message); }
    setEnviando(false);
  }

  if (ok) {
    const link = ok.token ? `${window.location.origin}/c/${ok.token}` : null;
    return (
      <div className="bg-white border border-linha rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h2 className="font-slab text-2xl font-bold text-marinho">Chamado {ok.numero || ''} aberto!</h2>
        <p className="text-marinho/70 mt-2">A {imobiliaria} já foi avisada. Guarde o link abaixo: é por ele que você acompanha, conversa e aprova o orçamento.</p>
        {link && (
          <>
            <a href={link} className="block mt-4 bg-marinho text-white font-semibold rounded-md px-4 py-3">Acompanhar meu chamado</a>
            <div className="mt-3 text-xs break-all bg-fundo border border-linha rounded p-2">{link}</div>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(link); setCopiado(true); }} className="mt-2 text-sm underline text-marinho">{copiado ? 'Link copiado!' : 'Copiar link'}</button>
            <p className="text-xs text-erro mt-3">Este link é pessoal: quem tiver acesso a ele vê o chamado. Não compartilhe.</p>
          </>
        )}
      </div>
    );
  }

  const campo = 'w-full border border-linha rounded-md px-3 py-2 text-sm bg-white';
  return (
    <form onSubmit={enviar} className="bg-white border border-linha rounded-lg p-5 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {[['locatario', 'Sou locatário (moro no imóvel)'], ['locador', 'Sou locador (proprietário)']].map(([v, r]) => (
          <button type="button" key={v} onClick={() => setTipo(v)} className={`rounded-md border px-3 py-2 text-sm font-semibold ${tipo === v ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho'}`}>{r}</button>
        ))}
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div><label className="text-sm font-semibold text-marinho">Seu nome *</label><input name="nome" required maxLength={120} className={campo} /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-sm font-semibold text-marinho">E-mail</label><input name="email" type="email" maxLength={200} className={campo} /></div>
        <div><label className="text-sm font-semibold text-marinho">Telefone / WhatsApp</label><input name="telefone" maxLength={30} className={campo} /></div>
      </div>
      <p className="text-xs text-marinho/50 -mt-2">Informe pelo menos um dos dois.</p>
      <div><label className="text-sm font-semibold text-marinho">Endereço do imóvel *</label><input name="endereco" required maxLength={250} className={campo} /></div>
      <div><label className="text-sm font-semibold text-marinho">Assunto *</label><input name="titulo" required maxLength={120} placeholder="Ex.: Vazamento no banheiro" className={campo} /></div>
      <div><label className="text-sm font-semibold text-marinho">Descreva o problema *</label><textarea name="descricao" required rows={5} maxLength={3000} className={campo} /></div>
      <div>
        <label className="text-sm font-semibold text-marinho">Fotos (opcional, até 6, 8 MB cada)</label>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setArquivos(Array.from(e.target.files || []))} className="block mt-1 text-sm" />
      </div>
      {erro && <p className="text-sm text-erro">{erro}</p>}
      <button disabled={enviando} className="w-full bg-marinho text-white font-semibold rounded-md px-4 py-3 disabled:opacity-50">{enviando ? 'Enviando…' : 'Abrir chamado'}</button>
      <p className="text-xs text-marinho/50">Seus dados são usados somente para atender este chamado.</p>
    </form>
  );
}
