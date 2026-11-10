const praticasOds = [
  ['Mapeie um serviço de assistência do seu município.', 'No site da prefeitura, procure o CRAS que atende seu bairro.', 'Anote o endereço, o horário e o canal de atendimento. Confira os dados antes de repassá-los.', 'Guarde um contato oficial atualizado para consultar quando precisar.'],
  ['Planeje uma refeição com o que já tem.', 'Liste os alimentos que você tem e confira quais precisam ser usados primeiro.', 'Escolha uma receita com esses ingredientes e ajuste a quantidade ao número de pessoas.', 'Anote quais ingredientes você aproveitou.'],
  ['Monte uma rotina de pausas durante o estudo.', 'Escolha um período em que costuma ficar muito tempo sentado.', 'Marque duas pausas curtas na agenda e escolha o que fazer em cada uma.', 'Ao fim do dia, registre quantas pausas conseguiu fazer.'],
  ['Crie um material de estudo acessível.', 'Escolha um assunto e escreva três passos com palavras simples.', 'Inclua um exemplo e revise se uma pessoa iniciante conseguiria seguir sozinha.', 'Peça a alguém para testar e revise o trecho em que teve dúvida.'],
  ['Revise a divisão das tarefas de casa.', 'Liste as tarefas da semana, incluindo compras, planejamento e cuidados.', 'Converse com quem mora com você e combinem uma divisão viável.', 'Revejam juntos a divisão após uma semana.'],
  ['Verifique se há desperdício visível de água.', 'Observe torneiras, chuveiro e descarga quando estiverem fechados.', 'Anote os pontos que continuam pingando e avise quem pode cuidar do conserto.', 'Depois do reparo, confira se o gotejamento parou.'],
  ['Use melhor a luz natural.', 'Escolha um cômodo que costuma ficar iluminado artificialmente de dia.', 'Abra as cortinas e mude a mesa ou o local de leitura para aproveitar a claridade.', 'Compare por quanto tempo a luz precisou ficar acesa.'],
  ['Documente uma habilidade para seu portfólio.', 'Escolha uma atividade de estudo ou trabalho que você já concluiu.', 'Escreva qual era o problema, o que você fez e qual foi o resultado, sem expor dados privados.', 'Salve uma página que você possa mostrar em uma oportunidade de trabalho.'],
  ['Investigue se um aparelho pode ser reparado.', 'Identifique o modelo e descreva o defeito sem abrir o equipamento.', 'Compare as orientações do fabricante e as opções de assistência.', 'Anote uma alternativa de reparo e compare com a substituição.'],
  ['Torne uma informação mais fácil de acessar.', 'Escolha um aviso ou texto que você possa editar.', 'Explique siglas e substitua instruções vagas por passos claros.', 'Peça a alguém para ler e dizer qual ação faria a seguir.'],
  ['Observe a acessibilidade de uma rua do bairro.', 'Escolha um trajeto curto que você já percorre.', 'Registre rampas, travessias e pontos com obstáculos, sem fotografar pessoas.', 'Monte uma lista de barreiras com localização e encaminhe ao canal da prefeitura se desejar.'],
  ['Faça um inventário antes de comprar.', 'Escolha uma categoria, como alimentos ou produtos de limpeza.', 'Confira o que já tem e retire da lista de compras os itens que ainda duram até a próxima ida.', 'Conte quantas compras você conseguiu evitar.'],
  ['Combine compromissos em uma única saída.', 'Liste compromissos próximos e veja os horários de atendimento.', 'Trace um percurso que reúna as paradas e escolha um meio de transporte viável.', 'Compare a quantidade de viagens antes e depois.'],
  ['Separe o óleo de cozinha para descarte correto.', 'Espere o óleo esfriar e coloque-o em um recipiente fechado e identificado.', 'Consulte a prefeitura ou um ponto de coleta para confirmar se recebe óleo usado.', 'Registre quanto óleo foi entregue para destinação adequada.'],
  ['Conheça uma espécie do seu bairro.', 'Observe uma planta em um espaço público sem arrancar folhas ou galhos.', 'Compare a observação com um guia confiável de espécies da sua região.', 'Anote o local, a data e a identificação provável.'],
  ['Acompanhe um gasto público local.', 'Entre no portal oficial de transparência da prefeitura.', 'Escolha uma despesa e localize data, valor e finalidade.', 'Guarde o link e escreva uma dúvida que você poderia encaminhar ao órgão responsável.'],
  ['Entenda como funciona uma parceria local.', 'Escolha uma iniciativa pública ligada a um ODS.', 'Procure no site oficial quem participa e qual é a responsabilidade de cada instituição.', 'Monte um quadro com parceiros, responsabilidades e fonte.']
];

const seletorGuia = document.querySelector('#seletor-guia');
const conteudoGuia = document.querySelector('#conteudo-guia');

objetivos.forEach((nome, indice) => {
  seletorGuia.add(new Option(`ODS ${indice + 1} — ${nome}`, indice + 1));
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'guia-escolha';
  botao.dataset.ods = indice + 1;
  botao.setAttribute('aria-label', `ODS ${indice + 1} — ${nome}`);
  botao.setAttribute('aria-controls', 'conteudo-guia');
  const icone = document.createElement('img');
  icone.src = `ods/${indice + 1}.webp`;
  icone.alt = '';
  icone.width = icone.height = 160;
  icone.loading = 'lazy';
  const legenda = document.createElement('span');
  legenda.textContent = nome;
  botao.append(icone, legenda);
  botao.addEventListener('click', () => {
    seletorGuia.value = indice + 1;
    preencherGuia();
    document.querySelector('#guia-nome').focus();
  });
  document.querySelector('#cartoes-guias').append(botao);
});

function preencherGuia() {
  const numero = Number(seletorGuia.value);
  const indice = numero - 1;
  const [meta1, meta2, exemplo] = detalhesOds[indice];
  const [acao, passo1, passo2, indicador] = praticasOds[indice];
  const modelo = document.querySelector('#modelo-guia').content.cloneNode(true);
  const imagem = modelo.querySelector('img');
  imagem.src = `ods/${numero}.webp`;
  for (const [campo, valor] of Object.entries({
    numero: `ODS ${numero} de 17`, nome: objetivos[indice], descricao: descricoes[indice],
    historia: historiasOds[indice], meta1, meta2, exemplo, acao, passo1, passo2, indicador
  })) {
    modelo.querySelector(`[data-guia="${campo}"]`).textContent = valor;
  }
  modelo.querySelector('[data-guia="metas"]').href = `https://brasil.un.org/pt-br/sdgs/${numero}`;
  modelo.querySelector('[data-guia="dados"]').href = `https://sdgs.un.org/goals/goal${numero}`;
  conteudoGuia.replaceChildren(modelo);
  document.querySelectorAll('.guia-escolha').forEach(botao => {
    botao.setAttribute('aria-pressed', String(Number(botao.dataset.ods) === numero));
  });
}

seletorGuia.addEventListener('change', preencherGuia);
document.querySelector('#buscar-guia').addEventListener('click', () => {
  form.reset();
  const caixa = opcoes.querySelector(`input[value="${seletorGuia.value}"]`);
  caixa.checked = true;
  atualizarSelecao();
  buscar();
});
preencherGuia();
