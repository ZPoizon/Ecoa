// Fonte única das categorias da tela “Na cidade”.
// Os valores são exatamente os aceitos por supabase/schema.sql; “Todos” serve só ao filtro.
const CATEGORIA_TODOS_PONTOS = '';
const CATEGORIAS_PONTOS = Object.freeze([
  Object.freeze({ valor: 'reciclagem', nome: 'Reciclagem', orientacao: 'Local que recebe materiais recicláveis.', tagsOSM: Object.freeze([Object.freeze(['amenity', 'recycling'])]) }),
  Object.freeze({ valor: 'doacao', nome: 'Doação', orientacao: 'Local que recebe doações. Informe o que aceita.', tagsOSM: Object.freeze([Object.freeze(['shop', 'charity'])]) }),
  Object.freeze({ valor: 'agua', nome: 'Água potável', orientacao: 'Ponto público de água para beber. Confirme essa informação.', tagsOSM: Object.freeze([Object.freeze(['amenity', 'drinking_water'])]) }),
  Object.freeze({ valor: 'horta', nome: 'Hortas e áreas verdes', orientacao: 'Horta comunitária, parque ou área verde acessível.', tagsOSM: Object.freeze([Object.freeze(['leisure', 'garden']), Object.freeze(['leisure', 'park']), Object.freeze(['landuse', 'allotments'])]) }),
  Object.freeze({ valor: 'oleo-de-cozinha', nome: 'Óleo de cozinha', orientacao: 'Local que recebe óleo usado para descarte adequado.', tagsOSM: Object.freeze([Object.freeze(['recycling:cooking_oil', 'yes'])]) }),
  Object.freeze({ valor: 'pilhas-eletronicos', nome: 'Pilhas e eletrônicos', orientacao: 'Local que recebe pilhas, baterias ou equipamentos eletrônicos.', tagsOSM: Object.freeze([Object.freeze(['recycling:batteries', 'yes']), Object.freeze(['recycling:small_electrical_appliances', 'yes'])]) }),
  Object.freeze({ valor: 'outro', nome: 'Outros', orientacao: 'Outro local útil para ações ligadas aos ODS. Explique como ele ajuda.', tagsOSM: Object.freeze([Object.freeze(['amenity', 'public_bookcase']), Object.freeze(['amenity', 'community_centre'])]) })
]);
// Base vetorial antiga usa estes nomes; normalizamos na leitura, sem reescrever dados.
const ALIASES_CATEGORIA_PONTOS = Object.freeze({ verde: 'horta', outros: 'outro' });
function categoriaPontosCanonica(valor) {
  const texto = String(valor == null ? '' : valor).trim();
  return Object.prototype.hasOwnProperty.call(ALIASES_CATEGORIA_PONTOS, texto) ? ALIASES_CATEGORIA_PONTOS[texto] : texto;
}
function categoriaPontosValida(valor) {
  const canonica = categoriaPontosCanonica(valor);
  return CATEGORIAS_PONTOS.some(c => c.valor === canonica);
}
function orientacaoCategoriaPontos(valor) {
  const canonica = categoriaPontosCanonica(valor);
  return (CATEGORIAS_PONTOS.find(c => c.valor === canonica) || {}).orientacao || '';
}
function preencherFiltrosCategoriaPontos(doc) {
  const grupo = doc && typeof doc.querySelector === 'function' ? doc.querySelector('.osm-chips') : null;
  if (!grupo || typeof grupo.replaceChildren !== 'function' || typeof doc.createElement !== 'function') return false;
  const botao = (texto, valor) => {
    const el = doc.createElement('button');
    el.type = 'button';
    el.textContent = texto;
    if (!el.dataset) el.dataset = {};
    el.dataset.categoriaOsm = valor;
    el.setAttribute('data-categoria-osm', valor);
    el.setAttribute('aria-pressed', String(valor === CATEGORIA_TODOS_PONTOS));
    return el;
  };
  grupo.replaceChildren(botao('Todos', CATEGORIA_TODOS_PONTOS), ...CATEGORIAS_PONTOS.map(c => botao(c.nome, c.valor)));
  return true;
}
function preencherSelectCategoriaPontos(doc) {
  const select = doc && typeof doc.getElementById === 'function' ? doc.getElementById('cadastro-categoria') : null;
  if (!select || typeof select.replaceChildren !== 'function' || typeof doc.createElement !== 'function') return false;
  const opcao = (texto, valor) => {
    const el = doc.createElement('option');
    el.textContent = texto;
    el.value = valor;
    return el;
  };
  select.replaceChildren(opcao('Selecione', ''), ...CATEGORIAS_PONTOS.map(c => opcao(c.nome, c.valor)));
  return true;
}
const apiCategoriasPontos = {
  CATEGORIA_TODOS_PONTOS, CATEGORIAS_PONTOS, ALIASES_CATEGORIA_PONTOS,
  categoriaPontosCanonica, categoriaPontosValida, orientacaoCategoriaPontos,
  preencherFiltrosCategoriaPontos, preencherSelectCategoriaPontos
};
if (typeof module !== 'undefined') module.exports = apiCategoriasPontos;
else window.EcoaCategoriasPontos = apiCategoriasPontos;
