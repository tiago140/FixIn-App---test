'use client';
import { useState } from 'react';
import { AREAS_SERVICO } from '@/lib/areasServico';

const ent = 'w-full border border-linha rounded-lg px-3 py-2.5 bg-white text-sm';
const Campo = ({ rotulo, dica, children, className = '' }) => (
  <label className={`block ${className}`}><span className="block text-xs font-semibold text-marinho/70 mb-1">{rotulo}</span>{children}{dica && <span className="block text-[11px] text-marinho/50 mt-1">{dica}</span>}</label>
);

export default function CadastroPrestadorForm() {
  const [f, setF] = useState({ tipo_pessoa: 'pf', nome: '', cpf: '', cnpj: '', razao_social: '', telefone: '', email: '', cidade: '', areas: [], experiencia: '', pix_tipo: 'cpf', pix_chave: '', banco: '', agencia: '', conta: '', tipo_conta: 'corrente', aceite: false, site: '' });
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (c) => (e) => setF((x) => ({ ...x, [c]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const pj = f.tipo_pessoa === 'pj';

  async function enviar(e) {
    e.preventDefault(); setErro(''); setBusy(true);
    try {
      const r = await fetch('/api/cadastro-prestador', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j.error || 'Não foi possível enviar.'); return; }
      setEnviado(true);
    } finally { setBusy(false); }
  }

  if (enviado) return (
    <div className="bg-white rounded-xl border border-linha p-6 text-center">
      <div className="text-lg font-semibold text-marinho">Cadastro enviado!</div>
      <p className="text-sm text-marinho/70 mt-2">A equipe da FixIn vai conferir seus dados e entrar em contato pelo telefone ou e-mail informado.</p>
    </div>
  );

  return (
    <form onSubmit={enviar} className="space-y-5">
      {erro && <div className="text-sm bg-red-50 border border-red-300 text-red-800 px-3 py-2 rounded-lg">{erro}</div>}
      <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={f.site} onChange={set('site')} /></div>

      <section className="bg-white border border-linha rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-marinho">Quem é você</h2>
        <Campo rotulo="Tipo de cadastro">
          <select value={f.tipo_pessoa} onChange={set('tipo_pessoa')} className={ent}><option value="pf">Pessoa física (CPF)</option><option value="pj">Empresa / MEI (CNPJ)</option></select>
        </Campo>
        <Campo rotulo="Nome completo *"><input value={f.nome} onChange={set('nome')} required className={ent} /></Campo>
        {pj ? (<>
          <Campo rotulo="CNPJ *"><input value={f.cnpj} onChange={set('cnpj')} inputMode="numeric" className={ent} /></Campo>
          <Campo rotulo="Razão social *"><input value={f.razao_social} onChange={set('razao_social')} className={ent} /></Campo>
        </>) : (
          <Campo rotulo="CPF *"><input value={f.cpf} onChange={set('cpf')} inputMode="numeric" className={ent} /></Campo>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Telefone / WhatsApp com DDD *"><input value={f.telefone} onChange={set('telefone')} inputMode="tel" className={ent} /></Campo>
          <Campo rotulo="E-mail *" dica="Recebe as ordens de serviço."><input type="email" value={f.email} onChange={set('email')} className={ent} /></Campo>
        </div>
      </section>

      <section className="bg-white border border-linha rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-marinho">Onde e em que você atua</h2>
        <Campo rotulo="Cidade ou região em que atende *"><input value={f.cidade} onChange={set('cidade')} placeholder="Ex.: Sorocaba e região" className={ent} /></Campo>
        <div>
          <span className="block text-xs font-semibold text-marinho/70 mb-2">Áreas de atuação * (escolha quantas quiser)</span>
          <div className="flex flex-wrap gap-2">
            {AREAS_SERVICO.map((a) => {
              const on = f.areas.includes(a);
              return <button key={a} type="button" onClick={() => setF((x) => ({ ...x, areas: on ? x.areas.filter((y) => y !== a) : [...x.areas, a] }))} className={`rounded-full px-3.5 py-2 text-sm border ${on ? 'bg-marinho text-white border-marinho' : 'border-linha bg-white'}`}>{a}</button>;
            })}
          </div>
        </div>
        <Campo rotulo="Experiência (opcional)" dica="Há quanto tempo atua, tipos de obra, se tem equipe."><textarea rows={3} value={f.experiencia} onChange={set('experiencia')} className={ent} /></Campo>
      </section>

      <section className="bg-white border border-linha rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-marinho">Como você recebe</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Tipo da chave Pix *"><select value={f.pix_tipo} onChange={set('pix_tipo')} className={ent}><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Chave aleatória</option></select></Campo>
          <Campo rotulo="Chave Pix *"><input value={f.pix_chave} onChange={set('pix_chave')} className={ent} /></Campo>
        </div>
        <p className="text-[11px] text-marinho/50">Dados bancários são opcionais.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Campo rotulo="Banco"><input value={f.banco} onChange={set('banco')} className={ent} /></Campo>
          <Campo rotulo="Agência"><input value={f.agencia} onChange={set('agencia')} className={ent} /></Campo>
          <Campo rotulo="Conta"><input value={f.conta} onChange={set('conta')} className={ent} /></Campo>
        </div>
      </section>

      <label className="flex items-start gap-2 text-sm text-marinho"><input type="checkbox" checked={f.aceite} onChange={set('aceite')} className="mt-1" /> Declaro que as informações acima são verdadeiras.</label>
      <button disabled={busy} className="w-full rounded-lg bg-marinho text-white py-3 font-semibold disabled:opacity-60">{busy ? 'Enviando…' : 'Enviar cadastro'}</button>
    </form>
  );
}
