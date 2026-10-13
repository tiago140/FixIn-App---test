// Termo de garantia e responsabilidade do prestador. Modelo padrão de mercado para prestação de serviços de reforma.
// Mudou o texto? Aumente TERMO_VERSAO: todo prestador precisa aceitar de novo no próximo acesso.
import { createHash } from 'crypto';
import { EMPRESA } from '@/lib/empresaConfig';

export const TERMO_VERSAO = '2026-10-v1';

export const TERMO_TITULO = 'Termo de Garantia e Responsabilidade do Prestador de Serviços';

export const TERMO_CLAUSULAS = [
  ['1. Objeto', `Este termo regula a relação entre ${EMPRESA.nome} (CNPJ ${EMPRESA.cnpj}), doravante FIXIN, e o PRESTADOR cadastrado neste portal, para a execução de serviços de reforma, manutenção e reparos nos imóveis indicados em cada Ordem de Serviço. Cada Ordem de Serviço aceita pelo PRESTADOR integra este termo.`],
  ['2. Natureza da relação', 'O PRESTADOR atua de forma autônoma, com independência técnica e organização própria. Este termo e as Ordens de Serviço não criam vínculo empregatício, de sociedade ou de representação com a FIXIN. O PRESTADOR escolhe seus meios, ferramentas e auxiliares, e responde por eles.'],
  ['3. Execução', 'O PRESTADOR compromete-se a executar os serviços conforme a Ordem de Serviço aceita, com boa técnica, materiais de qualidade e dentro do prazo combinado, respeitando as normas técnicas aplicáveis (ABNT) e as regras do condomínio e do imóvel. Alterações de escopo ou valor dependem de aprovação prévia da FIXIN.'],
  ['4. Valores informados', 'Os valores enviados pelo PRESTADOR (mão de obra e material) são o preço fechado do serviço. O PRESTADOR declara que os informou com cuidado, após avaliar o local, e que não cobrará valores adicionais sem aprovação prévia por escrito.'],
  ['5. Garantia dos serviços', 'O PRESTADOR garante os serviços e os materiais por ele fornecidos pelo prazo indicado no orçamento aprovado e, no mínimo, por 90 (noventa) dias contados da aprovação da conclusão pela FIXIN. Para serviços que afetem a solidez e a segurança da edificação, aplica-se ainda o prazo legal do art. 618 do Código Civil.'],
  ['6. Correção sem custo', 'Durante o prazo de garantia, o PRESTADOR corrigirá, sem qualquer custo para a FIXIN ou para o cliente, defeitos de execução ou de material de sua responsabilidade, em até 5 (cinco) dias úteis após o aviso, ou prazo menor em caso de urgência (infiltração, risco à segurança, falta de uso do imóvel). Se não atender, a FIXIN poderá contratar terceiros e cobrar do PRESTADOR o custo do reparo, descontando-o de valores a pagar.'],
  ['7. Reprovação e refação', 'Se a conclusão do serviço for reprovada pela FIXIN com base nas fotos e no descritivo enviados, o PRESTADOR refará o que foi apontado, sem custo, e reenviará a conclusão. O pagamento fica condicionado à aprovação.'],
  ['8. Responsabilidade por danos', 'O PRESTADOR responde por danos causados ao imóvel, a terceiros, aos clientes da FIXIN e a bens de vizinhos, por ação ou omissão sua, de seus auxiliares ou de subcontratados, obrigando-se a repará-los ou indenizá-los. Isso inclui a limpeza e a retirada do entulho gerado, salvo previsão diferente na Ordem de Serviço.'],
  ['9. Obrigações trabalhistas, previdenciárias e tributárias', 'O PRESTADOR é o único responsável por salários, encargos, tributos, seguros e demais obrigações relativas a si e a quem contratar para ajudá-lo, isentando a FIXIN de qualquer responsabilidade, inclusive em reclamações trabalhistas, e obrigando-se a ressarci-la se vier a ser acionada por esse motivo.'],
  ['10. Segurança do trabalho', 'O PRESTADOR usará os equipamentos de proteção adequados, cumprirá as normas de segurança, em especial para trabalho em altura e com eletricidade, e responde por acidentes ocorridos com ele ou com seus auxiliares durante a execução.'],
  ['11. Nota fiscal e pagamento', 'O PRESTADOR emitirá e anexará neste portal a nota fiscal dos serviços (ou documento fiscal equivalente à sua condição). O pagamento será feito após a aprovação da conclusão pela FIXIN, na conta ou chave Pix cadastrada pelo PRESTADOR, que declara serem de sua titularidade. A FIXIN não se responsabiliza por pagamentos feitos a dados informados incorretamente.'],
  ['12. Confidencialidade e dados pessoais', 'O PRESTADOR manterá sigilo sobre os dados dos imóveis, moradores, imobiliárias e clientes, e usará dados pessoais apenas para a execução do serviço, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Os dados do PRESTADOR serão tratados pela FIXIN para execução do contrato, pagamentos e obrigações legais.'],
  ['13. Relacionamento com clientes', 'Durante a vigência deste termo e por 12 (doze) meses após o último serviço, o PRESTADOR não oferecerá nem executará diretamente, sem intermediação da FIXIN, serviços para as imobiliárias e clientes que conheceu por meio das Ordens de Serviço, nos mesmos imóveis ou carteiras, salvo autorização por escrito da FIXIN.'],
  ['14. Valores e propostas da FIXIN', 'O PRESTADOR reconhece que não tem acesso e não deve solicitar os valores cobrados pela FIXIN dos clientes, por serem informação comercial reservada.'],
  ['15. Vigência e encerramento', 'Este termo vale por prazo indeterminado e pode ser encerrado por qualquer das partes, por aviso escrito, sem prejuízo das Ordens de Serviço em andamento e das garantias já concedidas, que continuam valendo até o fim de seus prazos.'],
  ['16. Aceite eletrônico', 'O aceite é feito neste portal, após login individual do PRESTADOR, e registra data, hora, endereço de rede e dispositivo. As partes reconhecem a validade do aceite eletrônico como manifestação de vontade, nos termos do art. 10, §2º, da Medida Provisória 2.200-2/2001.'],
  ['17. Foro', 'Fica eleito o foro da comarca de Sorocaba, SP, para resolver qualquer questão relativa a este termo, com renúncia a qualquer outro.'],
];

export function termoTexto() {
  return `${TERMO_TITULO}\n\n` + TERMO_CLAUSULAS.map(([t, c]) => `${t}\n${c}`).join('\n\n');
}

export function termoHash() {
  return createHash('sha256').update(TERMO_VERSAO + '\n' + termoTexto()).digest('hex');
}

export async function prestadorAceitouTermo(admin, prestadorId) {
  const { data } = await admin.from('termos_aceites').select('id').eq('prestador_id', prestadorId).eq('versao', TERMO_VERSAO).maybeSingle();
  return !!data;
}
