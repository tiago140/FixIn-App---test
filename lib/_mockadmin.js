import fs from 'fs';
const sig=fs.readFileSync('/tmp/sig.b64','utf8');
const os={id:'1',numero:'OS-0007',endereco:'Rua Professor Horacio Mesquita de Camargo, 120 - Unid. 123 - Parque Campolim - Sorocaba/SP',orcamento_id:'o',cliente_id:'c',rodada:0,aceito_em:'2026-11-20T12:00:00Z',iniciada_em:'2026-11-21T12:00:00Z',concluido_em:null,conclusao_obs:'Pintura geral concluída e torneira trocada.',prestadores:{nome:'João da Silva',cpf:'123.456.789-00'},os_itens:[{ambiente:'Sala',servico:'Pintura geral',descricao:'Duas demãos de tinta acrílica',mo:800,ma:350,ordem:0},{ambiente:'Banheiro',servico:'Troca de torneira',descricao:'',mo:120,ma:80,ordem:1}]};
const laudo={criado_em:'2026-11-26T15:00:00Z',assinante_nome:'João da Silva',assinante_doc:'123.456.789-00',observacoes:'Entreguei as chaves na portaria.',assinatura_png:sig,ip:'200.1.2.3',hash:'3f9a'.repeat(16)};
const fotos=[['antes',0],['antes',1],['durante',2],['durante',3],['depois',4],['depois',5],['depois',0],['depois',1]].map(([t,i],k)=>({path:'f'+i,tipo:t,legenda:k%2?'Sala':'',criado_em:'2026-11-2'+(1+(k%4))+'T12:00:00Z'}));
const tab={ordens_servico:os,os_laudos_finalizacao:laudo,orcamentos:{numero:'ORC-0099',garantia:'90 dias'},clientes:{nome_empresa:'AE Patrimônio'},os_fotos:fotos};
const q=(t)=>{const o={select:()=>o,eq:()=>o,order:()=>o,limit:()=>Promise.resolve({data:tab[t]}),maybeSingle:()=>Promise.resolve({data:tab[t]}),then:(f)=>f({data:tab[t]})};return o;};
export const createAdminClient=()=>({from:q,storage:{from:()=>({download:async(p)=>({data:new Blob([fs.readFileSync('/tmp/foto'+p.slice(1)+'.jpg')])})})}});
