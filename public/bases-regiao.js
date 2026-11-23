/* Bases regionais importadas: índice pequeno, arquivos por município carregados sob demanda.
   Nenhuma consulta externa acontece no build; atualizações são manuais (scripts/importar-osm.mjs).
   A última base válida de cada cidade é preservada se uma recarga falhar. */
const CHAVE_CACHE_BASES_REGIAO = 'ecoa:bases-regiao-cache-v1';
const LIMITE_BASES_REGIAO = 6;
const LIMITE_BYTES_BASES_REGIAO = 600000;
const urlBaseRegiaoSegura = valor => typeof valor === 'string' && /^bases\/[0-9]{7}\.json$/.test(valor);
function normalizarBaseRegiao(texto) {
  return String(texto || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function validarIndiceBases(dados) {
  if (!dados || dados.versao !== 1 || !Array.isArray(dados.cidades)) throw Error('Índice regional inválido.');
  const cidades = [];
  const vistos = new Set();
  for (const c of dados.cidades) {
    if (!c || !/^[0-9]{7}$/.test(String(c.id || '')) || typeof c.cidade !== 'string' || !c.cidade.trim() ||
        !/^[A-Z]{2}$/.test(String(c.uf || '')) || !urlBaseRegiaoSegura(c.arquivo) ||
        !Number.isInteger(c.quantidade) || c.quantidade < 0 || c.quantidade > 200 ||
        !Array.isArray(c.centro) || c.centro.length !== 2 || !c.centro.every(Number.isFinite) ||
        (c.abrangencia !== 'municipio' && c.abrangencia !== 'cidade e arredores') ||
        vistos.has(c.id)) throw Error('Índice regional inválido.');
    vistos.add(c.id);
    cidades.push(Object.freeze({
      id: String(c.id), ibge: String(c.ibge || c.id).slice(0, 20),
      cidade: String(c.cidade).slice(0, 100), uf: String(c.uf),
      arquivo: String(c.arquivo), quantidade: c.quantidade, centro: c.centro.map(Number),
      abrangencia: c.abrangencia, geradoEm: typeof c.geradoEm === 'string' ? c.geradoEm.slice(0, 40) : '',
      osmRelation: Number.isSafeInteger(c.osmRelation) ? c.osmRelation : null,
      cobertura: String(c.cobertura || '').slice(0, 500)
    }));
  }
  return Object.freeze({ atualizadoEm: String(dados.atualizadoEm || '').slice(0, 40), cidades });
}
function validarBaseCidade(dados, entrada) {
  if (!dados || dados.versao !== 1 || String(dados.id) !== String(entrada.id) ||
      !Array.isArray(dados.pontos) || dados.pontos.length > 200) throw Error('Base regional inválida.');
  const utf = String(dados.uf || '').toUpperCase();
  if (utf !== entrada.uf || normalizarBaseRegiao(dados.cidade) !== normalizarBaseRegiao(entrada.cidade)) {
    throw Error('Base regional não corresponde ao município.');
  }
  const pontos = [];
  const vistos = new Set();
  for (const p of dados.pontos) {
    if (!p || typeof p.id !== 'string' || !/^base-[0-9]{7}-[a-z-]+-[0-9]+$/.test(p.id) ||
        typeof p.nome !== 'string' || !p.nome.trim() || p.nome.length > 200 ||
        typeof p.categoria !== 'string' || !p.categoria ||
        !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180 ||
        typeof p.fonte !== 'string' || !/^https:\/\//.test(p.fonte) || p.fonte.length > 500 ||
        p.origem !== 'base' || vistos.has(p.id)) throw Error('Base regional inválida.');
    vistos.add(p.id);
    pontos.push(Object.freeze({
      ...p,
      nome: p.nome.slice(0, 200), fonte: p.fonte.slice(0, 500),
      cidade: String(p.cidade || entrada.cidade).slice(0, 100),
      UF: String(p.UF || entrada.uf).toUpperCase().slice(0, 2),
      municipioId: String(entrada.id), idBaseCidade: String(entrada.id),
      abrangencia: entrada.abrangencia, endereco: String(p.endereco || '').slice(0, 300),
      bairro: String(p.bairro || '').slice(0, 100),
      descricao: String(p.descricao || '').slice(0, 300),
      horario: String(p.horario || '').slice(0, 200),
      aceita: String(p.aceita || '').slice(0, 300)
    }));
  }
  if (pontos.length !== entrada.quantidade) throw Error('Base regional incompleta.');
  return Object.freeze({
    ...dados, cidade: String(entrada.cidade), uf: String(entrada.uf),
    abrangencia: entrada.abrangencia, pontos
  });
}
function criarGerenciadorBasesRegiao({ fetcher = fetch, storage, agora = Date.now } = {}) {
  const cache = new Map();
  let indice = null, promessaIndice = null;
  try {
    const brutos = JSON.parse(storage?.getItem(CHAVE_CACHE_BASES_REGIAO) || '{}');
    if (brutos && typeof brutos === 'object' && !Array.isArray(brutos)) {
      for (const [id, base] of Object.entries(brutos)) {
        if (!/^[0-9]{7}$/.test(id) || !base || !Array.isArray(base.pontos) || base.pontos.length > 200) continue;
        cache.set(id, base);
      }
    }
  } catch {}
  function persistir() {
    try {
      const itens = [...cache.entries()].slice(-LIMITE_BASES_REGIAO);
      const texto = JSON.stringify(Object.fromEntries(itens));
      if (new TextEncoder().encode(texto).length > LIMITE_BYTES_BASES_REGIAO) return;
      storage?.setItem(CHAVE_CACHE_BASES_REGIAO, texto);
    } catch {}
  }
  async function obterJson(url, signal) {
    const resposta = await fetcher(url, { credentials: 'same-origin', cache: 'no-store', signal });
    if (!resposta.ok) throw Error('Não foi possível carregar a base regional.');
    return resposta.json();
  }
  async function listar() {
    if (indice) return indice;
    if (promessaIndice) return promessaIndice;
    promessaIndice = obterJson('bases-regiao-indice.json').then(dados => {
      indice = validarIndiceBases(dados);
      return indice;
    }).catch(erro => { promessaIndice = null; throw erro; });
    return promessaIndice;
  }
  function encontrar(cidade, uf) {
    if (!indice) return null;
    const alvo = normalizarBaseRegiao(cidade), sigla = String(uf || '').toUpperCase();
    return indice.cidades.find(c => normalizarBaseRegiao(c.cidade) === alvo && c.uf === sigla) || null;
  }
  async function carregar(id, { revalidar = false } = {}) {
    const lista = await listar();
    const entrada = lista.cidades.find(c => c.id === String(id));
    if (!entrada) throw Error('Cidade sem base importada.');
    if (!revalidar && cache.has(id)) return { ...cache.get(id), origemCache: true };
    try {
      const base = validarBaseCidade(await obterJson(entrada.arquivo), entrada);
      cache.delete(id); cache.set(id, base);
      while (cache.size > LIMITE_BASES_REGIAO) cache.delete(cache.keys().next().value);
      persistir();
      return { ...base, origemCache: false };
    } catch (erro) {
      if (cache.has(id)) return { ...cache.get(id), origemCache: true, falha: String(erro.message || erro) };
      throw erro;
    }
  }
  return { listar, encontrar, carregar, emCache: id => cache.has(id), indice: () => indice };
}
const apiBasesRegiao = {
  CHAVE_CACHE_BASES_REGIAO, normalizarBaseRegiao, validarIndiceBases, validarBaseCidade,
  criarGerenciadorBasesRegiao
};
if (typeof module !== 'undefined') module.exports = apiBasesRegiao;
else window.EcoaBasesRegiao = apiBasesRegiao;
