/* Sugestões educativas para os cartões de pontos. As regras são conservadoras:
   usam apenas ações que já existem no catálogo e não afirmam serviço local sem fonte. */
const REGRAS_ACOES_PONTOS = Object.freeze({
  reciclagem: Object.freeze({
    ods: Object.freeze([12, 11]),
    acaoCatalogo: Object.freeze({ ods: 12, titulo: 'Faça uma lista do que já tem antes de comprar' }),
    oQueFazer: 'Levar recicláveis separados e usar a visita para revisar o que entra na sua lista de compras.',
    passos: Object.freeze([
      'Separe em casa apenas o que você pretende levar e que esteja em condição de triagem.',
      'Confira no local quais materiais são aceitos antes de depositar qualquer coisa.',
      'Anote um item que você pode evitar comprar na próxima lista.'
    ]),
    antesDeIr: Object.freeze([
      'Confirme horário e materiais aceitos na fonte informada; a base não garante que todos os recicláveis sejam recebidos.',
      'Não deixe resíduos no local se não houver orientação clara sobre o que é aceito.'
    ]),
    relacao: 'Consumo consciente e gestão de resíduos também dizem respeito a cidades mais sustentáveis.'
  }),
  doacao: Object.freeze({
    ods: Object.freeze([1, 10]),
    acaoCatalogo: Object.freeze({ ods: 1, titulo: 'Separe uma peça em bom estado para doação' }),
    oQueFazer: 'Preparar com antecedência um item em bom estado e entregá-lo somente se a doação estiver sendo recebida.',
    passos: Object.freeze([
      'Escolha uma peça limpa, inteira e que você já não usa.',
      'Confirme na fonte do ponto qual campanha está ativa e se esse tipo de item é aceito.',
      'Entregue no horário informado, sem deixar pertences sem orientação.'
    ]),
    antesDeIr: Object.freeze([
      'Campanhas podem ser sazonais: verifique a data e o que está sendo aceito antes de sair.',
      'Não informe dados pessoais seus ou de outras pessoas na doação.'
    ]),
    relacao: 'Preparar uma doação pode apoiar quem precisa e reduzir desigualdades, sempre com respeito e consentimento.'
  }),
  agua: Object.freeze({
    ods: Object.freeze([6]),
    acaoCatalogo: Object.freeze({ ods: 6, titulo: 'Identifique desperdício na pia' }),
    oQueFazer: 'Observar sinais de desperdício de água no trajeto e registrar o que foi visto sem mexer na instalação.',
    passos: Object.freeze([
      'Observe se há vazamento ou desperdício visível no caminho até o ponto.',
      'Anote o local e avise quem cuida do espaço, sem tentar consertar a instalação.',
      'Leve sua garrafa, mas confirme no local se a água é própria para beber.'
    ]),
    antesDeIr: Object.freeze([
      'A existência de um ponto de água não comprova potabilidade: procure placa ou informação oficial.',
      'Respeite as regras de uso do espaço e não bloqueie o acesso de outras pessoas.'
    ]),
    relacao: 'Evitar perdas e cuidar do acesso à água são partes do ODS 6; o cartão não certifica a qualidade da água.'
  }),
  horta: Object.freeze({
    ods: Object.freeze([15, 11]),
    acaoCatalogo: Object.freeze({ ods: 15, titulo: 'Observe a vegetação do seu bairro' }),
    oQueFazer: 'Conhecer a área verde com atenção à vegetação e às regras de uso do espaço.',
    passos: Object.freeze([
      'Observe uma árvore ou área verde em local público sem retirar partes da planta.',
      'Compare o que você viu com um guia confiável de espécies da região.',
      'Registre local e data sem fotografar pessoas.'
    ]),
    antesDeIr: Object.freeze([
      'Área verde não é automaticamente horta comunitária, ponto de plantio ou coleta.',
      'Não colha, plante ou entre em área restrita sem autorização; confirme horário e acesso.'
    ]),
    relacao: 'Observar a vegetação local aproxima a pessoa do ODS 15 e valoriza espaços públicos do ODS 11.'
  }),
  'oleo-de-cozinha': Object.freeze({
    ods: Object.freeze([14, 12]),
    acaoCatalogo: Object.freeze({ ods: 14, titulo: 'Evite jogar óleo usado pelo ralo' }),
    oQueFazer: 'Separar o óleo usado com segurança e entregá-lo em ponto que realmente o receba.',
    passos: Object.freeze([
      'Espere o óleo esfriar e coloque-o em recipiente fechado e identificado.',
      'Confirme na fonte do ponto se ele recebe óleo de cozinha e em que horário.',
      'Entregue apenas o óleo separado; anote a quantidade para acompanhar sua rotina.'
    ]),
    antesDeIr: Object.freeze([
      'Nem todo ponto de reciclagem aceita óleo: confirme antes de deslocar-se.',
      'Não misture óleo com outros resíduos nem o descarte pelo ralo.'
    ]),
    relacao: 'O descarte adequado evita que o óleo chegue à água; a relação com o ODS 12 vem do consumo responsável.'
  }),
  'pilhas-eletronicos': Object.freeze({
    ods: Object.freeze([12, 9]),
    acaoCatalogo: Object.freeze({ ods: 9, titulo: 'Prolongue a vida útil de um aparelho' }),
    oQueFazer: 'Avaliar primeiro o reparo e, se não houver alternativa, separar pilhas e aparelhos para descarte orientado.',
    passos: Object.freeze([
      'Identifique o defeito e consulte orientações do fabricante ou de assistência autorizada.',
      'Se o reparo não for viável, separe pilhas, baterias ou aparelhos sem abri-los.',
      'Confira no local e na fonte quais itens são recebidos antes de entregá-los.'
    ]),
    antesDeIr: Object.freeze([
      'Não abra pilhas ou baterias; siga as orientações oficiais de manuseio e transporte.',
      'Aceitação de cada material depende do ponto: confirme com a fonte informada.'
    ]),
    relacao: 'Manter aparelhos em uso reduz trocas precoces; o descarte responsável complementa o ODS 12.'
  }),
  outro: Object.freeze({
    ods: Object.freeze([4, 17]),
    acaoCatalogo: Object.freeze({ ods: 17, titulo: 'Encontre uma iniciativa que conecte diferentes setores' }),
    oQueFazer: 'Entender quem mantém o espaço público e compartilhar uma explicação simples sobre seu uso.',
    passos: Object.freeze([
      'Identifique na fonte do ponto qual órgão ou grupo mantém o espaço.',
      'Pergunte no local, se possível, quais atividades são públicas e abertas.',
      'Escreva três passos simples para outra pessoa entender como usar o espaço.'
    ]),
    antesDeIr: Object.freeze([
      'Confirme o acesso público e as regras do local; a presença no mapa não garante atividade na visita.',
      'Não presuma serviço, horário ou parceria sem fonte explícita.'
    ]),
    relacao: 'Entender parcerias locais e compartilhar informação clara conecta educação e cooperação.'
  })
});

function catalogoPadraoAcoesPontos() {
  if (typeof module !== 'undefined') return require('./acoes');
  return { acoes: typeof acoes !== 'undefined' ? acoes : [], objetivos: typeof objetivos !== 'undefined' ? objetivos : [] };
}

function nomesOdsAcoesPontos(catalogo) {
  return Array.isArray(catalogo?.objetivos) ? catalogo.objetivos : [];
}

function sugestaoAcaoPonto(ponto, catalogo = catalogoPadraoAcoesPontos()) {
  const categoria = typeof module !== 'undefined'
    ? require('./categorias-pontos').categoriaPontosCanonica(ponto?.categoria)
    : window.EcoaCategoriasPontos.categoriaPontosCanonica(ponto?.categoria);
  const regra = REGRAS_ACOES_PONTOS[categoria] || REGRAS_ACOES_PONTOS.outro;
  const lista = Array.isArray(catalogo?.acoes) ? catalogo.acoes : [];
  const acao = lista.find(item => item && item.ods === regra.acaoCatalogo.ods && item.titulo === regra.acaoCatalogo.titulo);
  if (!acao) return null;
  const nomes = nomesOdsAcoesPontos(catalogo);
  return Object.freeze({
    chave: acao.ods + ':' + acao.titulo,
    acao,
    categoria,
    ods: regra.ods.filter(numero => Number.isInteger(numero) && numero >= 1 && numero <= 17).slice(0, 2),
    nomesOds: nomes,
    oQueFazer: regra.oQueFazer,
    passos: regra.passos.slice(0, 3),
    antesDeIr: regra.antesDeIr.slice(0, 3),
    relacao: regra.relacao
  });
}

function nomeOdsAcaoPonto(sugestao, numero) {
  return sugestao?.nomesOds?.[numero - 1] ? `ODS ${numero} — ${sugestao.nomesOds[numero - 1]}` : `ODS ${numero}`;
}

const apiAcoesPontos = Object.freeze({
  REGRAS_ACOES_PONTOS, sugestaoAcaoPonto, nomeOdsAcaoPonto
});
if (typeof module !== 'undefined') module.exports = apiAcoesPontos;
else window.EcoaAcoesPontos = apiAcoesPontos;
