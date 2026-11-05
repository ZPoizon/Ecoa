const objetivos = [
  'Erradicação da pobreza','Fome zero e agricultura sustentável','Saúde e bem-estar',
  'Educação de qualidade','Igualdade de gênero','Água potável e saneamento',
  'Energia limpa e acessível','Trabalho decente e crescimento econômico','Indústria, inovação e infraestrutura',
  'Redução das desigualdades','Cidades e comunidades sustentáveis','Consumo e produção responsáveis',
  'Ação contra a mudança global do clima','Vida na água','Vida terrestre',
  'Paz, justiça e instituições eficazes','Parcerias e meios de implementação'
];

const acoes = [
  [1,15,0,'Em casa','Separe uma peça em bom estado para doação','Escolha uma peça limpa, inteira e que você já não usa.','Guarde em uma sacola identificada para entregar quando encontrar um ponto que aceite esse tipo de item.'],
  [2,15,0,'Em casa','Planeje uma refeição antes de comprar','Veja quais ingredientes que você já tem podem compor a próxima refeição.','Coloque os itens que precisam ser usados primeiro no começo da lista.'],
  [3,5,0,'Em casa','Reserve uma pausa na agenda','Escolha um horário realista entre duas tarefas.','Programe um lembrete para se afastar da tela e fazer uma atividade confortável para você.'],
  [4,15,0,'Em casa','Transforme uma explicação difícil em um guia curto','Escolha um assunto que você já entende e escreva três passos em linguagem simples.','Inclua um exemplo e salve o guia para compartilhar quando alguém tiver a mesma dúvida.'],
  [5,15,0,'Em casa','Mapeie a divisão das tarefas domésticas','Liste as tarefas da semana, inclusive planejamento e compras.','Anote quem faz cada uma e identifique uma tarefa que você pode assumir para equilibrar a divisão.'],
  [6,5,0,'Em casa','Identifique desperdício na pia','Veja se a torneira pinga depois de fechada.','Se pingar, anote o local e inclua o conserto na lista de manutenção.'],
  [7,5,0,'Em casa','Aproveite a luz natural','Veja se pode abrir a cortina e usar a claridade para a atividade atual.','Apague a luz do cômodo se houver claridade suficiente.'],
  [8,15,0,'Em casa','Organize uma evidência do seu trabalho','Escolha uma atividade de estudo ou trabalho que você já realizou.','Registre o problema, o que você fez e o resultado para usar em seu portfólio.'],
  [9,15,0,'Em casa','Prolongue a vida útil de um aparelho','Identifique um aparelho com um problema simples de uso.','Consulte o manual e registre opções de manutenção autorizada antes de considerar uma troca.'],
  [10,15,0,'Em casa','Torne um texto seu mais acessível','Escolha um documento ou postagem que você possa editar.','Troque abreviações pouco conhecidas por palavras completas e quebre parágrafos longos.'],
  [11,15,0,'Na rua','Observe a acessibilidade de um trajeto','Em um caminho habitual, observe se há calçadas livres, travessias e rampas.','Anote os pontos com barreiras sem fotografar pessoas. Use as anotações para planejar rotas mais acessíveis.'],
  [12,5,0,'Em casa','Faça uma lista do que já tem antes de comprar','Escolha um armário ou gaveta e confira os produtos que ainda podem ser usados.','Retire da lista de compras o que você encontrou em quantidade suficiente.'],
  [13,15,0,'Em casa','Planeje um trajeto com menos deslocamentos','Liste dois compromissos próximos que possam ser resolvidos na mesma saída.','Compare horários e escolha um trajeto viável para combinar as paradas.'],
  [14,5,0,'Em casa','Evite jogar óleo usado pelo ralo','Separe um recipiente com tampa para armazenar óleo de cozinha já frio.','Identifique o recipiente e procure um ponto de coleta que aceite óleo de cozinha.'],
  [15,15,0,'Na rua','Observe a vegetação do seu bairro','Observe uma árvore ou área verde em local público sem retirar partes da planta.','Registre as características e compare com um guia de espécies nativas da região.'],
  [16,15,0,'Em casa','Encontre o portal de transparência do município','Procure o portal a partir do site oficial da prefeitura.','Abra uma seção de despesas e veja quais informações são publicadas.'],
  [17,15,0,'Em casa','Encontre uma iniciativa que conecte diferentes setores','Abra a página do ODS 17 na ONU Brasil e escolha uma meta.','Busque um exemplo ligado à meta e anote quais setores trabalham juntos e o que cada um oferece.'],
  [12,15,20,'Na rua','Experimente comprar a granel','Escolha um produto que você já precisava comprar e compare o preço por quilo.','Se houver opção dentro do orçamento, leve apenas a quantidade que pretende usar.'],
  [4,30,0,'Em casa','Monte um cartão de revisão','Escolha um conceito que costuma esquecer.','Escreva uma pergunta de um lado e uma explicação com exemplo do outro.']
].map(([ods, tempo, custo, local, titulo, ...passos]) => ({ ods, tempo, custo, local, titulo, passos }));

function filtrarAcoes(lista, { tempo, custo, local, ods }) {
  const selecionados = Array.isArray(ods) ? ods : (ods ? [Number(ods)] : []);
  return lista.filter(acao =>
    (!tempo || acao.tempo <= Number(tempo)) &&
    (custo === '' || custo == null || acao.custo <= Number(custo)) &&
    (!local || acao.local === local) &&
    (!selecionados.length || selecionados.includes(acao.ods))
  );
}

if (typeof module !== 'undefined') module.exports = { objetivos, acoes, filtrarAcoes };
