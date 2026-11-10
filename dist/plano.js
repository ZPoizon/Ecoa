const planoChave = 'oqdpf-plano-v1';
const planoLista = document.querySelector('#plano-lista');
const planoResumo = document.querySelector('#plano-resumo');
const planoAviso = document.querySelector('#plano-aviso');
const salvarAcao = document.querySelector('#salvar-acao');
const chaveAcao = acao => acao.ods + ':' + acao.titulo;
let plano = new Map();

try {
  const dados = JSON.parse(localStorage.getItem(planoChave) || '{}');
  plano = new Map(acoes.map(chaveAcao).filter(chave => typeof dados?.[chave] === 'boolean')
    .map(chave => [chave, dados[chave]]));
} catch {
  planoAviso.textContent = 'Não foi possível ler o plano salvo neste navegador.';
}

function atualizarBotaoSalvar() {
  const acao = encontradas[indice];
  const salva = acao && plano.has(chaveAcao(acao));
  salvarAcao.textContent = salva ? 'Ver no meu plano' : 'Salvar no meu plano';
}

function atualizarPlano() {
  planoLista.replaceChildren();
  const concluidas = [...plano.values()].filter(Boolean).length;
  planoResumo.textContent = plano.size
    ? `${concluidas} de ${plano.size} ações concluídas. Seu plano fica neste navegador.`
    : 'Salve uma sugestão para começar seu plano.';
  for (const acao of acoes) {
    const chave = chaveAcao(acao);
    if (!plano.has(chave)) continue;
    const linha = document.createElement('li');
    const rotulo = document.createElement('label');
    const concluida = document.createElement('input');
    concluida.type = 'checkbox';
    concluida.checked = plano.get(chave);
    concluida.setAttribute('aria-label', 'Concluir: ' + acao.titulo);
    concluida.addEventListener('change', () => {
      plano.set(chave, concluida.checked);
      guardarPlano();
      planoResumo.textContent = `${[...plano.values()].filter(Boolean).length} de ${plano.size} ações concluídas. Seu plano fica neste navegador.`;
    });
    rotulo.append(concluida, acao.titulo);
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'secondary';
    remover.textContent = 'Remover';
    remover.setAttribute('aria-label', 'Remover: ' + acao.titulo);
    remover.addEventListener('click', () => {
      plano.delete(chave);
      guardarPlano();
      atualizarPlano();
      document.querySelector('#plano-titulo').focus();
    });
    linha.append(rotulo, remover);
    planoLista.append(linha);
  }
  atualizarBotaoSalvar();
}

function guardarPlano() {
  try {
    localStorage.setItem(planoChave, JSON.stringify(Object.fromEntries(plano)));
    planoAviso.textContent = '';
  } catch {
    planoAviso.textContent = 'O navegador não permitiu salvar. O plano está disponível nesta sessão.';
  }
}

salvarAcao.addEventListener('click', () => {
  const chave = chaveAcao(encontradas[indice]);
  if (plano.has(chave)) {
    document.querySelector('#plano-titulo').focus();
    return;
  }
  plano.set(chave, false);
  guardarPlano();
  atualizarPlano();
});
document.addEventListener('tema-ods', atualizarBotaoSalvar);

document.querySelectorAll('[data-rapida], [data-tema]').forEach(botao => {
  botao.addEventListener('click', () => {
    form.reset();
    if (botao.dataset.rapida === 'tempo') form.elements.tempo.value = '5';
    if (botao.dataset.rapida === 'rua') form.elements.local.value = 'Na rua';
    if (botao.dataset.rapida === 'gratis') form.elements.custo.value = '0';
    if (botao.dataset.tema) {
      const temas = botao.dataset.tema.split(',');
      for (const campo of form.querySelectorAll('[name="ods"]')) campo.checked = temas.includes(campo.value);

    }
    buscar();
  });
});
atualizarPlano();
