const form = document.querySelector('#filtros');
const status = document.querySelector('#status');
const resultado = document.querySelector('#resultado');
const outra = document.querySelector('#outra');
const titulo = document.querySelector('#titulo');
const opcoes = document.querySelector('#opcoes-ods');
const totalOds = document.querySelector('#total-ods');
const descricaoOds = document.querySelector('#descricao-ods');
const painelOds = document.querySelector('#painel-ods');
const introducaoOds = [...descricaoOds.childNodes].map(no => no.cloneNode(true));
let itemAberto;
let encontradas = [];
let indice = 0;

const descricoes = [
  'Combater a pobreza em todas as suas formas e ampliar o acesso à proteção social e a serviços básicos.',
  'Acabar com a fome, melhorar a nutrição e promover uma agricultura sustentável.',
  'Garantir uma vida saudável e promover o bem-estar em todas as idades.',
  'Ampliar o acesso a uma educação inclusiva e de qualidade ao longo da vida.',
  'Alcançar a igualdade de gênero e fortalecer os direitos de mulheres e meninas.',
  'Garantir acesso à água potável e ao saneamento, com gestão sustentável da água.',
  'Ampliar o acesso a energia acessível, confiável e sustentável.',
  'Promover trabalho digno, emprego produtivo e crescimento econômico inclusivo.',
  'Construir infraestrutura resiliente, incentivar a inovação e promover uma indústria sustentável.',
  'Reduzir desigualdades dentro dos países e entre eles.',
  'Tornar cidades e comunidades inclusivas, seguras, resilientes e sustentáveis.',
  'Usar melhor os recursos e reduzir desperdícios na produção e no consumo.',
  'Agir para enfrentar as mudanças climáticas e seus impactos.',
  'Conservar os oceanos, os mares e seus recursos.',
  'Proteger ecossistemas terrestres, florestas e a biodiversidade.',
  'Promover sociedades pacíficas, acesso à justiça e instituições responsáveis.',
  'Fortalecer a cooperação e os recursos necessários para alcançar os objetivos.'
];

function atualizarSelecao() {
  const total = opcoes.querySelectorAll('input:checked').length;
  totalOds.textContent = total ? `${total} de 17 objetivos selecionados` : 'Todos os 17 objetivos';
}

const historiasOds = [
  'A redução da pobreza extrema era uma meta dos Objetivos de Desenvolvimento do Milênio. Em 2015, a Agenda 2030 ampliou o foco para a pobreza em todas as suas formas.',
  'O combate à fome já fazia parte dos Objetivos do Milênio. Em 2015, a Agenda 2030 reuniu fome, nutrição e agricultura sustentável em um objetivo próprio.',
  'A Agenda 2030 reuniu temas de saúde que antes apareciam em objetivos separados, como mortalidade infantil, saúde materna e combate a doenças.',
  'Os Objetivos do Milênio priorizavam a conclusão do ensino primário. A Agenda 2030 ampliou essa perspectiva para a inclusão e a aprendizagem ao longo da vida.',
  'A igualdade de gênero já integrava os Objetivos do Milênio. A Agenda 2030 passou a destacar também o combate à violência, a participação e o trabalho de cuidado.',
  'O acesso à água e ao saneamento já aparecia nos Objetivos do Milênio. Em 2015, ganhou um objetivo próprio que inclui qualidade da água e proteção de ecossistemas.',
  'A energia ganhou um objetivo próprio na Agenda 2030, com metas sobre acesso, fontes renováveis e eficiência energética.',
  'Em 2015, a Agenda 2030 reuniu emprego produtivo, direitos no trabalho e crescimento econômico sustentável no mesmo objetivo.',
  'A Agenda 2030 criou um objetivo próprio para infraestrutura, industrialização sustentável e inovação, com atenção ao acesso à tecnologia.',
  'Em 2015, a redução das desigualdades ganhou um objetivo próprio, incluindo diferenças dentro dos países e entre eles.',
  'A Agenda 2030 estabeleceu um objetivo específico para cidades e comunidades, com metas para moradia, transporte e espaços públicos.',
  'A produção e o consumo sustentáveis ganharam um objetivo próprio em 2015, com metas ligadas ao uso de recursos, aos resíduos e ao desperdício.',
  'O objetivo climático integra a Agenda 2030, adotada em 2015, ano em que também foi adotado o Acordo de Paris.',
  'Em 2015, a Agenda 2030 estabeleceu um objetivo específico para oceanos e mares, incluindo poluição marinha e pesca sustentável.',
  'A proteção de florestas e da biodiversidade ganhou um objetivo próprio na Agenda 2030, junto ao combate à desertificação e à degradação do solo.',
  'A Agenda 2030 incluiu um objetivo específico para paz, justiça e instituições, com metas sobre violência, acesso à justiça e transparência.',
  'A parceria global já aparecia nos Objetivos do Milênio. A Agenda 2030 retomou o tema e incluiu financiamento, tecnologia, comércio e cooperação.'
];

const detalhesOds = [
  ['1.3 · Ampliar a proteção social.', '1.4 · Ampliar o acesso a serviços básicos e recursos econômicos.', 'Uma família em situação de vulnerabilidade consegue acessar benefícios e serviços públicos pelo atendimento socioassistencial.'],
  ['2.1 · Garantir acesso a alimentos seguros e nutritivos.', '2.4 · Adotar práticas agrícolas sustentáveis e resistentes a eventos extremos.', 'Uma cooperativa fornece alimentos variados para a merenda e cultiva o solo com práticas que evitam a erosão.'],
  ['3.4 · Prevenir doenças crônicas e promover a saúde mental.', '3.8 · Ampliar o acesso a serviços essenciais de saúde.', 'Uma unidade básica oferece acompanhamento preventivo perto de onde as pessoas moram.'],
  ['4.1 · Garantir ensino primário e secundário de qualidade.', '4.5 · Reduzir desigualdades de acesso à educação.', 'Uma escola fornece materiais acessíveis e apoio para alunos com deficiência acompanharem as aulas.'],
  ['5.2 · Eliminar a violência contra mulheres e meninas.', '5.4 · Reconhecer o cuidado e o trabalho doméstico não remunerado.', 'Uma rede pública oferece atendimento a vítimas de violência e amplia o acesso a serviços de cuidado.'],
  ['6.1 · Garantir acesso à água potável e segura.', '6.3 · Melhorar a qualidade da água e reduzir a poluição.', 'O tratamento de esgoto reduz a chegada de poluentes ao rio usado no abastecimento da cidade.'],
  ['7.1 · Ampliar o acesso a serviços modernos de energia.', '7.2 · Aumentar a participação de fontes renováveis.', 'Uma escola gera parte da eletricidade com painéis solares e acompanha o próprio consumo.'],
  ['8.5 · Promover emprego produtivo, trabalho digno e remuneração igual para trabalho de igual valor.', '8.8 · Proteger direitos trabalhistas e tornar os locais de trabalho mais seguros.', 'Uma empresa corrige diferenças salariais injustificadas e treina a equipe para prevenir acidentes.'],
  ['9.1 · Desenvolver infraestrutura confiável e resiliente.', '9.4 · Modernizar indústrias com tecnologias e processos mais limpos.', 'Uma fábrica reaproveita água no processo produtivo e reduz a demanda por água nova.'],
  ['10.2 · Promover a inclusão social, econômica e política.', '10.3 · Combater práticas discriminatórias e garantir igualdade de oportunidades.', 'Um serviço público oferece canais acessíveis para pessoas que enfrentam barreiras de comunicação.'],
  ['11.2 · Ampliar o acesso a transporte seguro, acessível e sustentável.', '11.7 · Garantir acesso a espaços públicos seguros e inclusivos.', 'Uma prefeitura melhora as travessias e instala rampas nos caminhos que levam a pontos de ônibus.'],
  ['12.3 · Reduzir o desperdício de alimentos e as perdas na cadeia de produção.', '12.5 · Reduzir resíduos por prevenção, reciclagem e reúso.', 'Um mercado ajusta as compras com base nas vendas para descartar menos alimentos.'],
  ['13.1 · Aumentar a capacidade de lidar com riscos climáticos.', '13.3 · Melhorar a educação e a preparação para lidar com as mudanças climáticas.', 'Uma cidade mapeia áreas de inundação e cria rotas de saída para os moradores.'],
  ['14.1 · Reduzir a poluição marinha, inclusive a que vem de terra.', '14.4 · Combater a pesca excessiva e ilegal.', 'Uma comunidade reduz o lixo que chega ao mar e acompanha as regras de pesca da região.'],
  ['15.2 · Promover a gestão sustentável das florestas.', '15.5 · Reduzir a degradação de habitats e a perda de biodiversidade.', 'A recuperação da vegetação nativa conecta fragmentos de mata e facilita o deslocamento da fauna.'],
  ['16.3 · Promover acesso à justiça.', '16.6 · Desenvolver instituições eficazes, transparentes e responsáveis.', 'Um município publica despesas em linguagem clara e oferece um canal para pedidos de informação.'],
  ['17.16 · Fortalecer a cooperação entre setores para alcançar os ODS.', '17.18 · Melhorar a disponibilidade de dados confiáveis e detalhados.', 'Universidades, governos e organizações compartilham dados e métodos para acompanhar metas locais.']
];

function fecharDescricao() {
  if (!itemAberto) return;
  descricaoOds.replaceChildren(...introducaoOds.map(no => no.cloneNode(true)));
  itemAberto = undefined;
}

function abrirDescricao(item, nome, descricao, historia, numero) {
  itemAberto = item;
  const titulo = document.createElement('strong');
  titulo.textContent = nome;
  const texto = document.createElement('p');
  texto.textContent = descricao;
  const subtitulo = document.createElement('strong');
  subtitulo.textContent = 'História';
  const contexto = document.createElement('p');
  contexto.textContent = historia;
  const [primeiraMeta, segundaMeta, exemplo] = detalhesOds[numero - 1];
  const metasTitulo = document.createElement('strong');
  metasTitulo.textContent = 'Duas metas do objetivo';
  const metas = document.createElement('ul');
  for (const meta of [primeiraMeta, segundaMeta]) {
    const linha = document.createElement('li');
    linha.textContent = meta;
    metas.append(linha);
  }
  const exemploTitulo = document.createElement('strong');
  exemploTitulo.textContent = 'Na prática';
  const exemploTexto = document.createElement('p');
  exemploTexto.textContent = exemplo;
  const acao = acoes.find(item => item.ods === numero);
  const comecar = document.createElement('strong');
  comecar.textContent = 'Seu primeiro passo';
  const tarefa = document.createElement('p');
  tarefa.textContent = `${acao.titulo} · ${acao.tempo} min · ${acao.local}`;
  const instrucoes = document.createElement('ol');
  for (const passo of acao.passos) {
    const linha = document.createElement('li');
    linha.textContent = passo;
    instrucoes.append(linha);
  }
  const fontes = document.createElement('div');
  fontes.className = 'ods-fontes';
  for (const [rotulo, url] of [
    ['Ver todas as metas na ONU Brasil', `https://brasil.un.org/pt-br/sdgs/${numero}`],
    ['Ver indicadores globais na ONU (em inglês)', `https://sdgs.un.org/goals/goal${numero}`]
  ]) {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = rotulo;
    fontes.append(link);
  }
  descricaoOds.replaceChildren(titulo, texto, comecar, tarefa, instrucoes, metasTitulo, metas, exemploTitulo, exemploTexto, subtitulo, contexto, fontes);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    descricaoOds.getAnimations().forEach(animacao => animacao.cancel());
    descricaoOds.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 160 });
  }
}

objetivos.forEach((nome, i) => {
  const numero = i + 1;
  const item = document.createElement('div');
  item.className = 'ods-item';
  const rotulo = document.createElement('label');
  rotulo.className = 'ods-escolha';
  const caixa = document.createElement('input');
  caixa.type = 'checkbox';
  caixa.name = 'ods';
  caixa.value = numero;
  const titulo = `ODS ${numero} — ${nome}`;
  caixa.setAttribute('aria-label', titulo);
  const icone = document.createElement('img');
  icone.src = `ods/${numero}.webp`;
  icone.alt = '';
  icone.width = 160;
  icone.height = 160;
  icone.loading = 'lazy';
  const marca = document.createElement('span');
  marca.className = 'ods-marca';
  marca.setAttribute('aria-hidden', 'true');
  marca.textContent = '✓';
  rotulo.append(caixa, icone, marca);
  const abrir = () => abrirDescricao(rotulo, titulo, descricoes[i], historiasOds[i], numero);
  rotulo.addEventListener('pointerenter', evento => {
    if (evento.pointerType === 'mouse') abrir();
  });
  caixa.addEventListener('focus', () => {
    if (caixa.matches(':focus-visible')) abrir();
  });
  caixa.addEventListener('change', () => {
    atualizarSelecao();
    abrir();
  });
  item.append(rotulo);
  opcoes.append(item);
});

document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape' && !painelOds.contains(document.activeElement)) fecharDescricao();
});
document.addEventListener('pointerdown', evento => {
  if (itemAberto && !evento.target.closest('.ods-item, #painel-ods')) fecharDescricao();
});


function mostrar() {
  const acao = encontradas[indice];
  titulo.textContent = acao.titulo;
  const etiquetas = [`ODS ${acao.ods}`, `${acao.tempo} min`, acao.custo ? `Até R$ ${acao.custo}` : 'Sem gastar', acao.local];
  document.querySelector('#etiquetas').replaceChildren(...etiquetas.map(texto => {
    const tag = document.createElement('span');
    tag.textContent = texto;
    return tag;
  }));
  document.querySelector('#passos').replaceChildren(...acao.passos.map(texto => {
    const passo = document.createElement('li');
    passo.textContent = texto;
    return passo;
  }));
  const fonte = document.querySelector('#fonte');
  fonte.href = `https://brasil.un.org/pt-br/sdgs/${acao.ods}`;
  fonte.textContent = `Conhecer o ODS ${acao.ods} ↗`;
  resultado.hidden = false;
  resultado.getAnimations().forEach(animacao => animacao.cancel());
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    resultado.animate(
      [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 180, easing: 'ease-out' }
    );
  }
  outra.hidden = encontradas.length < 2;
  status.textContent = `Ação ${indice + 1} de ${encontradas.length}.`;
  titulo.focus();
  document.dispatchEvent(new CustomEvent("tema-ods", { detail: [acao.ods] }));
}

function buscar() {
  const dados = new FormData(form);
  const selecionados = dados.getAll('ods').map(Number);
  encontradas = filtrarAcoes(acoes, { ...Object.fromEntries(dados), ods: selecionados });
  indice = 0;
  if (encontradas.length) {
    mostrar();
    return;
  }
  resultado.hidden = true;
  status.textContent = 'Nenhuma ação combina com esses filtros. Tente mudar o local ou ampliar o tempo.';
  document.dispatchEvent(new CustomEvent("tema-ods", { detail: selecionados }));
  status.tabIndex = -1;
  status.focus();
}

form.addEventListener('submit', evento => {
  evento.preventDefault();
  buscar();
});
form.addEventListener('reset', () => {
  queueMicrotask(atualizarSelecao);
  fecharDescricao();
  resultado.hidden = true;
  status.textContent = '';
  document.dispatchEvent(new CustomEvent("tema-ods", { detail: null }));
});
outra.addEventListener('click', () => {
  indice = (indice + 1) % encontradas.length;
  mostrar();
});
