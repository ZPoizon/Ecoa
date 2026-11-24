const { test } = require('node:test');
const assert = require('node:assert/strict');
const { preencherCartaoPonto } = require('../public/pontos-osm');

class TextoFalso {
  constructor(texto) { this.textContent = String(texto); }
}

class ElementoFalso {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this._text = '';
    this.className = '';
    this.attributes = {};
  }
  set textContent(texto) { this._text = String(texto); this.children = []; }
  get textContent() { return this._text + this.children.map(filho => filho.textContent).join(''); }
  append(...filhos) { this.children.push(...filhos); }
  addEventListener() {}
  setAttribute(nome, valor) { this.attributes[nome] = String(valor); }
}

function criarDocumentoFalso() {
  return {
    createElement: tagName => new ElementoFalso(tagName),
    createTextNode: texto => new TextoFalso(texto)
  };
}

function criarPonto() {
  return {
    id: 'fixo-1',
    nome: 'Ponto de coleta com nome longo para testar quebra',
    categoria: 'reciclagem',
    latitude: -23.55,
    longitude: -46.63,
    endereco: 'Rua de exemplo, 123',
    cidade: 'São Paulo',
    UF: 'SP',
    descricao: 'Recebe plástico e papel em horário comercial.',
    fonte: 'https://example.org/fonte',
    site: 'https://example.org',
    origem: 'fixo',
    dataVerificacao: '2026-01-15'
  };
}

function rotulosDasAcoes(acoes) {
  return acoes.children
    .filter(filho => ['A', 'BUTTON'].includes(filho.tagName))
    .map(filho => filho.textContent);
}

test('cartões de ponto preservam descrição e origem com uma ação por finalidade', () => {
  const doc = criarDocumentoFalso();
  const item = doc.createElement('li');
  const acoes = preencherCartaoPonto(doc, item, criarPonto());
  const rotulos = rotulosDasAcoes(acoes);

  assert.equal(acoes.className, 'buttons ponto-botoes');
  assert.match(item.textContent, /Recebe plástico e papel em horário comercial\./);
  assert.match(item.textContent, /Fonte: curadoria do Ecoa/);
  assert.equal(rotulos.filter(rotulo => rotulo === 'Como chegar').length, 1);
  assert.equal(rotulos.filter(rotulo => rotulo === 'Consultar fonte').length, 1);
  assert.equal(rotulos.filter(rotulo => rotulo === 'Site do local').length, 1);
});

test('detalhes do ponto mantêm descrição, ações e links ODS sem duplicar fonte ou rota', () => {
  const doc = criarDocumentoFalso();
  const item = doc.createElement('li');
  const acoes = preencherCartaoPonto(doc, item, criarPonto(), { detalhado: true });
  const rotulos = rotulosDasAcoes(acoes);

  assert.match(item.textContent, /Recebe plástico e papel em horário comercial\./);
  assert.match(item.textContent, /O que fazer aqui\?/);
  assert.ok(item.children.some(filho => filho.className === 'ponto-ods'));
  assert.equal(rotulos.filter(rotulo => rotulo === 'Como chegar').length, 1);
  assert.equal(rotulos.filter(rotulo => rotulo === 'Consultar fonte').length, 1);
});
