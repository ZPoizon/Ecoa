const portal = 'https://brasil.un.org/pt-br';
const termos = [
  /pobreza|vulnerab|assistencia social/, /fome|alimenta|agricult|nutri|amamenta/,
  /saude|vacina|raiva|bem-estar|amamenta/, /educa|escola|ensino|aprend/,
  /genero|mulher|menina|casamento infantil/, /saneamento|agua potavel|esgoto/,
  /energia|eletric|renovav/, /trabalho|emprego|empreend|econom/,
  /industria|inova|infraestrutur|tecnolog/, /desigual|migr|refug|inclus|indigen/,
  /cidade|urban|municip|habitacao/, /consumo|producao|recicla|residu|desperdicio/,
  /clima|emisso|carbono|aquecimento/, /oceano|marinh|pesca|vida na agua/,
  /biodivers|florest|desmat|vida terrestre/, /paz|justica|democra|direitos|desinform/,
  /parceria|cooperacao|multilateral|assembleia geral/
];

function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

async function consultar(caminho, tipo) {
  try {
    const resposta = await fetch(portal + caminho, {
      signal: AbortSignal.timeout(6500),
      cf: { cacheEverything: true, cacheTtl: 120 }
    });
    if (!resposta.ok) return null;
    const itens = [];
    let atual;
    const rewriter = new HTMLRewriter()
      .on('div.shadow-un', {
        element(el) {
          const item = { titulo: '', texto: '', url: '' };
          atual = item;
          el.onEndTag(() => {
            if (atual === item) atual = undefined;
            const texto = item.texto.trim().replace(/\s+/g, ' ');
            const historia = /^História\b/u.test(texto);
            const iniciativa = /^(Faça a sua parte|Campaign)\b/u.test(texto);
            if (item.url && item.titulo.trim() && (tipo === 'historias' ? historia : iniciativa)) {
              const data = texto.match(/\b\d{1,2} [\p{L}]+ \d{4}\b/u)?.[0];
              itens.push({ url: item.url, titulo: item.titulo.trim().replace(/\s+/g, ' '), texto, data });
            }
          });
        },
        text(chunk) { if (atual) atual.texto += chunk.text; }
      })
      .on('div.shadow-un a.text-lg', {
        element(el) {
          if (!atual) return;
          const href = el.getAttribute('href');
          if (!href) return;
          const url = new URL(href, portal);
          if (url.protocol === 'https:' && !url.username && !url.password) atual.url = url.href;
        }
      })
      .on('div.shadow-un a.text-lg .font-bold', {
        text(chunk) { if (atual) atual.titulo += chunk.text; }
      });
    await rewriter.transform(resposta).arrayBuffer();
    return itens.length ? itens : null;
  } catch {
    return null;
  }
}

function resumir(itens) {
  const vistos = new Set();
  return itens.filter(item => {
    if (vistos.has(item.url)) return false;
    vistos.add(item.url);
    return true;
  }).slice(0, 5).map(({ titulo, url, data }) => ({ titulo, url, data }));
}

async function noticias(url) {
  const ods = [...new Set((url.searchParams.get('ods') || '').split(',')
    .filter(valor => /^(?:[1-9]|1[0-7])$/.test(valor)).map(Number))];
  const [iniciativas, ...historias] = await Promise.all([
    consultar('/take-action', 'iniciativas'),
    ...(ods.length ? ods.map(id => '/sdgs/' + id) : ['/stories'])
      .map(caminho => consultar(caminho, 'historias'))
  ]);
  return Response.json({
    iniciativas: iniciativas && resumir(iniciativas.filter(item =>
      !ods.length || ods.some(id => termos[id - 1].test(normalizar(item.texto))))),
    historias: historias.every(itens => itens === null) ? null : resumir(historias.flatMap(itens => itens || []))
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return new Response(null, { status: 405 });
    if (url.pathname === '/api/onu') return noticias(url);
    const arquivo = arquivos[url.pathname === '/' ? '/index.html' : url.pathname];
    if (!arquivo) return new Response('Página não encontrada.', { status: 404 });
    return new Response(Uint8Array.from(atob(arquivo[1]), c => c.charCodeAt(0)), {
      headers: { 'Content-Type': arquivo[0], 'X-Content-Type-Options': 'nosniff' }
    });
  }
};
