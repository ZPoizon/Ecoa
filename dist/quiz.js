// Afinidades didáticas do projeto: não é uma avaliação oficial da ONU.
const perguntasQuiz = [
  { titulo: 'Que mudança você mais gostaria de ver perto de você?', opcoes: [
    { texto: 'Mais acesso ao básico e menos desigualdade', ods: [1, 2, 10] },
    { texto: 'Mais oportunidades de aprender e participar', ods: [4, 5, 16] },
    { texto: 'Menos desperdício de água, energia e materiais', ods: [6, 7, 12] },
    { texto: 'Natureza protegida e bairros melhores', ods: [11, 13, 14, 15] },
    { texto: 'Trabalho, bem-estar e soluções em conjunto', ods: [3, 8, 9, 17] }
  ] },
  { titulo: 'Qual atividade desperta mais sua curiosidade?', opcoes: [
    { texto: 'Planejar alimentos e preparar itens para doação', ods: [1, 2, 12] },
    { texto: 'Explicar algo e tornar informações acessíveis', ods: [4, 10] },
    { texto: 'Observar a água e a vida nos rios e mares', ods: [6, 14] },
    { texto: 'Conhecer plantas e cuidar dos espaços do bairro', ods: [11, 15] },
    { texto: 'Entender tecnologias e opções de energia', ods: [7, 9, 13] }
  ] },
  { titulo: 'O que você gostaria de melhorar na sua rotina?', opcoes: [
    { texto: 'Reservar tempo para cuidar do bem-estar', ods: [3] },
    { texto: 'Dividir melhor as tarefas e ouvir outras pessoas', ods: [5, 10] },
    { texto: 'Desenvolver habilidades de estudo e trabalho', ods: [4, 8] },
    { texto: 'Comprar com atenção e reduzir desperdícios', ods: [2, 6, 7, 12] },
    { texto: 'Participar mais das decisões e iniciativas locais', ods: [11, 16, 17] }
  ] },
  { titulo: 'Qual assunto você escolheria para aprender hoje?', opcoes: [
    { texto: 'Acesso a alimentos e serviços de apoio', ods: [1, 2] },
    { texto: 'Respeito, igualdade e participação nas decisões', ods: [5, 10, 16] },
    { texto: 'Clima, energia e escolhas de consumo', ods: [7, 12, 13] },
    { texto: 'Água, oceanos e biodiversidade', ods: [6, 14, 15] },
    { texto: 'Inovação, trabalho e cooperação', ods: [8, 9, 17] }
  ] },
  { titulo: 'Qual primeiro passo parece mais com você?', opcoes: [
    { texto: 'Organizar uma doação ou planejar uma refeição', ods: [1, 2] },
    { texto: 'Criar um guia curto ou uma rotina de pausas', ods: [3, 4] },
    { texto: 'Observar a acessibilidade e a natureza do bairro', ods: [10, 11, 15] },
    { texto: 'Rever desperdícios e o descarte de resíduos', ods: [6, 12, 14] },
    { texto: 'Entender uma parceria ou acompanhar decisões públicas', ods: [9, 16, 17] }
  ] }
];

function calcularResultadoQuiz(respostas) {
  if (!Array.isArray(respostas) || respostas.length !== perguntasQuiz.length ||
      perguntasQuiz.some((p, i) => !Number.isInteger(respostas[i]) || !p.opcoes[respostas[i]])) {
    throw new Error('Responda às cinco perguntas para ver seu resultado.');
  }
  const pontos = Array(17).fill(0);
  const afinidades = Array.from({length:17}, () => []);
  perguntasQuiz.forEach((p, i) => {
    const opcao = p.opcoes[respostas[i]];
    opcao.ods.forEach(ods => { pontos[ods - 1]++; afinidades[ods - 1].push(opcao.texto); });
  });
  // Empates usam a ordem numérica, sem sugerir que um objetivo é mais importante.
  return pontos.map((pontos, i) => ({ods:i+1, pontos, afinidades:afinidades[i]}))
    .filter(item => item.pontos > 0)
    .sort((a,b) => b.pontos - a.pontos || a.ods - b.ods).slice(0,2);
}

if (typeof module !== 'undefined') module.exports = {perguntasQuiz, calcularResultadoQuiz};
