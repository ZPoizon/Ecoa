const form = document.querySelector('#filtros');
const status = document.querySelector('#status');
const resultado = document.querySelector('#resultado');
const outra = document.querySelector('#outra');
const titulo = document.querySelector('#titulo');
const catalogo = document.querySelector('#catalogo');
let encontradas = [];
let indice = 0;

objetivos.forEach((nome, i) => {
  const numero = i + 1;
  const rotulo = document.createElement('label');
  const caixa = document.createElement('input');
  caixa.type = 'checkbox';
  caixa.name = 'ods';
  caixa.value = numero;
  rotulo.append(caixa, `${numero} · ${nome}`);
  document.querySelector('#opcoes-ods').append(rotulo);
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'goal';
  botao.setAttribute('aria-label', `ODS ${numero} — ${nome}`);
  const icone = document.createElement('img');
  icone.src = `ods/${numero}.webp`;
  icone.alt = '';
  icone.width = 160;
  icone.height = 160;
  icone.loading = 'lazy';
  botao.append(icone);
  botao.addEventListener('click', () => {
    form.reset();
    form.querySelector(`[name="ods"][value="${numero}"]`).checked = true;
    buscar();
  });
  catalogo.append(botao);
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
  resultado.hidden = true;
  status.textContent = '';
  document.dispatchEvent(new CustomEvent("tema-ods", { detail: null }));
});
outra.addEventListener('click', () => {
  indice = (indice + 1) % encontradas.length;
  mostrar();
});
