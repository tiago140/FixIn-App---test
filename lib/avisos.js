import { calcularTotalComMargem, estaAtrasado, diasDesde } from './format';
import { veValores } from './permissoes';

// Monta os avisos de quem está logado (dono ou imobiliária).
// Usado pela página de Avisos e pela contagem (bolinha vermelha) do menu.
export async function buscarAvisos(supabase, profile) {
  if (profile.role === 'master') return avisosDoDono(supabase);
  return avisosDaImobiliaria(supabase, profile);
}

async function avisosDoDono(supabase) {
  const { data: orcamentos } = await supabase.from('orcamentos').select('*, clientes(nome_empresa), orcamento_itens(mo,ma)');
  const { data: visitas } = await supabase.from('visitas').select('*, clientes(nome_empresa)').eq('status', 'pendente');
  const { data: mensagensRecentes } = await supabase
    .from('mensagens')
    .select('*, orcamentos(numero, endereco, cliente_id, clientes(nome_empresa))')
    .eq('autor_role', 'imobiliaria')
    .order('criado_em', { ascending: false })
    .limit(30);

  const atrasos = (orcamentos || [])
    .filter(estaAtrasado)
    .map((o) => ({
      key: `atraso-${o.id}-${o.valor_pago || 0}`,
      tipo: 'atraso',
      titulo: o.endereco,
      subtitulo: `${o.numero} · ${o.clientes?.nome_empresa || ''}`,
      detalhe: o.aprovado_em ? `Aprovado há ${diasDesde(o.aprovado_em)} dias, ainda pendente de pagamento` : '',
      valor: Math.max(0, calcularTotalComMargem(o.orcamento_itens, o.margem_percentual) - (o.valor_pago || 0)),
      link: `/master/orcamentos/${o.id}`,
    }));

  const visitasAvisos = (visitas || []).map((v) => ({
    key: `visita-pendente-${v.id}`,
    tipo: 'visita',
    titulo: v.endereco,
    subtitulo: v.clientes?.nome_empresa || '',
    detalhe: v.solicitado_por ? `Solicitado por ${v.solicitado_por}` : '',
    link: '/master/visitas',
  }));

  const mensagens = (mensagensRecentes || [])
    .filter((m) => m.orcamentos)
    .filter((m) => diasDesde(m.criado_em) <= 5)
    .map((m) => ({
      key: `msg-${m.id}`,
      titulo: m.orcamentos.endereco,
      subtitulo: `${m.orcamentos.numero} · ${m.orcamentos.clientes?.nome_empresa || ''}`,
      detalhe: `${m.autor_nome}: ${m.texto ? m.texto.slice(0, 80) : '[anexo enviado]'}`,
      link: `/master/orcamentos/${m.orcamento_id}#chat`,
    }));

  // Orçamentos que a imobiliária SOLICITOU (vieram com solicitado_por) e ainda estão "pendentes": ninguém da FixIn mexeu.
  const solicitacoes = (orcamentos || [])
    .filter((o) => o.status === 'pendente' && o.solicitado_por)
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    .map((o) => {
      const qtd = (o.orcamento_itens || []).length;
      const sem = (o.orcamento_itens || []).filter((i) => (Number(i.mo) || 0) + (Number(i.ma) || 0) === 0).length;
      return {
        key: `solicitacao-${o.id}`,
        tipo: 'solicitacao',
        titulo: o.endereco,
        subtitulo: `${o.numero} · ${o.clientes?.nome_empresa || ''}`,
        detalhe: `Solicitado por ${o.solicitado_por}${o.tipo === 'manutencao' ? ' · manutenção' : ''} · ${qtd ? `${qtd} ${qtd === 1 ? 'item' : 'itens'}${sem ? `, ${sem} sem preço` : ''}` : 'sem itens (só a descrição)'}`,
        link: `/master/orcamentos/${o.id}`,
        criado_em: o.criado_em,
      };
    });

  return { solicitacoes, visitas: visitasAvisos, atrasos, mensagens };
}

async function avisosDaImobiliaria(supabase, profile) {
  const ver = veValores(profile);
  // Pela visão protegida: o atraso já vem como sim/não e o valor só vem para o administrador.
  const { data: orcamentos } = await supabase.from('orcamentos_cliente').select('id, numero, endereco, aprovado_em, em_atraso, valor_pago, valor_pendente');
  const { data: visitas } = await supabase.from('visitas').select('*').neq('status', 'pendente');
  const { data: mensagensBrutas } = await supabase
    .from('mensagens')
    .select('*')
    .eq('autor_role', 'master')
    .order('criado_em', { ascending: false })
    .limit(30);
  // Número e endereço do orçamento de cada mensagem, buscados na visão (a tabela não é mais legível pela imobiliária)
  const porId = Object.fromEntries((orcamentos || []).map((o) => [o.id, o]));
  const mensagensRecentes = (mensagensBrutas || []).map((m) => ({ ...m, orcamentos: porId[m.orcamento_id] || null }));

  const atrasos = (orcamentos || [])
    .filter(estaAtrasado)
    .map((o) => ({
      key: `atraso-${o.id}-${ver ? o.valor_pago || 0 : 'x'}`,
      titulo: o.endereco,
      subtitulo: o.numero,
      detalhe: o.aprovado_em ? `Aprovado há ${diasDesde(o.aprovado_em)} dias, ainda pendente de pagamento` : '',
      valor: ver && o.valor_pendente != null ? Number(o.valor_pendente) : null,
      link: `/imobiliaria/orcamentos/${o.id}`,
    }));

  const visitasAvisos = (visitas || [])
    .filter((v) => v.atualizado_em && diasDesde(v.atualizado_em) <= 3)
    .map((v) => ({
      key: `visita-decidida-${v.id}-${v.status}`,
      titulo: v.endereco,
      subtitulo: '',
      detalhe: `Sua visita foi ${v.status === 'confirmada' ? 'confirmada' : 'cancelada'} pela FixIn`,
      link: '/imobiliaria/visitas',
    }));

  const mensagens = (mensagensRecentes || [])
    .filter((m) => m.orcamentos)
    .filter((m) => diasDesde(m.criado_em) <= 5)
    .map((m) => ({
      key: `msg-${m.id}`,
      titulo: m.orcamentos.endereco,
      subtitulo: m.orcamentos.numero,
      detalhe: `${m.autor_nome}: ${m.texto ? m.texto.slice(0, 80) : '[anexo enviado]'}`,
      link: `/imobiliaria/orcamentos/${m.orcamento_id}#chat`,
    }));

  return { visitas: visitasAvisos, atrasos, mensagens };
}
