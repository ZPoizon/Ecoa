// Incremente a versão ao atualizar arquivos armazenados para uso offline.
const prefixo = 'oqdpf:' + self.registration.scope + ':';
const versao = prefixo + 'v47';
const arquivos = [
  'cadastro-pontos.js', 'cadastro-pontos-ui.js', 'cadastro-pontos.css', 'config.js', 'categorias-pontos.js', 'pontos-compartilhados.js', 'pontos-cache.js', 'cidade-busca.js', 'pontos-osm.json', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'cidade-publica.js', 'curador.html', 'curador.js', 'curador-ui.js', 'curador.css', 'vida.js', 'vida.css', 'polimento.css', 'cidade-config.js', 'limpeza.js', 'limpeza.css',
  'rotina.js', 'rotina.css', 'refino-visual.css', 'estrutura.js', 'estrutura.css',
  'pontos-osm.js', 'pontos-osm-ui.js', 'pontos-osm.css', 'pontos-fixos.json', 'cidade-layout.css', 'aprender.js', 'aprender.css', 'agir.js', 'agir.css', 'atividades.js', 'inicio.js', 'inicio.css', 'rotas.js', 'design-system.css', 'acessibilidade.js', 'acessibilidade.css', 'index.html', 'sobre.html', 'style.css', 'manifest.json', 'pwa.js', 'acoes.js', 'app.js',
  'lembretes.js', 'lembretes-ui.js', 'enderecos.js', 'cidade.js', 'cidade-ui.js', 'pontos-modelo.json', 'estimativa.js', 'estimativa-ui.js', 'desafio.js', 'desafio-ui.js', 'quiz.js', 'quiz-ui.js', 'compartilhar.js', 'compartilhar-ui.js', 'onu.js', 'plano.js', 'progresso.js', 'plano-json.js', 'plano-pdf.js', 'guias.js', 'vendor/pdf-lib.min.js',
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
  // Overpass, Photon e demais APIs externas seguem somente pela rede, nunca CacheStorage.
  if (['https://photon.komoot.io','https://viacep.com.br','https://overpass-api.de','https://overpass.private.coffee'].includes(new URL(pedido.url).origin)) return;
  // API do banco nunca é cacheada como arquivo estático.
  if (new URL(pedido.url).pathname.startsWith('/rest/v1/')) return;
  const inicio = self.registration.scope;
  if (pedido.method !== 'GET' || !pedido.url.startsWith(inicio)) return;

  const navegacaoInicial = pedido.mode === 'navigate'
    && [inicio, paginaInicial].includes(new URL(pedido.url).origin + new URL(pedido.url).pathname);
  const sobre = new URL('sobre.html', inicio).href;
  const navegacaoSobre = pedido.mode === 'navigate' && new URL(pedido.url).origin + new URL(pedido.url).pathname === sobre;
  const destino = navegacaoInicial ? paginaInicial : navegacaoSobre ? sobre : pedido.url;
  if (!arquivos.includes(destino)) return;

  evento.respondWith((async () => {
    const cache = await caches.open(versao);
    return await cache.match(destino) || fetch(pedido);
  })());
});

// O destino é fixo e interno: nunca abrir URLs recebidas de notificações.
self.addEventListener('notificationclick',evento=>{
  if(!evento.notification.data?.ecoa)return;
  evento.notification.close();
  evento.waitUntil((async()=>{
    const destino=new URL('./#meu-plano',self.registration.scope).href;
    const abas=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const aba=abas.find(a=>a.url.startsWith(self.registration.scope));
    if(aba){await aba.navigate(destino);return aba.focus();}
    return self.clients.openWindow(destino);
  })());
});

