// Busca única: pontos aprovados no Supabase + endereços/CEP/cidades (Photon/ViaCEP).
// Nenhum resultado de geocodificador vira ponto; textos externos sempre via textContent.
function criarServicoBuscaCidade({ buscarPontos, provedorEnderecos, criarServico = globalThis.criarServicoEnderecos, normalizar = globalThis.normalizarBuscaEndereco, relogio = globalThis } = {}) {
  const servicoEnderecos = (typeof criarServico === 'function' && provedorEnderecos)
    ? criarServico(provedorEnderecos) : null;
  const cache = new Map();

  async function buscar(texto, opcoes = {}) {
    const termo = (typeof normalizar === 'function' ? normalizar(String(texto || '')) : String(texto || '').trim().toLowerCase());
    if (termo.length < 3) return [];
    const chave = JSON.stringify([termo, opcoes.vies || null]);
    if (cache.has(chave)) {
      const valor = cache.get(chave);
      cache.delete(chave); cache.set(chave, valor);
      return valor.map(x => ({ ...x }));
    }
    const controle = new AbortController();
    const cancelar = () => controle.abort();
    if (opcoes.signal?.aborted) throw Object.assign(Error('Cancelado'), { name: 'AbortError' });
    opcoes.signal?.addEventListener('abort', cancelar, { once: true });
    const timer = relogio.setTimeout(() => controle.abort(), 12000);
    try {
      const promessaPontos = Promise.resolve()
        .then(() => buscarPontos ? buscarPontos(termo, { signal: controle.signal }) : [])
        .then(lista => (Array.isArray(lista) ? lista : []).map(p => ({
          tipo: 'ponto', id: 'ponto-' + p.id, nome: p.nome,
          subtitulo: [p.categoria, p.cidade, p.UF].filter(Boolean).join(' · '), ponto: p
        })))
        .catch(() => []);
      const promessaEnderecos = Promise.resolve()
        .then(() => servicoEnderecos ? servicoEnderecos(termo, { signal: controle.signal, vies: opcoes.vies }) : [])
        .then(lista => (Array.isArray(lista) ? lista : []).map(p => ({
          tipo: 'endereco', id: 'endereco-' + [p.cep, p.nome, p.cidade, p.uf].filter(Boolean).join('-'),
          nome: p.rotulo || p.nome, subtitulo: p.subtitulo || '', endereco: p
        })))
        .catch(() => []);
      const [pontos, enderecos] = await Promise.all([promessaPontos, promessaEnderecos]);
      if (controle.signal.aborted) throw Object.assign(Error('Cancelado'), { name: 'AbortError' });
      const itens = [...pontos.slice(0, 8), ...enderecos.slice(0, 5)];
      cache.set(chave, itens.map(x => ({ ...x })));
      if (cache.size > 30) cache.delete(cache.keys().next().value);
      return itens;
    } finally {
      relogio.clearTimeout(timer);
      opcoes.signal?.removeEventListener('abort', cancelar);
    }
  }
  return { buscar };
}
function criarControleBuscaCidade({ buscar, atualizar, vies = () => null, relogio = globalThis } = {}) {
  let timer, controle, geracao = 0;
  function cancelar() { relogio.clearTimeout(timer); controle?.abort(); geracao++; }
  async function executar(texto) {
    cancelar();
    const atual = geracao;
    if (String(texto || '').trim().length < 3) { atualizar('fechado', []); return []; }
    controle = new AbortController();
    const requisicao = controle;
    atualizar('carregando', []);
    try {
      const itens = await buscar(texto, { signal: requisicao.signal, vies: vies() });
      if (atual !== geracao) return [];
      atualizar(itens.length ? 'pronto' : 'vazio', itens);
      return itens;
    } catch (e) {
      if (atual === geracao && e.name !== 'AbortError') atualizar('erro', []);
      return [];
    }
  }
  function digitar(texto) {
    cancelar(); atualizar('fechado', []);
    if (String(texto || '').trim().length >= 3) timer = relogio.setTimeout(() => executar(texto), 350);
  }
  return { digitar, executar, cancelar };
}
function iniciarBuscaCidade(doc, ambiente, api = {}) {
  const $ = id => doc.getElementById(id);
  const form = $('cidade-busca-endereco'), input = $('cidade-busca-unica');
  if (!form || !input) return { conectar() {}, buscar: async () => [], cancelar() {} };
  const Area = doc.createElement('div');
  Area.className = 'busca-unica';
  input.parentNode.insertBefore(Area, input);
  Area.append(input);
  const lista = doc.createElement('div');
  lista.className = 'busca-unica-lista';
  lista.id = 'cidade-sugestoes';
  lista.setAttribute('role', 'listbox');
  lista.setAttribute('aria-label', 'Resultados da busca');
  lista.hidden = true;
  const status = doc.createElement('p');
  status.className = 'busca-unica-status';
  status.id = 'cidade-busca-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  Area.append(lista, status);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', lista.id);
  input.setAttribute('autocomplete', 'off');
  const descricao = (input.getAttribute('aria-describedby') || '');
  if (descricao.indexOf(status.id) < 0) input.setAttribute('aria-describedby', (descricao + ' ' + status.id).trim());

  let callbacks = {}, itens = [], ativo = -1, compondo = false;
  const servico = api.criarServicoBuscaCidade
    ? api.criarServicoBuscaCidade({
        buscarPontos: (termo, opcoes) => callbacks.buscarPontos?.(termo, opcoes) || [],
        provedorEnderecos: (texto, opcoes) => (typeof api.consultarProvedor === 'function'
          ? api.consultarProvedor(texto, { ...opcoes, fetcher: ambiente.fetch.bind(ambiente) }) : []),
        criarServico: api.criarServico, normalizar: api.normalizar, relogio: ambiente
      })
    : { buscar: async () => [] };
  const controle = api.criarControleBuscaCidade
    ? api.criarControleBuscaCidade({ buscar: servico.buscar, atualizar, vies: () => callbacks.vies?.(), relogio: ambiente })
    : { digitar() {}, executar: async () => [], cancelar() {} };

  function fechar() {
    controle.cancelar(); lista.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    status.textContent = ''; ativo = -1; itens = [];
  }
  function opcao(item, indice) {
    const el = doc.createElement('div');
    el.className = 'busca-unica-opcao';
    el.id = lista.id + '-' + indice;
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', 'false');
    el.dataset.tipoBusca = item.tipo;
    const nome = doc.createElement('strong');
    nome.textContent = String(item.nome || '');
    el.append(nome);
    if (item.subtitulo) { const detalhe = doc.createElement('span'); detalhe.textContent = String(item.subtitulo); el.append(detalhe); }
    el.addEventListener('pointerdown', e => e.preventDefault());
    el.addEventListener('click', () => selecionar(item));
    return el;
  }
  function atualizar(estado, resultados) {
    itens = resultados || []; ativo = -1;
    lista.replaceChildren();
    input.removeAttribute('aria-activedescendant');
    lista.hidden = estado !== 'pronto';
    input.setAttribute('aria-expanded', String(!lista.hidden));
    status.textContent = ({
      carregando: 'Buscando…', vazio: 'Nenhum resultado. Você pode marcar um ponto.',
      erro: 'Busca indisponível. Você ainda pode marcar um ponto.',
      fechado: '', pronto: `${itens.length} resultados. Use as setas para escolher.`
    })[estado];
    if (lista.hidden) return;
    let indice = 0;
    for (const [tipo, rotulo] of [['ponto', 'Pontos cadastrados'], ['endereco', 'Endereços e cidades']]) {
      const grupo = itens.filter(x => x.tipo === tipo);
      if (!grupo.length) continue;
      const bloco = doc.createElement('div');
      bloco.className = 'busca-unica-grupo';
      bloco.setAttribute('role', 'group');
      bloco.setAttribute('aria-label', rotulo);
      const titulo = doc.createElement('p');
      titulo.className = 'busca-unica-grupo-titulo';
      titulo.textContent = rotulo;
      bloco.append(titulo);
      for (const item of grupo) bloco.append(opcao(item, indice++));
      lista.append(bloco);
    }
  }
  function selecionar(item) {
    if (!item) return;
    input.value = item.tipo === 'ponto' ? item.ponto.nome : (item.endereco.rotulo || item.nome);
    fechar();
    if (item.tipo === 'ponto') {
      status.textContent = 'Ponto encontrado: ' + item.ponto.nome;
      callbacks.aoPonto?.(item.ponto);
    } else {
      const p = item.endereco;
      if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) {
        status.textContent = 'Endereço encontrado, mas sem posição confirmada. Nenhum ponto foi criado.';
      } else {
        status.textContent = 'Local encontrado: ' + input.value;
        callbacks.aoEndereco?.(p);
      }
    }
    input.dispatchEvent(new ambiente.CustomEvent('cidade-busca-selecionada', { bubbles: true, detail: item }));
  }
  async function confirmar() {
    const resultados = await controle.executar(input.value);
    if (!resultados.length) { status.textContent = 'Nenhum resultado. Você pode marcar um ponto.'; return []; }
    selecionar(resultados[0]);
    return resultados;
  }
  input.addEventListener('input', () => { if (!compondo) controle.digitar(input.value); });
  input.addEventListener('compositionstart', () => { compondo = true; fechar(); });
  input.addEventListener('compositionend', () => { compondo = false; controle.digitar(input.value); });
  input.addEventListener('keydown', e => {
    if (e.isComposing || compondo) return;
    if (e.key === 'Escape' || e.key === 'Tab') { fechar(); return; }
    if (e.key === 'Enter') {
      if (ativo >= 0 && !lista.hidden) { e.preventDefault(); selecionar(itens[ativo]); }
      return;
    }
    if (!lista.hidden && ['ArrowDown', 'ArrowUp'].includes(e.key) && itens.length) {
      e.preventDefault();
      ativo = ativo < 0 ? (e.key === 'ArrowDown' ? 0 : itens.length - 1)
        : (ativo + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
      const opcoes = lista.querySelectorAll?.('[role="option"]') || [];
      opcoes.forEach((el, i) => el.setAttribute('aria-selected', String(i === ativo)));
      if (opcoes[ativo]) {
        input.setAttribute('aria-activedescendant', opcoes[ativo].id);
        opcoes[ativo].scrollIntoView?.({ block: 'nearest' });
      }
    }
  });
  input.addEventListener('blur', () => { if (!lista.contains?.(doc.activeElement)) fechar(); });
  form.addEventListener('submit', e => { e.preventDefault(); confirmar(); });
  doc.addEventListener('pointerdown', e => { if (!Area.contains(e.target)) fechar(); });
  return {
    conectar(opcoes) { callbacks = opcoes || {}; },
    buscar: texto => controle.executar(texto),
    cancelar: fechar
  };
}
const apiBuscaCidade = { criarServicoBuscaCidade, criarControleBuscaCidade, iniciarBuscaCidade };
if (typeof module !== 'undefined') module.exports = apiBuscaCidade;
else window.EcoaBuscaCidade = iniciarBuscaCidade(document, window, {
  criarServicoBuscaCidade, criarControleBuscaCidade,
  criarServico: criarServicoEnderecos,
  normalizar: normalizarBuscaEndereco,
  consultarProvedor: consultarProvedorEndereco
});
