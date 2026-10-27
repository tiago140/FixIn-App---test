'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtBRL, fmtDataHoraSP } from '@/lib/format';

export default function AvisosList({ solicitacoes = [], visitas, atrasos, mensagens, chamados = [], estornos = [] }) {
  const [vistos, setVistos] = useState({});
  const [aba, setAba] = useState('todos');

  useEffect(() => {
    try {
      setAba(localStorage.getItem('fixin_avisos_aba') || 'todos');
    } catch (e) {}
    try {
      setVistos(JSON.parse(localStorage.getItem('fixin_avisos_vistos') || '{}'));
    } catch (e) {
      setVistos({});
    }
  }, []);

  function dispensar(key) {
    setVistos((v) => {
      const novo = { ...v, [key]: true };
      try {
        localStorage.setItem('fixin_avisos_vistos', JSON.stringify(novo));
        window.dispatchEvent(new Event('fixin-avisos'));
      } catch (e) {}
      return novo;
    });
  }

  const solicitacoesVisiveis = (solicitacoes || []).filter((s) => !vistos[s.key]);
  const visitasVisiveis = (visitas || []).filter((v) => !vistos[v.key]);
  const atrasosVisiveis = (atrasos || []).filter((a) => !vistos[a.key]);
  const chamadosVisiveis = (chamados || []).filter((c) => !vistos[c.key]);
  const estornosVisiveis = (estornos || []).filter((x) => !vistos[x.key]);
  const mensagensVisiveis = (mensagens || []).filter((m) => !vistos[m.key]);

  if (solicitacoesVisiveis.length === 0 && visitasVisiveis.length === 0 && atrasosVisiveis.length === 0 && mensagensVisiveis.length === 0 && chamadosVisiveis.length === 0 && estornosVisiveis.length === 0) {
    return <div className="border border-dashed border-linha p-8 text-center text-marinho/50">Nenhum aviso no momento. Tudo em dia.</div>;
  }

  function escolherAba(a) {
    setAba(a);
    try { localStorage.setItem('fixin_avisos_aba', a); } catch (e) {}
  }
  const ABAS = [
    ['todos', 'Todos', solicitacoesVisiveis.length + chamadosVisiveis.length + mensagensVisiveis.length + visitasVisiveis.length + atrasosVisiveis.length + estornosVisiveis.length],
    ['solicitacoes', 'Orçamentos novos', solicitacoesVisiveis.length],
    ['chamados', 'Chamados', chamadosVisiveis.length],
    ['mensagens', 'Mensagens', mensagensVisiveis.length],
    ['visitas', 'Visitas', visitasVisiveis.length],
    ['atrasos', 'Atrasos', atrasosVisiveis.length],
    ['estornos', 'Estornos', estornosVisiveis.length],
  ].filter(([k, , n]) => k === 'todos' || n > 0 || aba === k);
  const ver = (k) => aba === 'todos' || aba === k;

  // Uma lista só: cada aviso diz o que é, tem um botão claro para resolver ("Abrir") e outro para tirar da lista ("Já vi").
  const TIPOS = {
    solicitacoes: { tag: () => 'Novo orçamento', cor: 'bg-marinho text-white', borda: 'border-l-marinho', abrir: 'Abrir e orçar', lista: solicitacoesVisiveis },
    chamados: { tag: (x) => (x.novo ? 'Novo chamado' : 'Nova resposta'), cor: 'bg-verde text-white', borda: 'border-l-verde', abrir: 'Abrir chamado', lista: chamadosVisiveis },
    mensagens: { tag: () => 'Mensagem', cor: 'bg-info text-white', borda: 'border-l-info', abrir: 'Abrir conversa', lista: mensagensVisiveis },
    visitas: { tag: () => 'Visita', cor: 'bg-alerta text-white', borda: 'border-l-alerta', abrir: 'Abrir visitas', lista: visitasVisiveis },
    estornos: { tag: () => 'Pedido de estorno', cor: 'bg-erro text-white', borda: 'border-l-erro', abrir: 'Analisar pedido', lista: estornosVisiveis },
    atrasos: { tag: () => 'Pagamento em atraso', cor: 'bg-erro text-white', borda: 'border-l-erro', abrir: 'Abrir orçamento', lista: atrasosVisiveis },
  };
  const avisos = Object.entries(TIPOS)
    .filter(([k]) => ver(k))
    .flatMap(([k, t]) => t.lista.map((x) => ({ x, k, t })))
    .sort((a, b) => String(b.x.criado_em || '').localeCompare(String(a.x.criado_em || '')));

  function dispensarTodos() {
    if (!window.confirm(`Tirar ${avisos.length} aviso(s) da lista? Eles não somem do sistema, só deixam de aparecer aqui.`)) return;
    setVistos((v) => {
      const novo = { ...v };
      avisos.forEach(({ x }) => { novo[x.key] = true; });
      try { localStorage.setItem('fixin_avisos_vistos', JSON.stringify(novo)); window.dispatchEvent(new Event('fixin-avisos')); } catch (e) {}
      return novo;
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {ABAS.map(([k, rotulo, n]) => (
            <button key={k} type="button" onClick={() => escolherAba(k)} className={`text-sm rounded-full px-4 py-1.5 border font-semibold ${aba === k ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho bg-white'}`}>{rotulo} <span className={aba === k ? 'text-white/70' : 'text-marinho/40'}>{n}</span></button>
          ))}
        </div>
        {avisos.length > 3 && <button type="button" onClick={dispensarTodos} className="text-sm font-semibold text-marinho/60 underline">Já vi todos</button>}
      </div>
      <div className="space-y-3">
        {avisos.map(({ x, k, t }) => (
          <div key={x.key} className={`card border-l-4 ${t.borda} p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${t.cor}`}>{t.tag(x)}</span>
              {x.subtitulo && <span className="text-xs font-mono text-marinho/50">{x.subtitulo}</span>}
              {x.criado_em && <span className="ml-auto text-xs text-marinho/50">{fmtDataHoraSP(x.criado_em)}</span>}
            </div>
            <div className="mt-1.5 text-base font-semibold text-marinho">{x.titulo}</div>
            {x.detalhe && <div className="mt-0.5 text-sm text-marinho/60">{x.detalhe}</div>}
            {k === 'atrasos' && x.valor != null && <div className="mt-1 font-mono text-sm font-semibold text-erro">{fmtBRL(x.valor)} pendente</div>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href={x.link} className="inline-flex min-h-[40px] items-center rounded-lg bg-marinho px-4 py-2 text-sm font-semibold text-white">{t.abrir}</Link>
              <button type="button" onClick={() => dispensar(x.key)} className="inline-flex min-h-[40px] items-center rounded-lg border border-linha bg-white px-4 py-2 text-sm font-semibold text-marinho/70 hover:border-marinho/40">Já vi</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
