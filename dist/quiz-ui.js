function iniciarQuiz(documento, perguntas, calcular, nomes, abrirGuia, buscarAcoes) {
  const inicio = documento.querySelector('#quiz-inicio');
  const formulario = documento.querySelector('#quiz-form');
  const pergunta = documento.querySelector('#quiz-pergunta');
  const opcoesQuiz = documento.querySelector('#quiz-opcoes');
  const progresso = documento.querySelector('#quiz-progresso');
  const erro = documento.querySelector('#quiz-erro');
  const voltar = documento.querySelector('#quiz-voltar');
  const avancar = documento.querySelector('#quiz-avancar');
  const resultadoQuiz = documento.querySelector('#quiz-resultado');
  const cartoes = documento.querySelector('#quiz-cartoes');
  const respostas = Array(perguntas.length).fill(null);
  let etapa = 0;

  function mostrarPergunta() {
    formulario.hidden = false;
    resultadoQuiz.hidden = true;
    inicio.hidden = true;
    erro.textContent = '';
    progresso.textContent = `Pergunta ${etapa + 1} de ${perguntas.length}`;
    pergunta.textContent = perguntas[etapa].titulo;
    voltar.disabled = etapa === 0;
    avancar.textContent = etapa === perguntas.length - 1 ? 'Ver meu resultado' : 'Continuar';
    opcoesQuiz.replaceChildren();
    perguntas[etapa].opcoes.forEach((opcao, indice) => {
      const rotulo = documento.createElement('label');
      rotulo.className = 'quiz-opcao';
      const radio = documento.createElement('input');
      radio.type = 'radio';
      radio.name = 'resposta-quiz';
      radio.value = indice;
      radio.checked = respostas[etapa] === indice;
      radio.addEventListener('change', () => { respostas[etapa] = indice; erro.textContent = ''; });
      const texto = documento.createElement('span');
      texto.textContent = opcao.texto;
      rotulo.append(radio, texto);
      opcoesQuiz.append(rotulo);
    });
    pergunta.focus();
  }

  function mostrarResultado() {
    const recomendacoes = calcular(respostas);
    cartoes.replaceChildren();
    recomendacoes.forEach(item => {
      const card = documento.createElement('article');
      card.className = 'quiz-card';
      const titulo = documento.createElement('h4');
      titulo.textContent = `ODS ${item.ods} · ${nomes[item.ods - 1]}`;
      const motivo = documento.createElement('p');
      motivo.textContent = 'Combina com sua escolha: “' + item.afinidades[0] + '”.';
      const botoes = documento.createElement('div');
      botoes.className = 'buttons';
      const guia = documento.createElement('button');
      guia.type = 'button';
      guia.className = 'secondary';
      guia.textContent = `Ler guia do ODS ${item.ods}`;
      guia.addEventListener('click', () => abrirGuia(item.ods));
      const acoes = documento.createElement('button');
      acoes.type = 'button';
      acoes.textContent = `Ver ações do ODS ${item.ods}`;
      acoes.addEventListener('click', () => buscarAcoes(item.ods));
      botoes.append(guia, acoes);
      card.append(titulo, motivo, botoes);
      cartoes.append(card);
    });
    formulario.hidden = true;
    resultadoQuiz.hidden = false;
    documento.querySelector('#quiz-resultado-titulo').focus();
  }

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    if (respostas[etapa] === null) {
      erro.textContent = 'Escolha uma opção para continuar.';
      opcoesQuiz.querySelector('input').focus();
      return;
    }
    if (etapa < perguntas.length - 1) { etapa++; mostrarPergunta(); }
    else mostrarResultado();
  });
  voltar.addEventListener('click', () => { if (etapa > 0) { etapa--; mostrarPergunta(); } });
  documento.querySelector('#quiz-comecar').addEventListener('click', mostrarPergunta);
  documento.querySelector('#quiz-refazer').addEventListener('click', () => {
    respostas.fill(null);
    etapa = 0;
    mostrarPergunta();
  });
}

if (typeof module !== 'undefined') module.exports = {iniciarQuiz};
else iniciarQuiz(document, perguntasQuiz, calcularResultadoQuiz, objetivos,
  ods => {
    seletorGuia.value = ods;
    preencherGuia();
    document.querySelector('#guia-nome').focus();
  },
  ods => {
    form.reset();
    opcoes.querySelector(`input[value="${ods}"]`).checked = true;
    atualizarSelecao();
    buscar();
  });
