// Incremente a versão ao atualizar arquivos armazenados para uso offline.
const prefixo = 'oqdpf:' + self.registration.scope + ':';
const versao = prefixo + 'v10';
const arquivos = [
  'acessibilidade.js', 'acessibilidade.css', 'index.html', 'style.css', 'manifest.json', 'pwa.js', 'acoes.js', 'app.js',
  'desafio.js', 'desafio-ui.js', 'quiz.js', 'quiz-ui.js', 'compartilhar.js', 'compartilhar-ui.js', 'onu.js', 'plano.js', 'progresso.js', 'plano-json.js', 'plano-pdf.js', 'guias.js', 'vendor/pdf-lib.min.js',
  'icons/ecoa.svg', 'icons/favicon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  ...Array.from({ length: 17 }, (_, i) => 'ods/' + (i + 1) + '.webp')
].map(caminho => new URL(caminho, self.registration.scope).href);
const paginaInicial = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(versao);
    await cache.addAll(arquivos.map(url => new Request(url, { cache: 'reload', redirect: 'error' })));
  })());
});

self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter(chave => chave.startsWith(prefixo) && chave !== versao)
      .map(chave => caches.delete(chave)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', evento => {
  const pedido = evento.request;
  const inicio = self.registration.scope;
  if (pedido.method !== 'GET' || !pedido.url.startsWith(inicio)) return;

  const navegacaoInicial = pedido.mode === 'navigate'
    && [inicio, paginaInicial].includes(new URL(pedido.url).origin + new URL(pedido.url).pathname);
  const destino = navegacaoInicial ? paginaInicial : pedido.url;
  if (!arquivos.includes(destino)) return;

  evento.respondWith((async () => {
    const cache = await caches.open(versao);
    return await cache.match(destino) || fetch(pedido);
  })());
});
