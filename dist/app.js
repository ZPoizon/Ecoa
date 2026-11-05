const form = document.querySelector('#filtros');
const status = document.querySelector('#status');
const resultado = document.querySelector('#resultado');
const outra = document.querySelector('#outra');
const titulo = document.querySelector('#titulo');
const opcoes = document.querySelector('#opcoes-ods');
const totalOds = document.querySelector('#total-ods');
const descricaoOds = document.querySelector('#descricao-ods');
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

function fecharDescricao() {
  itemAberto?.removeAttribute('aria-describedby');
  descricaoOds.hidden = true;
  itemAberto = undefined;
}

function abrirDescricao(item, nome, descricao) {
  fecharDescricao();
  itemAberto = item;
  const titulo = document.createElement('strong');
  titulo.textContent = nome;
  const texto = document.createElement('p');
  texto.textContent = descricao;
  descricaoOds.replaceChildren(titulo, texto);
  descricaoOds.hidden = false;
  item.setAttribute('aria-describedby', descricaoOds.id);
  const alvo = item.getBoundingClientRect();
  const largura = descricaoOds.offsetWidth;
  const altura = descricaoOds.offsetHeight;
  descricaoOds.style.left = Math.max(12, Math.min(alvo.left + (alvo.width - largura) / 2, document.documentElement.clientWidth - largura - 12)) + 'px';
  descricaoOds.style.top = (alvo.top >= altura + 16 ? alvo.top - altura - 8 : Math.min(alvo.bottom + 8, innerHeight - altura - 8)) + 'px';
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
  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'ods-info';
  info.textContent = 'i';
  info.setAttribute('aria-label', 'Sobre ' + titulo);
  const abrir = alvo => abrirDescricao(alvo, titulo, descricoes[i]);
  rotulo.addEventListener('pointerenter', evento => {
    if (evento.pointerType === 'mouse') abrir(rotulo);
  });
  rotulo.addEventListener('pointerleave', () => {
    if (itemAberto === rotulo) fecharDescricao();
  });
  caixa.addEventListener('focus', () => {
    if (caixa.matches(':focus-visible')) abrir(caixa);
  });
  caixa.addEventListener('change', atualizarSelecao);
  info.addEventListener('click', () => {
    if (itemAberto === info) fecharDescricao();
    else abrir(info);
  });
  item.addEventListener('focusout', evento => {
    if (!item.contains(evento.relatedTarget) && item.contains(itemAberto)) fecharDescricao();
  });
  item.append(rotulo, info);
  opcoes.append(item);
});

document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape') fecharDescricao();
});
document.addEventListener('pointerdown', evento => {
  if (itemAberto && !evento.target.closest('.ods-item')) fecharDescricao();
});
window.addEventListener('scroll', fecharDescricao, { passive: true });
window.addEventListener('resize', fecharDescricao);

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
