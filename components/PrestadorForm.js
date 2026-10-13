'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BANCOS = ['Asaas', 'Banco do Brasil', 'Bradesco', 'Caixa Econômica', 'C6 Bank', 'Inter', 'Itaú', 'Mercado Pago', 'Nubank', 'PagBank', 'Santander', 'Sicoob', 'Sicredi', 'Outro'];
const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';

function Campo({ rotulo, dica, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-marinho/70 mb-1">{rotulo}</span>
      {children}
      {dica && <span className="block text-[11px] text-marinho/45 mt-1">{dica}</span>}
    </label>
  );
}

// modo: 'novo' | 'editar' (equipe FixIn) | 'proprio' (o próprio prestador, sem nome/carteira/ativo)
export default function PrestadorForm({ inicial = {}, modo = 'novo' }) {
  const router = useRouter();
  const [f, setF] = useState({
    nome: '', email: '', telefone: '', tipo_pessoa: 'pf', cpf: '', rg: '', cnpj: '', razao_social: '',
    banco: '', agencia: '', conta: '', tipo_conta: 'corrente', pix_tipo: 'cpf', pix_chave: '', asaas_wallet_id: '', ativo: true,
    ...Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, v ?? (k === 'ativo' ? true : '')])),
  });
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (c) => (e) => setF((x) => ({ ...x, [c]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const pj = f.tipo_pessoa === 'pj';

  async function salvar(e) {
    e.preventDefault();
    setErro(''); setOk(''); setSalvando(true);
    const url = modo === 'proprio' ? '/api/prestador/dados' : modo === 'editar' ? `/api/prestadores/${inicial.id}` : '/api/prestadores';
    const res = await fetch(url, { method: modo === 'novo' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const data = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) return setErro(data.error || 'Erro ao salvar');
    if (modo === 'novo') { router.push(`/master/prestadores/${data.id}`); router.refresh(); return; }
    setOk('Dados salvos.');
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-5 max-w-3xl">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
      {ok && <div className="text-sm bg-sucesso/10 border border-sucesso text-sucesso px-3 py-2 rounded-lg">{ok}</div>}

      <section className="card p-5 rounded-xl">
        <h3 className="font-semibold mb-3">Identificação</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {modo !== 'proprio' && <Campo rotulo="Nome completo" className="sm:col-span-2"><input value={f.nome} onChange={set('nome')} required className={ent} /></Campo>}
          <Campo rotulo="E-mail" dica="Recebe as ordens de serviço e avisos."><input type="email" value={f.email} onChange={set('email')} className={ent} /></Campo>
          <Campo rotulo="Telefone / WhatsApp"><input value={f.telefone} onChange={set('telefone')} className={ent} /></Campo>
          <Campo rotulo="Tipo de cadastro">
            <select value={f.tipo_pessoa} onChange={set('tipo_pessoa')} className={ent}>
              <option value="pf">Pessoa física (CPF)</option>
              <option value="pj">Empresa / MEI (CNPJ)</option>
            </select>
          </Campo>
          <Campo rotulo="CPF"><input value={f.cpf} onChange={set('cpf')} className={ent} /></Campo>
          {!pj && <Campo rotulo="RG"><input value={f.rg} onChange={set('rg')} className={ent} /></Campo>}
          {pj && <Campo rotulo="CNPJ"><input value={f.cnpj} onChange={set('cnpj')} className={ent} /></Campo>}
          {pj && <Campo rotulo="Razão social" className="sm:col-span-2"><input value={f.razao_social} onChange={set('razao_social')} className={ent} /></Campo>}
        </div>
      </section>

      <section className="card p-5 rounded-xl">
        <h3 className="font-semibold mb-1">Dados para pagamento</h3>
        <p className="text-xs text-marinho/50 mb-3">Usados para pagar o prestador e vincular à conta Asaas. Confira antes de qualquer pagamento.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Banco">
            <input list="bancos" value={f.banco} onChange={set('banco')} className={ent} />
            <datalist id="bancos">{BANCOS.map((b) => <option key={b} value={b} />)}</datalist>
          </Campo>
          <Campo rotulo="Tipo de conta">
            <select value={f.tipo_conta} onChange={set('tipo_conta')} className={ent}>
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupança</option>
              <option value="pagamento">Conta de pagamento</option>
            </select>
          </Campo>
          <Campo rotulo="Agência"><input value={f.agencia} onChange={set('agencia')} className={ent} /></Campo>
          <Campo rotulo="Conta com dígito"><input value={f.conta} onChange={set('conta')} className={ent} /></Campo>
          <Campo rotulo="Tipo da chave Pix">
            <select value={f.pix_tipo} onChange={set('pix_tipo')} className={ent}>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="telefone">Telefone</option>
              <option value="aleatoria">Chave aleatória</option>
            </select>
          </Campo>
          <Campo rotulo="Chave Pix"><input value={f.pix_chave} onChange={set('pix_chave')} className={ent} /></Campo>
          {modo !== 'proprio' && (
            <Campo rotulo="Carteira Asaas (walletId)" dica="Preenchido pela FixIn quando a conta do prestador for vinculada." className="sm:col-span-2">
              <input value={f.asaas_wallet_id} onChange={set('asaas_wallet_id')} className={ent} />
            </Campo>
          )}
        </div>
      </section>

      {modo === 'editar' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f.ativo} onChange={set('ativo')} /> Prestador ativo (pode receber ordens)
        </label>
      )}

      <button disabled={salvando} className="bg-marinho text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
        {salvando ? 'Salvando…' : modo === 'novo' ? 'Cadastrar prestador' : 'Salvar dados'}
      </button>
    </form>
  );
}
