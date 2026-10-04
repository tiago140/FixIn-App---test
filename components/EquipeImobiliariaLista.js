'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, KeyRound, UserX, UserCheck, Trash2, Copy } from 'lucide-react';
import SenhaInput from '@/components/SenhaInput';
import { gerarSenha, SENHA_MIN } from '@/lib/senha';
import { fmtDate, fmtDataHora } from '@/lib/format';

const iniciais = (nome) => {
  const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
  return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?';
};

// Equipe da imobiliária, para o administrador: ver quem está cadastrado e gerenciar cada pessoa.
export default function EquipeImobiliariaLista({ equipe, meuId }) {
  const ativos = equipe.filter((p) => p.ativo !== false).length;
  return (
    <div>
      <div className="text-sm text-marinho/60 mb-3">
        <b className="text-marinho">{equipe.length}</b> pessoa(s) cadastrada(s) · <b className="text-marinho">{ativos}</b> com acesso ativo
      </div>
      <div className="grid gap-3">
        {equipe.map((p) => (
          <Pessoa key={p.id} p={p} eu={p.id === meuId} />
        ))}
      </div>
    </div>
  );
}

function Pessoa({ p, eu }) {
  const router = useRouter();
  const [modo, setModo] = useState(null); // null | 'editar' | 'senha' | 'desativar' | 'excluir'
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [form, setForm] = useState({ nome_completo: p.nome_completo || '', email: p.email || '', cpf: p.cpf || '', subrole: p.subrole === 'operacional' ? 'operacional' : 'admin' });
  const [senha, setSenha] = useState('');

  const admin = p.subrole !== 'operacional';
  const desativado = p.ativo === false;
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  function abrir(m) {
    setModo((atual) => (atual === m ? null : m));
    setErro('');
    setAviso('');
  }

  async function chamar(metodo, corpo, aoSucesso) {
    setErro('');
    setCarregando(true);
    const res = await fetch(`/api/imobiliaria/acessos/${p.id}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo || {}),
    });
    const d = await res.json().catch(() => ({}));
    setCarregando(false);
    if (!res.ok) {
      setErro(d.error || 'Não foi possível concluir.');
      return;
    }
    aoSucesso?.();
    router.refresh();
  }

  const botao = 'inline-flex items-center gap-1.5 text-sm font-semibold border border-linha bg-white rounded-lg px-3 py-1.5 hover:bg-papel disabled:opacity-50';

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${desativado ? 'border-erro/30 bg-papel/60' : 'border-linha'}`}>
      <div className="p-4 flex items-start gap-3 flex-wrap">
        <span className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${desativado ? 'bg-marinho/30' : admin ? 'bg-marinho' : 'bg-[#6B7280]'}`}>
          {iniciais(p.nome_completo)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-lg text-marinho">{p.nome_completo}</span>
            {eu && <span className="text-[11px] font-bold rounded-full px-2 py-0.5 bg-marinho/10 text-marinho">Você</span>}
            <span className="text-[11px] font-bold uppercase tracking-wide rounded px-2 py-0.5 text-white" style={{ background: admin ? '#3F7A5E' : '#6B7280' }}>
              {admin ? 'Administrador' : 'Operacional'}
            </span>
            {desativado && <span className="text-[11px] font-bold uppercase tracking-wide rounded px-2 py-0.5 bg-erro text-white">Desativado</span>}
          </div>
          <div className="text-sm text-marinho/70 break-all">{p.email}</div>
          <div className="text-xs text-marinho/50 mt-0.5">
            {p.cpf ? `CPF ${p.cpf} · ` : ''}criado em {fmtDate(p.criado_em)} · {p.ultimo_acesso ? `último acesso ${fmtDataHora(p.ultimo_acesso)}` : 'ainda não entrou'}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className={botao} onClick={() => abrir('editar')}><Pencil size={15} /> Editar</button>
          {!eu && <button type="button" className={botao} onClick={() => abrir('senha')}><KeyRound size={15} /> Trocar senha</button>}
          {!eu && !desativado && <button type="button" className={botao} onClick={() => abrir('desativar')}><UserX size={15} /> Desativar</button>}
          {!eu && desativado && (
            <button type="button" className={botao} disabled={carregando} onClick={() => chamar('PATCH', { acao: 'reativar' })}><UserCheck size={15} /> Reativar</button>
          )}
          {!eu && <button type="button" className={`${botao} text-erro border-erro/40`} onClick={() => abrir('excluir')}><Trash2 size={15} /> Excluir</button>}
        </div>
      </div>

      {modo && (
        <div className="border-t border-linha px-4 py-4 bg-papel/50 rounded-b-lg">
          {erro && <div className="mb-3 text-xs bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
          {aviso && <div className="mb-3 text-xs bg-sucesso/10 border border-sucesso text-sucesso px-3 py-2 rounded">{aviso}</div>}

          {modo === 'editar' && (
            <form
              onSubmit={(e) => { e.preventDefault(); chamar('PATCH', { acao: 'editar', ...form }, () => { setModo(null); }); }}
              className="grid sm:grid-cols-2 gap-3"
            >
              <label className="block text-xs text-marinho/60">Nome completo
                <input value={form.nome_completo} onChange={set('nome_completo')} required className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
              </label>
              <label className="block text-xs text-marinho/60">E-mail (é o login)
                <input type="email" value={form.email} onChange={set('email')} required className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
              </label>
              <label className="block text-xs text-marinho/60">CPF (opcional)
                <input value={form.cpf} onChange={set('cpf')} className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
              </label>
              <label className="block text-xs text-marinho/60">Perfil
                <select value={form.subrole} onChange={set('subrole')} disabled={eu} className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho disabled:opacity-60">
                  <option value="admin">Administrador — vê tudo, inclusive valores e a equipe</option>
                  <option value="operacional">Operacional — sem valores em R$</option>
                </select>
                {eu && <span className="block mt-1 text-[11px]">Você não pode mudar o seu próprio perfil.</span>}
              </label>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setModo(null)} className={botao}>Cancelar</button>
                <button disabled={carregando} className="bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50">{carregando ? 'Salvando…' : 'Salvar alterações'}</button>
              </div>
            </form>
          )}

          {modo === 'senha' && (
            <div className="space-y-3">
              <div className="text-sm text-marinho/70">Defina uma nova senha para <b>{p.nome_completo}</b> (mínimo de {SENHA_MIN} caracteres). Depois avise a pessoa por fora (WhatsApp, telefone).</div>
              <div className="flex gap-2 flex-wrap items-start">
                <div className="w-full max-w-xs">
                  <SenhaInput value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="Nova senha" className="w-full border border-linha rounded px-3 py-2 bg-white text-sm" />
                </div>
                <button type="button" className={botao} onClick={() => { setSenha(gerarSenha()); setAviso(''); }}>Gerar senha</button>
                <button
                  type="button"
                  disabled={carregando || senha.length < SENHA_MIN}
                  className="bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50"
                  onClick={() => chamar('PATCH', { acao: 'redefinir_senha', senha }, () => setAviso(`Senha redefinida. Passe para a pessoa: ${senha}`))}
                >
                  {carregando ? 'Salvando…' : 'Salvar nova senha'}
                </button>
                {aviso && (
                  <button type="button" className={botao} onClick={() => navigator.clipboard?.writeText(senha)}><Copy size={15} /> Copiar</button>
                )}
              </div>
            </div>
          )}

          {modo === 'desativar' && (
            <div className="space-y-3">
              <div className="text-sm">Desativar o acesso de <b>{p.nome_completo}</b>? A pessoa deixa de conseguir entrar na hora, mas o histórico dela é mantido e você pode reativar quando quiser.</div>
              <div className="flex gap-2 justify-end">
                <button type="button" className={botao} onClick={() => setModo(null)}>Cancelar</button>
                <button disabled={carregando} onClick={() => chamar('PATCH', { acao: 'desativar' }, () => setModo(null))} className="bg-erro text-white text-sm font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50">
                  {carregando ? 'Desativando…' : 'Sim, desativar'}
                </button>
              </div>
            </div>
          )}

          {modo === 'excluir' && (p.tem_historico ? (
            <div className="space-y-3">
              <div className="text-sm">
                <b>{p.nome_completo}</b> já tem histórico no sistema (orçamentos, mensagens, comprovantes…). Excluir apagaria o registro de quem fez o quê, por isso só é possível <b>desativar</b> o acesso.
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className={botao} onClick={() => setModo(null)}>Fechar</button>
                {!desativado && <button type="button" className="bg-erro text-white text-sm font-semibold rounded-lg px-4 py-1.5" onClick={() => abrir('desativar')}>Desativar acesso</button>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm">Excluir <b>{p.nome_completo}</b> ({p.email}) de forma definitiva? Essa pessoa nunca usou o sistema. <b>Não dá para desfazer.</b></div>
              <div className="flex gap-2 justify-end">
                <button type="button" className={botao} onClick={() => setModo(null)}>Cancelar</button>
                <button disabled={carregando} onClick={() => chamar('DELETE', {}, () => setModo(null))} className="bg-erro text-white text-sm font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50">
                  {carregando ? 'Excluindo…' : 'Sim, excluir definitivamente'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
