// Cache local SOMENTE de pontos aprovados, isolado por projeto Supabase.
// Nunca guarda pendentes, denúncias, contadores nem chaves privilegiadas.
const CHAVE_CACHE_PONTOS = 'ecoa:pontos:cache-v1';
const categoriasCachePontos = typeof module !== 'undefined' ? require('./categorias-pontos') : window.EcoaCategoriasPontos;
const TIPOS_CACHE_PONTOS = categoriasCachePontos.CATEGORIAS_PONTOS.map(c => c.valor);

function projetoCachePontos(config) {
  try {
    const url = new URL(config && config.SUPABASE_URL);
    return url.protocol === 'https:' ? url.host : '';
  } catch { return ''; }
}
function normalizarChaveCachePontos(texto) {
  return String(texto || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function chaveConsultaCachePontos(filtros = {}) {
  const bbox = Array.isArray(filtros.bbox) && filtros.bbox.length === 4
    ? filtros.bbox.map(n => Number(n).toFixed(3)) : null;
  return JSON.stringify([
    filtros.categoria || '', normalizarChaveCachePontos(filtros.cidade), filtros.uf || '',
    normalizarChaveCachePontos(filtros.nome), bbox
  ]);
}
function pontoCacheValido(p) {
  return p && typeof p.id === 'string' && /^supabase-/.test(p.id)
    && typeof p.bancoId === 'string' && /^[0-9a-f-]{8,}$/i.test(p.bancoId)
    && typeof p.nome === 'string' && p.nome.trim().length > 0 && p.nome.length <= 120
    && TIPOS_CACHE_PONTOS.includes(p.categoria)
    && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90
    && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180
    && p.origem === 'supabase' && typeof p.verificado === 'boolean';
}
function sanitizarPontosCache(lista) {
  if (!Array.isArray(lista)) throw Error('Cache inválido');
  return lista.filter(pontoCacheValido).slice(0, 200).map(p => ({
    id: p.id, bancoId: p.bancoId, nome: p.nome.slice(0, 120), categoria: p.categoria,
    cidade: String(p.cidade || '').slice(0, 100), UF: String(p.UF || '').slice(0, 2),
    bairro: String(p.bairro || '').slice(0, 100), endereco: String(p.endereco || '').slice(0, 240),
    descricao: String(p.descricao || '').slice(0, 600), horario: String(p.horario || '').slice(0, 200),
    aceita: String(p.aceita || '').slice(0, 300), telefone: String(p.telefone || '').slice(0, 40),
    site: String(p.site || '').slice(0, 500), latitude: p.latitude, longitude: p.longitude,
    verificado: p.verificado, origem: 'supabase'
  }));
}
function criarCachePontos(config, { storage, agora = Date.now, ttl = 86400000, limiteBytes = 800000, limiteEntradas = 24 } = {}) {
  const projeto = projetoCachePontos(config);
  const chave = CHAVE_CACHE_PONTOS + ':' + projeto;
  const inativo = { disponivel: false, ler: () => null, gravar: () => false, limpar: () => false };
  if (!storage || !projeto) return inativo;

  function carregar() {
    try {
      const dados = JSON.parse(storage.getItem(chave) || 'null');
      if (!dados || dados.projeto !== projeto || dados.versao !== 1 || !dados.entradas || typeof dados.entradas !== 'object' || Array.isArray(dados.entradas)) {
        return { projeto, versao: 1, entradas: {} };
      }
      const agoraMs = agora();
      for (const [k, entrada] of Object.entries(dados.entradas)) {
        let pontos;
        try { pontos = sanitizarPontosCache(entrada && entrada.pontos); }
        catch { pontos = null; }
        if (!pontos || !Number.isFinite(entrada.em) || entrada.em > agoraMs + 60000 || agoraMs - entrada.em > ttl) {
          delete dados.entradas[k];
        } else {
          entrada.pontos = pontos;
        }
      }
      return dados;
    } catch { return { projeto, versao: 1, entradas: {} }; }
  }
  function salvar(dados) {
    const entradas = Object.entries(dados.entradas);
    while (entradas.length > limiteEntradas) {
      const removida = entradas.shift();
      if (removida) delete dados.entradas[removida[0]];
    }
    let texto = JSON.stringify(dados);
    while (texto.length > limiteBytes && Object.keys(dados.entradas).length) {
      const maisAntiga = Object.entries(dados.entradas).sort((a, b) => a[1].em - b[1].em)[0];
      delete dados.entradas[maisAntiga[0]];
      texto = JSON.stringify(dados);
    }
    if (texto.length > limiteBytes) return false;
    try { storage.setItem(chave, texto); return true; }
    catch { return false; }
  }
  return {
    disponivel: true,
    ler(filtros) {
      const entrada = carregar().entradas[chaveConsultaCachePontos(filtros)];
      return entrada ? entrada.pontos.slice() : null;
    },
    gravar(filtros, lista) {
      let pontos;
      try { pontos = sanitizarPontosCache(lista); }
      catch { return false; }
      const dados = carregar();
      // Uma resposta válida e vazia substitui o resultado antigo desta mesma consulta.
      dados.entradas[chaveConsultaCachePontos(filtros)] = { em: agora(), pontos };
      return salvar(dados);
    },
    limpar() { try { storage.removeItem(chave); return true; } catch { return false; } }
  };
}
const apiCachePontos = { CHAVE_CACHE_PONTOS, TIPOS_CACHE_PONTOS, projetoCachePontos, chaveConsultaCachePontos, pontoCacheValido, sanitizarPontosCache, criarCachePontos };
if (typeof module !== 'undefined') module.exports = apiCachePontos;
else window.EcoaPontosCache = apiCachePontos;
