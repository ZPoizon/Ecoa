const assert = require('node:assert/strict');
const { objetivos, acoes, filtrarAcoes } = require('./public/acoes');
const casos = [
  ['Catálogo completo', () => assert.equal(objetivos.length, 17)],
  ['Ação para cada ODS', () => objetivos.forEach((_, i) => assert.ok(filtrarAcoes(acoes, {ods:i+1}).length))],
  ['Sem filtros', () => assert.equal(filtrarAcoes(acoes, {}).length, 20)],
  ['Tempo máximo', () => assert.deepEqual(filtrarAcoes(acoes, {tempo:'5'}).map(a => a.ods), [3,6,7,12,14])],
  ['Orçamento zero', () => assert.equal(filtrarAcoes(acoes, {custo:'0'}).length, 19)],
  ['Local', () => assert.equal(filtrarAcoes(acoes, {local:'Na rua'}).length, 3)],
  ['Filtros combinados', () => assert.deepEqual(filtrarAcoes(acoes, {tempo:'15',custo:'0',local:'Na rua'}).map(a => a.ods), [11,15])],
  ['Resultado vazio', () => assert.equal(filtrarAcoes(acoes, {tempo:'5',local:'Na rua'}).length, 0)],
  ['Orçamento inclusivo', () => assert.equal(filtrarAcoes(acoes, {custo:'20',ods:'12'}).length, 3)],
  ['Horas e minutos equivalentes', () => assert.deepEqual(filtrarAcoes(acoes, {tempo:'0.5',unidade:'h'}), filtrarAcoes(acoes, {tempo:'30'}))],
  ['Ação de uma hora', () => assert.ok(filtrarAcoes(acoes, {tempo:'1',unidade:'h',custo:'0'}).some(acao => acao.tempo === 60))],
  ['Tempo zero', () => assert.equal(filtrarAcoes(acoes, {tempo:0,unidade:'h'}).length, 0)],
  ['Passos válidos', () => acoes.forEach(a => assert.ok(a.titulo && a.passos.length === 2))]
];
casos.forEach(([nome, teste]) => { teste(); console.log('OK', nome); });

async function validarApiVercel() {
  const api = require('./api/onu');
  const cartao = (categoria, titulo, texto, href = '/pt-br/325862') =>
    `<div class="pb-10 bg-white shadow-un"><a href="/imagem"><img alt="imagem"></a><div>${categoria}</div><div>18 novembro 2026</div><a href="${href}" class="text-lg"><div class="font-bold">${titulo}</div><div>${texto}</div></a></div>`;
  const htmlIniciativas = cartao('Faça a sua parte', 'Ação de água', 'Água potável e saneamento');
  const htmlHistorias = cartao('História', 'História da água', 'Saneamento para todas as pessoas');
  const htmlComLinkInseguro = cartao('Campaign', 'Link inválido', 'Ação educativa', 'javascript:alert(1)');

  assert.deepEqual(api.extrairCartoes(htmlIniciativas, 'iniciativas').map(({ titulo, url, data }) =>
    ({ titulo, url, data })), [{
    titulo: 'Ação de água',
    url: 'https://brasil.un.org/pt-br/325862',
    data: '18 novembro 2026'
  }]);
  assert.equal(api.extrairCartoes(htmlComLinkInseguro, 'iniciativas').length, 0);

  const originalFetch = global.fetch;
  global.fetch = async url => ({
    ok: true,
    text: async () => url.endsWith('/take-action') ? htmlIniciativas : htmlHistorias
  });
  try {
    let status;
    let cabecalhos = {};
    let corpo;
    const resposta = {
      status(codigo) { status = codigo; return this; },
      setHeader(nome, valor) { cabecalhos[nome] = valor; },
      json(dados) { corpo = dados; },
      end() { this.encerrada = true; }
    };
    await api({ method: 'GET', query: { ods: '6' } }, resposta);
    assert.equal(status, 200);
    assert.equal(cabecalhos['Cache-Control'], 'public, s-maxage=120, stale-while-revalidate=300');
    assert.equal(corpo.iniciativas[0].titulo, 'Ação de água');
    assert.equal(corpo.historias[0].titulo, 'História da água');

    await api({ method: 'POST', query: {} }, resposta);
    assert.equal(status, 405);
    assert.equal(resposta.encerrada, true);
  } finally {
    global.fetch = originalFetch;
  }
  console.log('OK Vercel: API ONU, cartões atuais, filtros, cache e método HTTP');
}
validarApiVercel().catch(erro => { console.error(erro); process.exitCode = 1; });

function validarMetadadosVercel() {
  const { atualizarMetadadosVercel } = require('./build.cjs');
  const html = '<link rel="canonical" href="https://antigo.example/"><meta property="og:url" content="https://antigo.example/"><meta property="og:image" content="https://antigo.example/icons/icon-512.png"><meta name="twitter:image" content="https://antigo.example/icons/icon-512.png">';
  const inicio = atualizarMetadadosVercel(html, 'https://ecoa.vercel.app', 'index.html');
  assert.ok(inicio.includes('rel="canonical" href="https://ecoa.vercel.app/"'));
  assert.ok(inicio.includes('property="og:url" content="https://ecoa.vercel.app/"'));
  assert.ok(inicio.includes('property="og:image" content="https://ecoa.vercel.app/icons/icon-512.png"'));
  assert.ok(inicio.includes('name="twitter:image" content="https://ecoa.vercel.app/icons/icon-512.png"'));
  const sobre = atualizarMetadadosVercel(html, 'https://ecoa.vercel.app/', 'sobre.html');
  assert.ok(sobre.includes('rel="canonical" href="https://ecoa.vercel.app/sobre.html"'));
  console.log('OK Vercel: metadados ajustados ao domínio e à página implantada');
}
validarMetadadosVercel();

async function validarPwa() {
  const { existsSync, readFileSync } = require('node:fs');
  const { runInNewContext } = require('node:vm');
  const manifesto = require('./public/manifest.json');
  assert.equal(manifesto.display, 'standalone');
  assert.equal(manifesto.start_url, './');
  for (const icone of manifesto.icons) {
    const png = readFileSync('public/' + icone.src);
    const tamanho = png.readUInt32BE(16) + 'x' + png.readUInt32BE(20);
    assert.equal(tamanho, icone.sizes);
  }
  assert.deepEqual(manifesto.icons.map(icone => icone.sizes), ['192x192', '512x512', '512x512']);
  assert.ok(manifesto.icons.some(icone => icone.purpose === 'maskable'));
  console.log('OK Manifesto e dimensões dos ícones');

  const origem = 'https://exemplo.test/projeto/';
  const eventos = {};
  const armazenados = new Set();
  const excluidos = [];
  let nomeCache;
  let assumiuControle = false;
  const rede = [];
  let abertaNotificacao,fechadaNotificacao=false;
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL, Request,
    fetch: async pedido => { rede.push(pedido.url); return 'rede'; },
    self: {
      registration: { scope: origem },
      addEventListener: (nome, callback) => { eventos[nome] = callback; },
      clients: { claim: async () => { assumiuControle = true; }, matchAll: async()=>[], openWindow: async url=>{abertaNotificacao=url;} }
    },
    caches: {
      open: async nome => {
        nomeCache = nome;
        return {
          addAll: async pedidos => {
            for (const pedido of pedidos) {
              assert.ok(existsSync('public/' + pedido.url.slice(origem.length)), pedido.url);
              armazenados.add(pedido.url);
            }
          },
          match: async url => armazenados.has(url) ? url : undefined
        };
      },
      keys: async () => [nomeCache, 'oqdpf:' + origem + ':antigo', 'outro-app'],
      delete: async chave => { excluidos.push(chave); }
    }
  });
  const rodar = (nome, extras = {}) => new Promise(resolve => {
    eventos[nome]({ ...extras, waitUntil: resolve });
  });
  await rodar('install');
  for (const arquivo of ['estrutura.js','estrutura.css','acoes-pontos.js','pontos-osm.js', 'pontos-osm-ui.js', 'pontos-osm.css', 'pontos-fixos.json', 'cidade-layout.css', 'aprender.js', 'aprender.css', 'agir.js', 'agir.css', 'inicio.js', 'inicio.css', 'rotas.js', 'design-system.css', 'index.html', 'sobre.html', 'vendor/pdf-lib.min.js', 'guias.js', 'plano-json.js', 'lembretes.js', 'lembretes-ui.js', 'enderecos.js', 'cidade.js', 'cidade-ui.js', 'pontos-modelo.json', 'estimativa.js', 'estimativa-ui.js', 'progresso.js', 'desafio.js', 'desafio-ui.js', 'quiz.js', 'quiz-ui.js', 'acessibilidade.js', 'acessibilidade.css', 'compartilhar.js', 'compartilhar-ui.js', 'ods/17.webp']) {
    assert.ok(armazenados.has(origem + arquivo));
  }
  console.log('OK Instalação inclui arquivos necessários para guias e PDF offline');
  await rodar('activate');
  assert.deepEqual(excluidos, ['oqdpf:' + origem + ':antigo']);
  assert.ok(assumiuControle);
  console.log('OK Ativação preserva caches de outros apps');
  await rodar('notificationclick',{notification:{data:{ecoa:true,url:'https://invalido.test'},close(){fechadaNotificacao=true;}}});
  assert.equal(abertaNotificacao,origem+'#meu-plano');assert.ok(fechadaNotificacao);
  console.log('OK Notificação abre somente o Meu plano no escopo do site');

  function requisitar(url, modo = 'cors', metodo = 'GET') {
    let resposta;
    eventos.fetch({
      request: { url, mode: modo, method: metodo },
      respondWith: promessa => { resposta = promessa; }
    });
    return resposta;
  }
  assert.equal(await requisitar(origem + '?via=atalho', 'navigate'), origem + 'index.html');
  assert.equal(await requisitar(origem + 'ods/6.webp'), origem + 'ods/6.webp');
  assert.equal(await requisitar(origem + 'sobre.html?via=link', 'navigate'), origem + 'sobre.html');
  assert.equal(requisitar(origem + 'api/onu?ods=6'), undefined);
  assert.equal(requisitar('https://brasil.un.org/pt-br/sdgs'), undefined);
  for(const host of ['overpass-api.de','overpass.private.coffee'])for(const method of ['GET','POST'])assert.equal(requisitar('https://'+host+'/api/interpreter','cors',method),undefined);
  assert.equal(requisitar('https://photon.komoot.io/api/?q=rua&lang=pt'), undefined);
  assert.equal(requisitar(origem + 'index.html', 'cors', 'POST'), undefined);
  assert.deepEqual(rede, []);
  armazenados.delete(origem + 'style.css');
  assert.equal(await requisitar(origem + 'style.css'), 'rede');
  assert.deepEqual(rede, [origem + 'style.css']);
  console.log('OK Navegação offline, subpasta, fallback de rede e consulta ONU fora do cache');

  let registrado;
  const executarRegistro = navigator => runInNewContext(readFileSync('public/pwa.js', 'utf8'), {
    navigator, console
  });
  executarRegistro({});
  executarRegistro({ serviceWorker: { register: async url => { registrado = url; } } });
  assert.equal(registrado, './sw.js');
  console.log('OK Registro apenas quando o navegador oferece service worker');
}

validarPwa().catch(erro => {
  console.error(erro);
  process.exitCode = 1;
});

async function validarBackupPlano() {
  const { validarPlanoJson, exportarPlanoJson, mesclarPlanoJson, importarPlanoJson, lerArquivoPlanoJson } = require('./public/plano-json');
  const chaves = acoes.map(a => a.ods + ':' + a.titulo);
  const atual = new Map([[chaves[0], true], [chaves[1], false]]);
  const texto = exportarPlanoJson(atual, acoes);
  assert.deepEqual(validarPlanoJson(texto, acoes), atual);
  assert.deepEqual(validarPlanoJson('\uFEFF' + texto, acoes), atual);
  assert.equal(validarPlanoJson(exportarPlanoJson(new Map(), acoes), acoes).size, 0);
  console.log('OK JSON: ida e volta, acentos, BOM e plano vazio');
  const arquivo = itens => JSON.stringify({ projeto: 'oqdpf', versao: 1, acoes: itens });
  for (const invalido of ['{', 'null', '[]', '{}', JSON.stringify({projeto:'oqdpf',versao:2,acoes:[]}),
    arquivo(null), arquivo([null]), arquivo([{chave:chaves[0],concluida:'false'}]),
    arquivo([{chave:'__proto__',concluida:true}]),
    arquivo([{chave:chaves[0],concluida:false},{chave:chaves[0],concluida:true}]),
    arquivo(Array(acoes.length + 1).fill({chave:chaves[0],concluida:true})), ' '.repeat(102401)]) {
    assert.throws(() => validarPlanoJson(invalido, acoes), Error);
  }
  assert.throws(() => exportarPlanoJson(new Map([['inexistente',false]]), acoes), /catálogo/);
  console.log('OK JSON: sintaxe, formato, versão, tamanho, catálogo, duplicatas e estados inválidos');
  const recebido = new Map([[chaves[0], false], [chaves[1], true], [chaves[2], false]]);
  const combinado = mesclarPlanoJson(atual, recebido);
  assert.deepEqual([...combinado.values()], [true,true,false]);
  assert.equal(atual.size,2);
  assert.equal(atual.get(chaves[1]),false);
  assert.deepEqual(mesclarPlanoJson(combinado, recebido), combinado);
  assert.deepEqual(mesclarPlanoJson(atual, new Map()), atual);
  console.log('OK JSON: união sem perda, sem mutação e importação repetida');
  let salvo;
  const storage = {setItem:(chave,valor) => { assert.equal(chave,'teste'); salvo=valor; }};
  const resultado = importarPlanoJson(exportarPlanoJson(recebido, acoes), acoes, atual, storage, 'teste');
  assert.equal(resultado.novas,1);
  assert.equal(resultado.quantidade,3);
  assert.deepEqual(JSON.parse(salvo),Object.fromEntries(combinado));
  salvo=undefined;
  assert.throws(() => importarPlanoJson('{', acoes, atual, storage, 'teste'));
  assert.equal(salvo,undefined);
  assert.throws(() => importarPlanoJson(texto, acoes, atual, {setItem:()=>{throw Error('quota');}}, 'teste'), /plano atual foi mantido/);
  assert.deepEqual([...atual.values()], [true,false]);
  console.log('OK JSON: persistência antes da atualização e preservação após erro');
  assert.equal(await lerArquivoPlanoJson({name:'PLANO.JSON',size:10,text:async()=>texto}),texto);
  await assert.rejects(lerArquivoPlanoJson({name:'plano.txt',size:10}), /cópia do plano/);
  await assert.rejects(lerArquivoPlanoJson({name:'plano.json',size:102401}), /100 KB/);
  await assert.rejects(lerArquivoPlanoJson({name:'plano.json',size:10,text:async()=>{throw Error();}}), /ler o arquivo/);
  console.log('OK JSON: leitura, extensão, limite e erro de acesso ao arquivo');
}
validarBackupPlano().catch(erro => { console.error(erro); process.exitCode = 1; });

async function validarCompartilhamento() {
  const api = require('./public/compartilhar');
  for (const acao of acoes) {
    const dados = api.dadosCompartilhamento(acao, 'https://exemplo.test/sub/index.html?privado=123#guias');
    const url = new URL(dados.url);
    assert.equal(url.search, '');
    assert.equal(url.pathname, '/sub/index.html');
    assert.equal(api.acaoDoLink(url.hash, acoes), acao);
    assert.ok(dados.text.includes(acao.passos[0]));
    assert.ok(dados.text.includes('Ação sugerida pelo projeto'));
    assert.equal(new URL(api.linkWhatsApp(dados)).searchParams.get('text'), api.textoCompartilhamento(dados));
  }
  for (const hash of ['', '#guias', '#acao=%ZZ', '#acao=999:inexistente', '#acao=%3Cscript%3E']) {
    assert.equal(api.acaoDoLink(hash, acoes), undefined);
  }
  console.log('OK Compartilhar: links para todas as ações, subpasta, texto, WhatsApp e links inválidos');
  const dados = api.dadosCompartilhamento(acoes[0], 'https://exemplo.test/');
  let copiado;
  const navegador = {clipboard:{writeText:async texto=>{copiado=texto;}}};
  assert.equal(await api.copiarCompartilhamento(dados,navegador),'copiado');
  assert.equal(copiado, api.textoCompartilhamento(dados));
  assert.equal(await api.copiarCompartilhamento(dados,{}),'manual');
  assert.equal(await api.copiarCompartilhamento(dados,{clipboard:{writeText:async()=>{throw Error();}}}),'manual');
  assert.equal(await api.compartilharAcao(dados,navegador),'copiado');
  assert.equal(await api.compartilharAcao(dados,{}),'manual');
  assert.equal(await api.compartilharAcao(dados,{...navegador,share:async()=>{throw Error();}}),'copiado');
  copiado = undefined;
  assert.equal(await api.compartilharAcao(dados,{...navegador,share:async()=>{throw {name:'AbortError'};}}),'cancelado');
  assert.equal(copiado,undefined);
  assert.equal(await api.compartilharAcao(dados,{...navegador,share:async recebido=>assert.equal(recebido,dados)}),'compartilhado');
  assert.equal(copiado,undefined);
  console.log('OK Compartilhar: API nativa, cancelamento, cópia e alternativa manual');

  const { readFileSync } = require('node:fs');
  const { runInNewContext } = require('node:vm');
  const elementos = new Map();
  const el = id => {
    if (!elementos.has(id)) elementos.set(id, {textContent:'',hidden:false,value:'',disabled:false,
      addEventListener(){},removeAttribute(nome){delete this[nome];},focus(){this.focado=true;},select(){this.selecionado=true;}});
    return elementos.get(id);
  };
  const contexto = { ...api, acoes, encontradas:[acoes[0]], indice:0,
    location:{href:'https://exemplo.test/',hash:''},navigator:{},
    resultado:{hidden:false},status:el('status'),form:{reset(){}},
    mostrar(){contexto.resultado.hidden=false;},
    document:{querySelector:el,addEventListener(){}},window:{addEventListener(){}} };
  runInNewContext(readFileSync('public/compartilhar-ui.js','utf8'),contexto);
  assert.ok(el('#whatsapp-acao').href.startsWith('https://wa.me/'));
  await contexto.executarCompartilhamento(true);
  assert.equal(el('#copia-manual').hidden,false);
  assert.ok(el('#texto-compartilhar').selecionado);
  assert.equal(el('#copiar-acao').disabled,false);
  contexto.resultado.hidden=true;
  contexto.atualizarCompartilhamento();
  assert.equal(el('#copia-manual').hidden,true);
  assert.equal(el('#texto-compartilhar').value,'');
  contexto.location.hash='#acao=%ZZ';
  contexto.abrirAcaoCompartilhada();
  assert.match(contexto.status.textContent,/não foi encontrada/);
  contexto.location.hash=new URL(api.dadosCompartilhamento(acoes[5],contexto.location.href).url).hash;
  contexto.abrirAcaoCompartilhada();
  assert.equal(contexto.encontradas[0],acoes[5]);
  assert.equal(contexto.indice,0);
  assert.equal(contexto.resultado.hidden,false);
  console.log('OK Compartilhar: interface, cópia manual, limpeza e abertura de ação pelo link (DOM simulado)');
}
validarCompartilhamento().catch(erro => { console.error(erro); process.exitCode = 1; });

function validarAcessibilidade() {
  const a = require('./public/acessibilidade');
  const padrao = {tema:'sistema',fonte:100};
  assert.deepEqual(a.normalizarPreferencias({tema:'invalido',fonte:999}),padrao);
  assert.deepEqual(a.lerPreferencias({getItem:()=>'{'}),padrao);
  assert.deepEqual(a.lerPreferencias(undefined),padrao);
  let salvo;
  assert.equal(a.salvarPreferencias({setItem:(k,v)=>{salvo=v;}},{tema:'escuro',fonte:125}),true);
  assert.deepEqual(a.lerPreferencias({getItem:()=>salvo}),{tema:'escuro',fonte:125});
  assert.equal(a.salvarPreferencias(undefined,padrao),false);
  assert.equal(a.temaEfetivo('sistema',true),'escuro');
  assert.equal(a.temaEfetivo('sistema',false),'claro');
  assert.equal(a.temaEfetivo('claro',true),'claro');
  assert.equal(a.temaEfetivo('escuro',false),'escuro');
  assert.equal(a.proximoTema('sistema',true),'claro');
  assert.equal(a.proximoTema('sistema',false),'escuro');
  assert.equal(a.proximoTema('claro',true),'escuro');
  assert.equal(a.proximoTema('escuro',false),'claro');
  assert.equal(a.alterarFonte(100,-1),100);
  assert.equal(a.alterarFonte(150,1),150);
  assert.equal(a.alterarFonte(100,1),112.5);
  assert.equal(a.alterarFonte(125,-1),112.5);
  const raiz = {dataset:{},style:{}};
  a.aplicarPreferencias(raiz,{tema:'sistema',fonte:125},true);
  assert.equal(raiz.dataset.tema,'escuro');
  assert.equal(raiz.style.fontSize,'125%');
  console.log('OK Acessibilidade: preferências, persistência, falhas, tema do sistema e limites de fonte');
  const elementos = new Map();
  const el = id => {
    if (!elementos.has(id)) elementos.set(id, {value:'',textContent:'',disabled:false,selectedIndex:0,
      options:[{text:'Seguir o sistema'}],eventos:{},setAttribute(nome,valor){this[nome]=valor;},addEventListener(nome,cb){this.eventos[nome]=cb;}});
    return elementos.get(id);
  };
  let pronto, mudou;
  const sistema = {matches:true,addEventListener:(nome,cb)=>{mudou=cb;}};
  a.iniciarAcessibilidade({matchMedia:()=>sistema,localStorage:{getItem:()=>null,setItem(){}}},
    {documentElement:raiz,querySelector:el,addEventListener:(nome,cb)=>{pronto=cb;}});
  pronto();
  assert.equal(raiz.dataset.tema,'escuro');
  assert.equal(el('#alternar-tema')['aria-pressed'],'true');
  el('#alternar-tema').eventos.click();
  assert.equal(raiz.dataset.tema,'claro');
  assert.equal(el('#alternar-tema')['aria-pressed'],'false');
  el('#alternar-tema').eventos.click();
  assert.equal(raiz.dataset.tema,'escuro');
  el('#aumentar-fonte').eventos.click();
  assert.equal(raiz.style.fontSize,'112.5%');
  el('#reduzir-fonte').eventos.click();
  assert.equal(raiz.style.fontSize,'100%');
  assert.equal(el('#reduzir-fonte').disabled,true);
  el('#preferencia-tema').value='claro';
  el('#preferencia-tema').eventos.change();
  mudou();
  assert.equal(raiz.dataset.tema,'claro');
  el('#restaurar-leitura').eventos.click();
  assert.equal(raiz.dataset.tema,'escuro');
  sistema.matches=false;
  mudou();
  assert.equal(raiz.dataset.tema,'claro');
  console.log('OK Acessibilidade: controles, restauração e mudança de preferência do sistema (DOM simulado)');

  const {readFileSync} = require('node:fs');
  const css = readFileSync('public/design-system.css','utf8');
  const variaveis = bloco => Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(m=>[m[1],m[2]]));
  const claroTokens = variaveis(css.match(/:root\s*\{([^}]+)/)[1]);
  const escuroTokens = {...claroTokens,...variaveis(css.match(/:root\[data-tema="escuro"\]\s*\{([^}]+)/)[1])};
  const aliases={text:'text',muted:'text-muted',green:'primary',paper:'bg',surface:'surface',soft:'surface-soft',field:'surface',tag:'surface-soft',button:'primary','button-text':'on-primary',control:'border',focus:'focus'};
  const traduzir=t=>Object.fromEntries(Object.entries(aliases).map(([a,b])=>[a,t['color-'+b]]));
  const claro=traduzir(claroTokens),escuro=traduzir(escuroTokens);
  const luminancia = hex => {
    const c = hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return c[0]*.2126+c[1]*.7152+c[2]*.0722;
  };
  const contraste = (frente,fundo) => {
    const x=luminancia(frente), y=luminancia(fundo);
    return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  };
  let minimo=Infinity;
  for (const paleta of [claro,escuro]) {
    for (const texto of ['text','muted','green']) for (const fundo of ['paper','surface','soft','field','tag']) {
      const valor=contraste(paleta[texto],paleta[fundo]);
      assert.ok(valor>=4.5,`${texto}/${fundo}: ${valor}`);
      minimo=Math.min(minimo,valor);
    }
    assert.ok(contraste(paleta['button-text'],paleta.button)>=4.5);
    for (const fundo of ['surface','soft','field']) {
      assert.ok(contraste(paleta.control,paleta[fundo])>=3);
      assert.ok(contraste(paleta.focus,paleta[fundo])>=3);
    }
  }
  const relatorio=[];
  for(const [tema,tokens] of [['claro',claroTokens],['escuro',escuroTokens]]) {
    for(const estado of ['success','error','warning','info','accent','disabled']){
      const valor=contraste(tokens['color-'+estado],tokens['color-'+estado+'-bg']);
      assert.ok(valor>=4.5,tema+' '+estado+': '+valor);relatorio.push(tema+' '+estado+' '+valor.toFixed(2)+':1');
      minimo=Math.min(minimo,valor);
    }
  }
  assert.match(css,/font-variant-numeric: lining-nums/);
  assert.match(css,/--color-overlay:/);
  assert.match(css,/env\(safe-area-inset-bottom/);
  console.log(`OK Contraste real dos tokens: texto >= 4,5:1 (mínimo ${minimo.toFixed(2)}:1), bordas/foco >= 3:1`);
  console.log('OK Feedback: '+relatorio.join('; '));
}
validarAcessibilidade();

function validarFocoProgramatico() {
  const a=require('./public/acessibilidade'),fs=require('node:fs'),eventos={};
  const sensor=a.iniciarSensorFoco({},{addEventListener(nome,fn){eventos[nome]=fn;}});
  const criar=(interativo,tabindex)=>({
    attrs:tabindex===undefined?{}:{tabindex},
    matches(seletor){return interativo && String(seletor).includes('button');},
    getAttribute(nome){return nome in this.attrs?this.attrs[nome]:null;},
    setAttribute(nome,valor){this.attrs[nome]=String(valor);},
    removeAttribute(nome){delete this.attrs[nome];}
  });
  const titulo=criar(false,'-1'),botao=criar(true),janela={};
  assert.equal(sensor.modo,'inicial');assert.equal(sensor.semTeclado(),true);
  assert.equal(a.iniciarSensorFoco(janela,{addEventListener(){}}),janela.EcoaFoco);
  eventos.focusin({target:titulo});assert.equal(titulo.attrs['data-foco-programatico'],'true');
  eventos.focusin({target:botao});assert.equal(botao.attrs['data-foco-programatico'],undefined);
  eventos.pointerdown();assert.equal(sensor.semTeclado(),true);
  eventos.focusin({target:titulo});assert.equal(titulo.attrs['data-foco-programatico'],'true');
  eventos.keydown();assert.equal(sensor.semTeclado(),false);
  eventos.focusin({target:titulo});assert.equal(titulo.attrs['data-foco-programatico'],undefined);
  eventos.focusin({target:botao});assert.equal(botao.attrs['data-foco-programatico'],undefined);
  assert.match(fs.readFileSync('public/limpeza.css','utf8'),/\[data-foco-programatico="true"\]:focus\{outline:none!important\}/);
  assert.match(fs.readFileSync('public/rotas.js','utf8'),/semTeclado\?\.\(\) \?\? true/);
  console.log('OK Foco: primeiro carregamento e ponteiro sem moldura em alvos programáticos; teclado e controles preservados');
}
validarFocoProgramatico();

function validarCartaoPonto() {
  const osm=require('./public/pontos-osm');
  const criar=tag=>({tag,children:[],textContent:'',className:'',
    append(...filhos){this.children.push(...filhos);},
    prepend(filho){this.children.unshift(filho);},
    querySelector(seletor){const classe=seletor.replace('.','');return this.children.find(filho=>String(filho.className).split(' ').includes(classe))||null;}});
  const ponto={id:'teste',nome:'Local de teste',categoria:'agua',origem:'osm',latitude:-24,longitude:-48,
    endereco:'Rua de teste',cidade:'Capão Bonito',UF:'SP',fonte:'https://example.org/fonte'};
  const cartao=criar('li');osm.preencherCartaoPonto({createElement:criar},cartao,ponto);
  const acoes=cartao.querySelector('.ponto-botoes');
  assert.ok(acoes,'cartão deve ter uma única barra de ações');
  const rotulos=acoes.children.map(filho=>filho.textContent);
  assert.equal(rotulos.filter(texto=>texto==='Como chegar').length,1);
  assert.equal(cartao.children.filter(filho=>filho.textContent==='Como chegar').length,0);
  const textos=cartao.children.map(filho=>filho.textContent);
  assert.equal(textos.filter(texto=>texto.includes('Fonte: OpenStreetMap')).length,1);
  assert.equal(textos.filter(texto=>texto.includes('Origem:')).length,0);
  assert.ok(textos.includes('Confirme as informações antes de ir.'));
  assert.equal(rotulos.filter(texto=>texto==='Como chegar').length,1);
  const chegar=acoes.children.find(filho=>filho.textContent==='Como chegar');
  assert.match(chegar.href,/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
  assert.equal(chegar.target,'_blank');assert.equal(chegar.rel,'noopener noreferrer');
  const rota=osm.montarLinkRotaOSM({latitude:-24.0798253,longitude:-48.3835514});
  const url=new URL(rota);
  assert.equal(url.origin,'https://www.google.com');
  assert.equal(url.pathname,'/maps/dir/');
  assert.equal(url.searchParams.get('api'),'1');
  assert.equal(url.searchParams.get('destination'),'-24.0798253,-48.3835514');
  assert.equal(url.searchParams.has('origin'),false);
  assert.equal(url.searchParams.has('travelmode'),false);
  assert.equal(osm.montarLinkRotaOSM({latitude:0,longitude:0}),'https://www.google.com/maps/dir/?api=1&destination=0%2C0');
  assert.equal(osm.montarLinkRotaOSM({latitude:'0',longitude:'0'}),'https://www.google.com/maps/dir/?api=1&destination=0%2C0');
  for(const invalido of [{},{latitude:undefined,longitude:1},{latitude:null,longitude:1},{latitude:NaN,longitude:1},
    {latitude:'undefined',longitude:'1'},{latitude:'abc',longitude:'1'},{latitude:91,longitude:1},{latitude:1,longitude:181}]){
    assert.equal(osm.montarLinkRotaOSM(invalido),null);
  }
  assert.match(osm.montarLinkRotaOSM({endereco:'Rua das Flores',cidade:'Sorocaba',UF:'SP'}),/destination=Rua\+das\+Flores/);
  assert.equal(osm.montarLinkRotaOSM({endereco:'Praça'}),null);
  assert.equal(osm.montarLinkRotaOSM({cidade:'Sorocaba',UF:'SP'}),null);
  assert.doesNotMatch(require('node:fs').readFileSync('public/pontos-osm.js','utf8'),/geolocation/);
  console.log('OK Cartão do mapa: uma ação “Como chegar”, rota Google Maps validada e fontes consolidadas');
}
validarCartaoPonto();

function validarCartoesGuias() {
  const {runInNewContext} = require('node:vm');
  const {readFileSync} = require('node:fs');
  const elemento = () => ({dataset:{},children:[],eventos:{},value:'',
    setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},append(...itens){this.children.push(...itens);},
    replaceChildren(...itens){this.children=itens;},addEventListener(k,v){this.eventos[k]=v;},
    focus(){this.focado=true;},add(opcao){if (!this.value) this.value=opcao.value;}});
  const elementos = new Map();
  const el = id => { if (!elementos.has(id)) elementos.set(id,elemento()); return elementos.get(id); };
  el('#modelo-guia').content={cloneNode:()=>({querySelector:el})};
  const doc={querySelector:el,createElement:elemento,querySelectorAll:()=>el('#cartoes-guias').children};
  let buscou=false;
  const ctx={document:doc,objetivos,Option:function(text,value){this.value=value;},
    detalhesOds:objetivos.map(()=>['meta1','meta2','exemplo']),descricoes:objetivos,historiasOds:objetivos,
    form:{reset(){}},opcoes:{querySelector:el},atualizarSelecao(){},buscar(){buscou=true;}};
  runInNewContext(readFileSync('public/guias.js','utf8'),ctx);
  const cartoes=el('#cartoes-guias').children;
  assert.equal(cartoes.length,17);
  assert.equal(cartoes[0]['aria-current'],'page');
  cartoes[5].eventos.click();
  assert.equal(el('#seletor-guia').value,6);
  assert.equal(cartoes[5]['aria-current'],'page');
  assert.equal(cartoes[0]['aria-current'],undefined);
  assert.equal(el('#guia-nome').focado,true);
  assert.equal(el('img').src,'ods/6.webp');
  el('#buscar-guia').eventos.click();
  assert.equal(buscou,true);
  assert.equal(el('input[value="6"]').checked,true);
  console.log('OK Guias: 17 cartões, seleção única, foco no conteúdo e busca do ODS escolhido');
}
validarCartoesGuias();

function validarIsolamentoTema() {
  const {iniciarAgir}=require('./public/agir');
  const elemento=(dataset={})=>({dataset,eventos:{},attrs:{},value:'',hidden:true,
    addEventListener(n,fn){this.eventos[n]=fn;},setAttribute(n,v){this.attrs[n]=v;}});
  const els=new Map(),el=id=>{if(!els.has(id))els.set(id,elemento());return els.get(id);};
  const form=el('#filtros'),campos=form.elements={tempo:elemento(),unidade:elemento(),custo:elemento(),local:elemento()};
  campos.unidade.value='min';
  const tempo=elemento({tempo:'15'}),hora=elemento({tempo:'1',unidade:'h'}),assunto=elemento({assunto:'6,14'}),raiz=elemento({tema:'claro'});
  const ods=['1','6','14'].map(value=>({value,checked:value==='1'}));
  form.querySelectorAll=s=>s==='button[data-tempo]'?[tempo,hora]:s==='button[data-assunto]'?[assunto]:s==='input[name="ods"]'?ods:[];
  let valido=true,buscas=0,atualizacoes=0;const fila=[];
  form.reportValidity=()=>valido;
  form.reset=()=>{form.eventos.reset();Object.values(campos).forEach(c=>c.value='');campos.unidade.value='min';ods.forEach(c=>c.checked=false);};
  const ui=iniciarAgir({querySelector:el},()=>buscas++,()=>atualizacoes++,{queueMicrotask:fn=>fila.push(fn)});
  raiz.eventos.click?.();assert.equal(buscas,0);
  tempo.eventos.click();el('#so-gratis').eventos.click();el('#agir-na-rua').eventos.click();assunto.eventos.click();
  assert.equal(campos.tempo.value,'15');assert.equal(campos.custo.value,'0');assert.equal(campos.local.value,'Na rua');
  assert.deepEqual(ods.map(c=>c.checked),[true,true,true]);assert.equal(buscas,4);
  assert.equal(assunto.attrs['aria-pressed'],'true');
  assunto.eventos.click();assert.deepEqual(ods.map(c=>c.checked),[true,false,false]);
  assert.equal(el('#agir-filtros-resumo').textContent,'1 objetivo selecionado');
  hora.eventos.click();assert.equal(campos.unidade.value,'h');assert.equal(campos.tempo.value,'1');
  campos.tempo.value='60';campos.unidade.value='min';form.eventos.input();assert.equal(hora.attrs['aria-pressed'],'true');
  hora.eventos.click();assert.equal(campos.tempo.value,'');
  el('#so-gratis').eventos.click();assert.equal(campos.custo.value,'');assert.equal(campos.local.value,'Na rua');
  const antes=buscas;valido=false;tempo.eventos.click();assert.equal(buscas,antes);valido=true;
  ui.resultado(true);assert.equal(el('#agir-vazio').hidden,false);
  el('#agir-recomecar').eventos.click();fila.forEach(fn=>fn());assert.equal(buscas,antes+1);
  assert.equal(el('#agir-vazio').hidden,true);assert.equal(el('#agir-filtros-resumo').textContent,'Todos os 17 objetivos');
  assert.equal(el('#so-gratis').attrs['aria-pressed'],'false');assert.ok(atualizacoes>0);
  console.log('OK Agir: filtros combinados, tema isolado, alternância, horas, edição manual, validação e recuperação vazia');
}
validarIsolamentoTema();

function validarQuiz() {
  const {perguntasQuiz,calcularResultadoQuiz} = require('./public/quiz');
  const {iniciarQuiz} = require('./public/quiz-ui');
  assert.equal(perguntasQuiz.length,5);
  perguntasQuiz.forEach(p=>p.opcoes.forEach(o=>o.ods.forEach(ods=>assert.ok(Number.isInteger(ods)&&ods>=1&&ods<=17))));
  for (const entrada of [null,[],[0,0,0,0],[0,0,0,0,5],[0,0,0,0,-1],[0,0,0,0,1.5],['0',0,0,0,0]]) assert.throws(()=>calcularResultadoQuiz(entrada));
  const vistos=new Set();
  for (let n=0;n<3125;n++) {
    let numero=n;
    const respostas=Array.from({length:5},()=>{const r=numero%5;numero=Math.floor(numero/5);return r;});
    const esperado=Array(17).fill(0);
    respostas.forEach((r,i)=>perguntasQuiz[i].opcoes[r].ods.forEach(ods=>esperado[ods-1]++));
    const ordem=esperado.map((p,i)=>({ods:i+1,pontos:p})).sort((a,b)=>b.pontos-a.pontos||a.ods-b.ods).slice(0,2);
    const resultado=calcularResultadoQuiz(respostas);
    assert.deepEqual(resultado.map(({ods,pontos})=>({ods,pontos})),ordem);
    resultado.forEach(r=>{vistos.add(r.ods);assert.equal(r.afinidades.length,r.pontos);assert.ok(filtrarAcoes(acoes,{ods:r.ods}).length);});
  }
  assert.equal(vistos.size,17,'Todos os ODS devem poder aparecer no resultado');
  console.log('OK Quiz: 3.125 combinações, pontuação, desempate, entradas inválidas e cobertura dos 17 ODS');

  const elemento = () => ({children:[],eventos:{},hidden:false,disabled:false,textContent:'',checked:false,
    addEventListener(k,v){this.eventos[k]=v;},append(...v){this.children.push(...v);},
    replaceChildren(...v){this.children=v;},focus(){this.focado=true;},querySelector(){return this.children[0].children[0];}});
  const elementos=new Map();
  const el=id=>{if(!elementos.has(id))elementos.set(id,elemento());return elementos.get(id);};
  let guia,tema;
  iniciarQuiz({querySelector:el,createElement:elemento},perguntasQuiz,calcularResultadoQuiz,objetivos,ods=>{guia=ods;},ods=>{tema=ods;});
  const enviar=()=>el('#quiz-form').eventos.submit({preventDefault(){}});
  el('#quiz-comecar').eventos.click();
  assert.equal(el('#quiz-opcoes').children.length,5);
  enviar();
  assert.match(el('#quiz-erro').textContent,/Escolha/);
  assert.equal(el('#quiz-opcoes').querySelector().focado,true);
  el('#quiz-opcoes').children[1].children[0].eventos.change();
  enviar();
  el('#quiz-voltar').eventos.click();
  assert.equal(el('#quiz-opcoes').children[1].children[0].checked,true);
  for(let i=0;i<5;i++) {
    el('#quiz-opcoes').children[0].children[0].eventos.change();
    enviar();
  }
  assert.equal(el('#quiz-form').hidden,true);
  assert.equal(el('#quiz-resultado').hidden,false);
  assert.equal(el('#quiz-resultado-titulo').focado,true);
  const cards=el('#quiz-cartoes').children;
  assert.equal(cards.length,2);
  cards[0].children[2].children[0].eventos.click();
  cards[0].children[2].children[1].eventos.click();
  assert.equal(guia,calcularResultadoQuiz([0,0,0,0,0])[0].ods);
  assert.equal(tema,guia);
  el('#quiz-refazer').eventos.click();
  assert.equal(el('#quiz-resultado').hidden,true);
  assert.equal(el('#quiz-voltar').disabled,true);
  assert.ok(el('#quiz-opcoes').children.every(c=>!c.children[0].checked));
  console.log('OK Quiz: início, validação, voltar, respostas preservadas, resultado, atalhos e reinício (DOM simulado)');
}
validarQuiz();

function validarMarcaEcoa() {
  const {readFileSync}=require('node:fs');
  const {runInNewContext}=require('node:vm');
  const html=readFileSync('public/index.html','utf8');
  const manifesto=require('./public/manifest.json');
  assert.equal(manifesto.name,'Ecoa');assert.equal(manifesto.short_name,'Ecoa');assert.equal(manifesto.id,'./');
  assert.ok(html.includes('<title>Ecoa</title>'));
  assert.ok(html.includes('Pequenas ações,'));assert.ok(html.includes('Com o tempo e o dinheiro que tenho hoje, o que posso fazer?'));
  assert.ok(html.includes('og:title'));assert.ok(html.includes('não oficial da ONU'));
  const legado = new Map([[acoes[0].ods+':'+acoes[0].titulo,true]]);
  const json=require('./public/plano-json');
  const backup=JSON.stringify({projeto:'oqdpf',versao:1,acoes:[...legado].map(([chave,concluida])=>({chave,concluida}))});
  assert.deepEqual(json.validarPlanoJson(backup,acoes),legado);
  const elementos=new Map();const el=id=>{if(!elementos.has(id))elementos.set(id,{addEventListener(){},replaceChildren(){},append(){},setAttribute(){}});return elementos.get(id);};
  let leu,escreveu=false;
  const contexto={atualizarProgressoPlano(){},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el(Symbol())},
    localStorage:{getItem:k=>{leu=leu||k;return k==='ecoa:acoes-pontos-v1'?'{}':JSON.stringify(Object.fromEntries(legado));},setItem:()=>{escreveu=true;}},acoes,encontradas:[],indice:0};
  runInNewContext(readFileSync('public/plano.js','utf8'),contexto);
  assert.equal(leu,'oqdpf-plano-v1');assert.equal(escreveu,false);
  assert.equal(runInNewContext('plano.size',contexto),1);
  assert.equal(runInNewContext('[...plano.values()][0]',contexto),true);
  assert.ok(readFileSync('public/acessibilidade.js','utf8').includes("'oqdpf-acessibilidade-v1'"));
  console.log('OK Ecoa: título, manifesto, marca independente e preservação de plano/preferências/JSON antigos sem migração');
}
validarMarcaEcoa();

function validarDesafioSeteDias() {
  const d=require('./public/desafio');
  const {readFileSync}=require('node:fs');const {runInNewContext}=require('node:vm');
  assert.equal(d.dataLocalDesafio(new Date(2026,10,11,23,59)),'2026-11-11');
  assert.equal(d.numeroDiaDesafio('2024-03-01')-d.numeroDiaDesafio('2024-02-28'),2);
  assert.equal(d.numeroDiaDesafio('2026-01-01')-d.numeroDiaDesafio('2025-12-31'),1);
  for(const x of ['2026-02-30','2026-13-01','texto',null])assert.throws(()=>d.numeroDiaDesafio(x));
  for(const ods of [0,18,1.5,'1'])assert.throws(()=>d.novoDesafio(ods,'2026-11-11'));
  const original=d.novoDesafio(6,'2026-11-11');
  assert.equal(d.estadoDesafio(original,'2026-11-11').dia,0);
  assert.throws(()=>d.concluirDiaDesafio(original,'2026-11-10',true));
  assert.throws(()=>d.concluirDiaDesafio(original,'2026-11-18',true));
  let atual=d.concluirDiaDesafio(original,'2026-11-11',true);
  assert.equal(original.dias[0],false);
  assert.equal(d.estadoDesafio(atual,'2026-11-12').sequencia,1);
  assert.equal(d.estadoDesafio(atual,'2026-11-13').sequencia,0);
  for(let i=1;i<7;i++)atual=d.concluirDiaDesafio(atual,`2026-11-${11+i}`,true);
  assert.equal(d.estadoDesafio(atual,'2026-11-17').sequencia,7);
  assert.equal(d.estadoDesafio(atual,'2026-11-18').encerrado,true);
  assert.equal(d.estadoDesafio(atual,'2026-11-19').sequencia,0);
  assert.equal(d.estadoDesafio(d.concluirDiaDesafio(atual,'2026-11-17',false),'2026-11-17').sequencia,6);
  let salvo;d.salvarDesafio({setItem:(k,v)=>{assert.equal(k,'ecoa-desafio-v1');salvo=v;}},atual);
  assert.deepEqual(d.validarDesafio(JSON.parse(salvo)),atual);
  assert.throws(()=>d.salvarDesafio({setItem(){throw Error();}},atual),/progresso anterior/);
  assert.throws(()=>d.validarDesafio({...original,dias:[true]}));
  const praticas=objetivos.map(nome=>[nome,'Primeiro passo','Segundo passo','Indicador']);
  for(let ods=1;ods<=17;ods++) {
    const roteiro=d.roteiroDesafio(ods,acoes,praticas);
    assert.equal(roteiro.length,7);assert.ok(roteiro.every(r=>r.titulo&&r.passos.length===2));
  }
  assert.throws(()=>d.roteiroDesafio(18,acoes,praticas));
  console.log('OK Desafio: datas locais, ano bissexto, calendário, sequência, desfazer, fim, validação e persistência');
  const elemento=()=>({children:[],eventos:{},value:'1',hidden:true,dataset:{},
    addEventListener(k,v){this.eventos[k]=v;},add(){},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},focus(){this.focado=true;}});
  const elementos=new Map();const el=id=>{if(!elementos.has(id))elementos.set(id,elemento());return elementos.get(id);};
  let escritas=0,buscou=false;
  const ctx={...d,document:{querySelector:el,createElement:elemento,addEventListener(){}},objetivos,acoes,praticasOds:praticas,
    Option:function(){},localStorage:{getItem:()=>null,setItem(){escritas++;}},setInterval(){},
    form:{reset(){}},opcoes:{querySelector:el},atualizarSelecao(){},buscar(){buscou=true;}};
  runInNewContext(readFileSync('public/desafio-ui.js','utf8'),ctx);
  el('#desafio-iniciar').eventos.click();
  assert.equal(escritas,1);assert.equal(el('#desafio-dias').children.length,7);
  const caixa=el('#desafio-dias').children[0].children[3].children[0];caixa.checked=true;caixa.eventos.change();
  assert.equal(escritas,2);assert.ok(el('#desafio-resumo').textContent.includes('1 de 7'));
  el('#desafio-iniciar').eventos.click();assert.equal(escritas,2);assert.equal(el('#desafio-confirmar').hidden,false);
  el('#desafio-cancelar').eventos.click();assert.equal(escritas,2);
  el('#desafio-iniciar').eventos.click();el('#desafio-substituir').eventos.click();assert.equal(escritas,3);
  el('#desafio-acoes').eventos.click();assert.equal(buscou,true);
  console.log('OK Desafio: início, checklist, confirmação de substituição, cancelar e busca (DOM simulado)');
}
validarDesafioSeteDias();

async function validarProgresso() {
  const {calcularProgressoPlano,renderizarProgressoPlano}=require('./public/progresso');
  const chave=a=>a.ods+':'+a.titulo;
  const vazio=calcularProgressoPlano(new Map(),acoes);
  assert.equal(vazio.salvas,0);assert.equal(vazio.concluidas,0);assert.equal(vazio.pendentes,0);
  assert.ok(vazio.selos.every(s=>!s.conquistado));
  const cinco=new Map(acoes.slice(0,5).map(a=>[chave(a),true]));
  let dados=calcularProgressoPlano(cinco,acoes);
  assert.equal(dados.objetivosAtendidos,5);assert.deepEqual(dados.selos.map(s=>s.conquistado),[true,true,true,false]);
  cinco.set(chave(acoes[0]),false);
  dados=calcularProgressoPlano(cinco,acoes);assert.equal(dados.pendentes,1);assert.equal(dados.objetivosAtendidos,4);assert.equal(dados.selos[2].conquistado,false);
  cinco.delete(chave(acoes[1]));assert.equal(calcularProgressoPlano(cinco,acoes).salvas,4);
  const completo=new Map(acoes.map(a=>[chave(a),true]));
  dados=calcularProgressoPlano(completo,acoes);assert.equal(dados.concluidas,20);assert.equal(dados.objetivosAtendidos,17);assert.ok(dados.selos.every(s=>s.conquistado));
  assert.equal(dados.porOds[11].concluidas,3);
  const invalidos=new Map([['desconhecida',true],[chave(acoes[0]),'true']]);assert.equal(calcularProgressoPlano(invalidos,acoes).salvas,0);
  assert.equal(calcularProgressoPlano(completo,[...acoes,acoes[0]]).concluidas,20);
  console.log('OK Progresso: totais, ODS únicos, duplicatas, estados inválidos e limites dos quatro selos');

  const {runInNewContext}=require('node:vm');const {readFileSync}=require('node:fs');
  const elemento=()=>({children:[],eventos:{},style:{},dataset:{},value:'',hidden:false,
    addEventListener(k,v){this.eventos[k]=v;},setAttribute(k,v){this[k]=v;},
    append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},focus(){this.focado=true;}});
  const elementos=new Map();const el=id=>{if(!elementos.has(id))elementos.set(id,elemento());return elementos.get(id);};
  const doc={querySelector:el,createElement:elemento,querySelectorAll:()=>[],addEventListener(){}};
  renderizarProgressoPlano(doc,vazio,objetivos);
  assert.equal(el('#progresso-vazio').hidden,false);assert.equal(el('#progresso-grafico').children.length,0);
  for(const selo of el('#progresso-selos').children){
    assert.equal(selo.children[4].value,'0');
    assert.match(selo.children[0].children[0].innerHTML,/<rect/);
    assert.equal(selo.children[4]['aria-label'],selo.children[1].textContent);
  }
  renderizarProgressoPlano(doc,dados,objetivos);
  for(const selo of el('#progresso-selos').children){
    assert.equal(selo.children[4].value,selo.children[4].max);
    assert.doesNotMatch(selo.children[0].children[0].innerHTML,/<rect/);
  }
  renderizarProgressoPlano(doc,calcularProgressoPlano(new Map([[chave(acoes[0]),true]]),acoes),objetivos);
  assert.equal(el('#progresso-selos').children[1].children[4].value,'1');
  assert.equal(el('#progresso-selos').children[1].children[4].max,'5');
  assert.match(el('#progresso-grafico').children[0].children[1].textContent,/1 de 1 ação concluída/);
  assert.equal(el('#progresso-grafico').children[0].children[0].children[0].src,'ods/1.webp');
  renderizarProgressoPlano(doc,vazio,objetivos);
  assert.equal(el('#progresso-selos').children[1].children[4].value,'0');
  renderizarProgressoPlano(doc,dados,objetivos);
  console.log('OK Fase C: cadeados, progresso zero/parcial/completo/recalculado, rótulos, ícones ODS e singular');
  assert.equal(el('#progresso-vazio').hidden,true);assert.equal(el('#progresso-grafico').children.length,17);
  assert.equal(el('#progresso-grafico').children[11].children[2].children[0].style.width,'100%');
  assert.equal(el('#progresso-selos').children.length,4);
  let salvo;
  const ctx={document:doc,acoes,objetivos,encontradas:[acoes[0]],indice:0,
    localStorage:{getItem:()=>null,setItem:(k,v)=>{salvo=v;}},
    ...require('./public/plano-json')};
  runInNewContext(readFileSync('public/progresso.js','utf8')+'\n'+readFileSync('public/plano.js','utf8'),ctx);
  assert.equal(el('#baixar-plano').disabled,true);assert.equal(el('#baixar-plano').hidden,true);assert.equal(el('#plano-vazio').hidden,false);assert.match(el('#plano-pdf-ajuda').textContent,/Salve uma ação/);
  el('#salvar-acao').eventos.click();assert.equal(el('#plano-vazio').hidden,true);assert.equal(el('#progresso-pendentes').textContent,'1');assert.equal(el('#baixar-plano').disabled,false);assert.equal(el('#baixar-plano').hidden,false);assert.match(el('#plano-pdf-ajuda').textContent,/Baixe um PDF/);
  const caixa=el('#plano-lista').children[0].children[0].children[0];caixa.checked=true;caixa.eventos.change();
  assert.equal(el('#progresso-concluidas').textContent,'1');assert.equal(el('#progresso-ods').textContent,'1');
  caixa.checked=false;caixa.eventos.change();assert.equal(el('#progresso-concluidas').textContent,'0');
  el('#plano-lista').children[0].children[1].eventos.click();assert.equal(el('#progresso-pendentes').textContent,'0');
  assert.equal(el('#baixar-plano').disabled,true);assert.equal(el('#baixar-plano').hidden,true);assert.equal(el('#plano-vazio').hidden,false);assert.match(el('#plano-pdf-ajuda').textContent,/Salve uma ação/);
  const backup=require('./public/plano-json').exportarPlanoJson(completo,acoes);
  el('#arquivo-plano').files=[{name:'ecoa.json',size:backup.length,text:async()=>backup}];
  await el('#arquivo-plano').eventos.change();
  assert.equal(el('#progresso-concluidas').textContent,'20');assert.equal(el('#progresso-ods').textContent,'17');
  assert.equal(Object.keys(JSON.parse(salvo)).length,20);
  console.log('OK Progresso: renderização e integração com salvar, concluir, desmarcar, remover e importar JSON');
}
validarProgresso().catch(erro=>{console.error(erro);process.exitCode=1;});

function validarEstimativas() {
  const e=require('./public/estimativa');
  assert.equal(e.calcularEstimativa('agua',{quantidade:1,dias:30}).valor,1380);
  assert.equal(e.calcularEstimativa('agua',{quantidade:2,dias:0}).valor,0);
  assert.equal(e.calcularEstimativa('energia',{potencia:10,quantidade:2,horas:3,dias:30}).valor,1.8);
  assert.equal(e.calcularEstimativa('energia',{potencia:'9,5',quantidade:'1',horas:'0,5',dias:'1'}).valor,.00475);
  assert.equal(e.calcularEstimativa('energia',{potencia:10,quantidade:1,horas:0,dias:1}).valor,0);
  assert.throws(()=>e.calcularEstimativa('__proto__',{}));
  assert.throws(()=>e.calcularEstimativa('outra',{}));
  for(const tipo of Object.keys(e.modelosEstimativa)) {
    const modelo=e.modelosEstimativa[tipo];
    assert.ok(acoes.some(a=>a.ods===modelo.ods&&(!modelo.acao||a.titulo===modelo.acao)));
    if(modelo.url) assert.equal(new URL(modelo.url).protocol,'https:');
    else assert.equal(modelo.registro,true);
    for(const campo of modelo.campos) {
      assert.equal(e.numeroEstimativa(String(campo.min),campo),campo.min);
      assert.equal(e.numeroEstimativa(campo.max,campo),campo.max);
      for(const valor of ['', ' ',null,undefined,true,NaN,Infinity,-1,campo.max+1,'abc']) assert.throws(()=>e.numeroEstimativa(valor,campo));
      if(campo.inteiro)assert.throws(()=>e.numeroEstimativa(1.5,campo));
    }
  }
  assert.match(e.formatarEstimativa(e.calcularEstimativa('agua',{quantidade:1,dias:1})),/até 46 L/);
  assert.match(e.formatarEstimativa(e.calcularEstimativa('energia',{potencia:10,quantidade:2,horas:3,dias:30})),/1,8 kWh/);
  assert.equal(e.calcularEstimativa('banho',{antes:10,depois:5,banhos:7}).valor,350);
  assert.equal(e.calcularEstimativa('banho',{antes:5,depois:5,banhos:7}).valor,0);
  assert.throws(()=>e.calcularEstimativa('banho',{antes:5,depois:10,banhos:1}),/nova duração/);
  assert.equal(e.calcularEstimativa('aparelhos',{potencia:100,quantidade:2,horas:2,dias:30}).valor,12);
  assert.equal(e.calcularEstimativa('alimentos',{gramas:1250}).valor,1.25);
  assert.equal(e.calcularEstimativa('oleo',{mililitros:2500}).valor,2.5);
  for(const [tipo,campo] of [['alimentos','gramas'],['oleo','mililitros']]) {
    assert.equal(e.calcularEstimativa(tipo,{[campo]:0}).valor,0);
    assert.equal(e.calcularEstimativa(tipo,{[campo]:'0,5'}).valor,.0005);
    assert.match(e.formatarEstimativa(e.calcularEstimativa(tipo,{[campo]:1500})),/Quantidade informada: 1,5/);
  }
  assert.match(e.formatarEstimativa(e.calcularEstimativa('banho',{antes:10,depois:5,banhos:7})),/350 L/);
  console.log('OK Estimativas: fórmulas, unidades, zero, decimais, limites, erros e fontes por ação');
  const {iniciarEstimativa}=require('./public/estimativa-ui');
  const elementos=new Map();
  const elemento=()=>({children:[],eventos:{},value:'',textContent:'',
    setAttribute(){},addEventListener(k,v){this.eventos[k]=v;},append(...v){this.children.push(...v);v.forEach(x=>{if(x.id)elementos.set('#'+x.id,x);});},
    replaceChildren(...v){this.children=v;},focus(){this.focado=true;}});
  const el=id=>{if(!elementos.has(id))elementos.set(id,elemento());return elementos.get(id);};
  el('#estimativa-tipo').value='agua';let aberta;
  iniciarEstimativa({querySelector:el,createElement:elemento},e.modelosEstimativa,e.calcularEstimativa,e.formatarEstimativa,m=>{aberta=m;});
  const enviar=()=>el('#estimativa-form').eventos.submit({preventDefault(){}});
  enviar();assert.match(el('#estimativa-erro').textContent,/Preencha/);
  el('#estimativa-quantidade').value='1';el('#estimativa-dias').value='30';enviar();
  assert.match(el('#estimativa-resultado').textContent,/1.380 L/);assert.match(el('#estimativa-resultado').textContent,/não economia medida/);
  el('#estimativa-form').eventos.input();assert.equal(el('#estimativa-resultado').textContent,'');
  el('#estimativa-tipo').value='energia';el('#estimativa-tipo').eventos.change();
  assert.equal(el('#estimativa-campos').children.length,4);
  assert.equal(el('#estimativa-fonte').href,e.modelosEstimativa.energia.url);
  el('#estimativa-abrir').eventos.click();assert.equal(aberta.ods,7);
  for(const [tipo,campo] of [['alimentos','gramas'],['oleo','mililitros']]) {
    el('#estimativa-tipo').value=tipo;el('#estimativa-tipo').eventos.change();
    assert.equal(el('#estimativa-campos').children.length,1);
    assert.equal(el('#estimativa-fonte').hidden,true);
    assert.match(el('#estimativa-origem').textContent,/informada por você/);
    assert.equal(el('#estimativa-calcular').textContent,'Conferir quantidade');
    el('#estimativa-'+campo).value='1500';enviar();
    assert.match(el('#estimativa-resultado').textContent,/Quantidade informada: 1,5/);
    assert.match(el('#estimativa-resultado').textContent,/não uma estimativa de impacto/);
  }
  el('#estimativa-tipo').value='banho';el('#estimativa-tipo').eventos.change();
  assert.equal(el('#estimativa-resultado').textContent,'');
  assert.equal(el('#estimativa-fonte').hidden,false);
  assert.equal(el('#estimativa-origem').textContent,'');
  assert.equal(el('#estimativa-calcular').textContent,'Calcular estimativa');
  el('#estimativa-abrir').eventos.click();assert.equal(aberta.ods,6);
  assert.equal(el('#estimativa-abrir').textContent,'Ver ações do ODS 6');
  console.log('OK Estimativas: interface, validação, resultado, limpeza ao editar, fonte atualizada e atalho');
}
validarEstimativas();

async function validarCidade() {
  const c=require('./public/cidade');
  const p={id:'teste',nome:'Local de teste',cidade:'São Paulo, SP',categoria:'coleta',endereco:'Endereço de teste',detalhes:'Dados sintéticos apenas para testes',latitude:-23,longitude:-46,fonte:'https://example.org',consultadoEm:'2026-01-01'};
  const envelope=pontos=>({versao:1,pontos});
  assert.deepEqual(c.lerJsonCidade('\uFEFF'+JSON.stringify(envelope([p]))),c.validarPontosCidade(envelope([p])));
  assert.deepEqual(c.validarPontosCidade(envelope([])),[]);
  for(const dados of [null,{},envelope(Array(201).fill(p)),{versao:2,pontos:[]},envelope([p,p])])assert.throws(()=>c.validarPontosCidade(dados));
  for(const [campo,valor] of [['latitude',91],['latitude','-23'],['longitude',NaN],['longitude',-181],['nome',''],['detalhes','a'.repeat(601)],['categoria','__proto__'],['fonte','javascript:alert(1)'],['fonte','https://user:pass@example.org'],['consultadoEm','2026-02-30'],['consultadoEm','2999-01-01']])assert.throws(()=>c.validarPontosCidade(envelope([{...p,[campo]:valor}])));
  assert.throws(()=>c.lerJsonCidade('{'),/cópia/);assert.throws(()=>c.lerJsonCidade('a'.repeat(500001)),/500 KB/);
  assert.equal(c.unirPontosCidade([p],[{...p,nome:'não sobrescrever'}])[0].nome,p.nome);
  assert.equal(c.unirPontosCidade([p],[{...p,id:'segundo'}]).length,2);
  assert.equal(c.filtrarPontosCidade([p],'sao paulo','coleta').length,1);
  assert.equal(c.filtrarPontosCidade([p],'são','horta').length,0);
  const storage={valor:null,setItem(k,v){this.valor=v;},getItem(){return this.valor;}};
  c.salvarPontosCidade(storage,[p]);assert.equal(c.lerJsonCidade(storage.valor)[0].id,p.id);
  assert.throws(()=>c.salvarPontosCidade({setItem(){throw Error();}},[p]),/Não foi possível salvar/);
  const ui=require('./public/cidade-ui');
  const {iniciarCidade,carregarLeafletCidade,resumoPontosCidade}=ui;
  assert.equal(resumoPontosCidade(1),'1 ponto na sua lista.');
  assert.equal(resumoPontosCidade(2),'2 pontos na sua lista.');
  assert.equal(resumoPontosCidade(0),'0 pontos na sua lista.');
  const elementos=new Map();
  const criar=()=>({value:'',textContent:'',children:[],eventos:{},setAttribute(k,v){this[k]=v;},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},addEventListener(k,v){this.eventos[k]=v;},focus(){this.focado=true;},reset(){},remove(){},click(){this.clicado=true;}});
  const el=id=>{if(!elementos.has(id))elementos.set(id,criar());return elementos.get(id);};
  const eventosCidade={};const doc={getElementById:el,createElement:criar,head:criar(),body:criar(),addEventListener(k,f){eventosCidade[k]=f;}};
  const ambiente={localStorage:storage,crypto:{randomUUID:()=> 'novo'},confirm:()=>true,URL:{createObjectURL:()=> 'blob:teste',revokeObjectURL(){}},setTimeout:fn=>{fn();return 1;},clearTimeout(){}};
  let aberturas=0;el('cidade-carregar').click=()=>{aberturas++;};
  const pontosAntesDaLeitura=storage.valor;
  await iniciarCidade(doc,ambiente,c);
  assert.equal(storage.valor,pontosAntesDaLeitura);assert.equal(aberturas,0);eventosCidade['ecoa-rota']({detail:{tela:'inicio'}});assert.equal(aberturas,0);eventosCidade['ecoa-rota']({detail:{tela:'na-cidade'}});assert.equal(aberturas,1);
  el('cidade-adicionar').eventos.click();assert.equal(el('cidade-cadastro').hidden,false);assert.equal(el('ponto-nome').focado,true);
  el('cidade-fechar-cadastro').eventos.click();assert.equal(el('cidade-cadastro').hidden,true);assert.equal(el('cidade-adicionar')['aria-expanded'],'false');
  el('cidade-adicionar').eventos.click();assert.equal(el('cidade-adicionar')['aria-expanded'],'true');

  assert.equal(el('cidade-lista').children.length,1);
  el('cidade-filtro').value='outra';el('cidade-filtro').eventos.input();assert.equal(el('cidade-lista').children.length,0);
  assert.equal(el('cidade-vazio').hidden,false);assert.equal(el('cidade-vazio-acao').textContent,'Limpar filtros');
  el('cidade-vazio-acao').eventos.click();assert.equal(el('cidade-filtro').value,'');assert.equal(el('cidade-vazio').hidden,true);

  el('cidade-lista').children[0].children.at(-1).children.at(-1).eventos.click();assert.equal(c.lerJsonCidade(storage.valor).length,0);
  assert.equal(el('cidade-vazio-acao').hidden,true);el('cidade-adicionar').eventos.click();assert.equal(el('cidade-cadastro').hidden,false);
  for(const campo of Object.keys(p).filter(k=>k!=='id'))el('ponto-'+campo).value=String(p[campo]);
  el('cidade-form').eventos.submit({preventDefault(){}});assert.equal(c.lerJsonCidade(storage.valor).length,1);
  const anterior=storage.valor;
  await el('cidade-importar').eventos.change({target:{files:[{name:'ruim.json',size:2,text:async()=>'{'}],value:'x'}});assert.equal(storage.valor,anterior);assert.match(el('cidade-status').textContent,/cópia/);
  await el('cidade-importar').eventos.change({target:{files:[{name:'bom.json',size:500,text:async()=>JSON.stringify(envelope([p]))}],value:'x'}});assert.equal(c.lerJsonCidade(storage.valor).length,2);
  el('cidade-exportar').eventos.click();assert.equal(doc.body.children.at(-1).download,'ecoa-pontos-locais.json');
  await el('cidade-carregar').eventos.click();assert.equal(el('cidade-carregar').disabled,false);assert.match(el('cidade-status').textContent,/Não foi possível carregar o mapa/);
  const docCarga={head:{append(el){el.onload();}},createElement:criar};
  const envCarga={setTimeout:()=>1,clearTimeout(){}};
  await carregarLeafletCidade(docCarga,envCarga);assert.equal(envCarga.__ecoaLeafletPronto,true);await carregarLeafletCidade(docCarga,envCarga);
  let marcadores=0,limpezas=0;
  let centroInicial,zoomInicial;
  const mapaFake={setView(centro,zoom){centroInicial=centro;zoomInicial=zoom;return this;},fitBounds(){throw Error('Não deve deslocar o centro pelos lugares salvos');},remove(){}};
  ambiente.__ecoaLeafletPronto=true;
  ambiente.L={map:()=>mapaFake,control:{zoom:()=>({addTo(){}})},tileLayer:()=>({on(){return this;},addTo(){}}),layerGroup:()=>({addTo(){return this;},clearLayers(){limpezas++;}}),marker:()=>({bindPopup(popup){assert.equal(typeof popup,'object');return this;},addTo(){marcadores++;}})};
  await el('cidade-carregar').eventos.click();assert.equal(el('cidade-mapa').hidden,false);assert.equal(marcadores,2);assert.deepEqual(centroInicial,[-24.01,-48.35]);assert.equal(zoomInicial,14);
  el('cidade-categoria').value='horta';el('cidade-categoria').eventos.change();assert.equal(el('cidade-lista').children.length,0);assert.ok(limpezas>=2);
  storage.valor='JSON inválido';await iniciarCidade(doc,ambiente,c);
  for(const campo of Object.keys(p).filter(k=>k!=='id'))el('ponto-'+campo).value=String(p[campo]);
  el('cidade-form').eventos.submit({preventDefault(){}});assert.equal(storage.valor,'JSON inválido');
  const html=require('fs').readFileSync('public/index.html','utf8');assert.match(html,/id="na-minha-cidade"/);assert.match(html,/id="osm-lista"/);
  console.log('OK Cidade: schema, limites, links seguros, datas, filtros, união, persistência, cadastro, remoção, importação, exportação, falha de mapa e proteção de dados inválidos (DOM simulado)');
}
validarCidade().catch(erro=>{console.error(erro);process.exitCode=1;});

async function validarEnderecos() {
  const a=require('./public/enderecos');
  const feature=(nome,pais='BR')=>({geometry:{coordinates:[-48,-23]},properties:{name:nome,street:'Rua A',district:'Centro',city:'Capão Bonito',state:'São Paulo',countrycode:pais}});
  let url,opcoes;
  const itens=await a.consultarProvedorEndereco('Rua A',{vies:{latitude:-23,longitude:-48},fetcher:async(u,o)=>{url=new URL(u);opcoes=o;return {ok:true,json:async()=>({features:[feature('Outro','PT'),feature('<img src=x onerror=alert(1)>')]})};}});
  assert.equal(url.searchParams.get('lang'),'pt');assert.equal(url.searchParams.get('lat'),'-23');assert.equal(url.searchParams.get('limit'),'5');assert.equal(opcoes.cache,'no-store');assert.equal(itens[0].uf,'SP');assert.match(itens[0].nome,/<img/);
  let chamadas=0;const servico=a.criarServicoEnderecos(async()=>{chamadas++;return itens;});
  assert.deepEqual(await servico('ab'),[]);assert.equal(chamadas,0);
  await servico('abc');await servico('ABC');assert.equal(chamadas,1);
  await servico('abc',{vies:{latitude:1,longitude:2}});assert.equal(chamadas,2);
  for(let i=0;i<51;i++)await servico('busca '+i);await servico('abc');assert.equal(chamadas,54);
  let agora=0,id=0;const timers=new Map();
  const clock={setTimeout(fn,ms){timers.set(++id,{fn,quando:agora+ms});return id;},clearTimeout(i){timers.delete(i);}};
  const tick=async ms=>{agora+=ms;for(const [i,t]of [...timers])if(t.quando<=agora){timers.delete(i);t.fn();}for(let j=0;j<8;j++)await Promise.resolve();};
  let pedidos=[],estados=[];
  const controle=a.criarControleEndereco({relogio:clock,atualizar:(estado,dados)=>estados.push({estado,dados}),buscar:(q,o)=>new Promise((resolve,reject)=>pedidos.push({q,...o,resolve,reject}))});
  controle.digitar('ab');await tick(400);assert.equal(pedidos.length,0);
  controle.digitar('abc');await tick(349);assert.equal(pedidos.length,0);await tick(1);assert.equal(pedidos.length,1);
  controle.digitar('abcd');assert.equal(pedidos[0].signal.aborted,true);await tick(350);assert.equal(pedidos.length,2);
  pedidos[0].resolve(itens);await tick(0);assert.equal(estados.at(-1).estado,'carregando');
  pedidos[1].resolve([]);await tick(0);assert.equal(estados.at(-1).estado,'vazio');
  controle.digitar('erro');await tick(350);pedidos.at(-1).reject(Error('offline'));await tick(0);assert.equal(estados.at(-1).estado,'erro');
  controle.digitar('tarde');await tick(350);controle.cancelar();pedidos.at(-1).resolve(itens);await tick(0);assert.notEqual(estados.at(-1).estado,'pronto');
  // DOM mínimo: qualquer uso de innerHTML falha; dados maliciosos devem ser texto.
  function el(tag){return {tag,children:[],attrs:{},eventos:{},dataset:{},style:{},value:'',hidden:false,
    set innerHTML(v){throw Error('HTML inseguro');},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},removeAttribute(k){delete this.attrs[k];},
    append(...xs){xs.forEach(x=>{this.children.push(x);x.parentNode=this;});},insertBefore(x){this.append(x);},replaceChildren(...xs){this.children=[];this.append(...xs);},
    addEventListener(k,v){(this.eventos[k]??=[]).push(v);},dispatchEvent(e){e.target??=this;for(const fn of this.eventos[e.type]||[])fn(e);},contains(x){return x===this||this.children.some(y=>y.contains(x));},getBoundingClientRect(){return {left:10,top:500,bottom:548,width:300};},scrollIntoView(){}};}
  const input=el('input'),body=el('body');body.append(input);
  const doc=el('document');doc.body=body;doc.createElement=el;doc.querySelectorAll=()=>[input];
  const env={...clock,innerWidth:360,innerHeight:640,addEventListener(){},Event:class{constructor(type,args){this.type=type;Object.assign(this,args);}},CustomEvent:class{constructor(type,args){this.type=type;Object.assign(this,args);}}};
  const api=a.iniciarEnderecos(doc,env,async()=>itens);
  input.value='Rua A';input.dispatchEvent({type:'input'});await tick(350);
  const lista=input.parentNode.children[1];assert.equal(lista.children.length,2);assert.equal(input.attrs['aria-expanded'],'true');assert.equal(lista.children[0].children[0].textContent,itens[0].nome);
  let bloqueado=false,selecionado;
  input.addEventListener('endereco-selecionado',e=>selecionado=e.detail);
  input.dispatchEvent({type:'keydown',key:'ArrowDown',preventDefault(){bloqueado=true;}});assert.equal(input.attrs['aria-activedescendant'],lista.children[0].id);
  input.dispatchEvent({type:'keydown',key:'Enter',preventDefault(){bloqueado=true;}});assert.equal(selecionado.latitude,-23);assert.equal(input.value,itens[0].rotulo);assert.equal(lista.hidden,true);
  bloqueado=false;input.dispatchEvent({type:'keydown',key:'Enter',preventDefault(){bloqueado=true;}});assert.equal(bloqueado,false);
  input.value='Rua A';input.dispatchEvent({type:'input'});await tick(350);input.dispatchEvent({type:'keydown',key:'Escape'});assert.equal(lista.hidden,true);
  input.dispatchEvent({type:'input'});await tick(350);input.dispatchEvent({type:'keydown',key:'Tab'});assert.equal(lista.hidden,true);
  input.dispatchEvent({type:'input'});await tick(350);doc.dispatchEvent({type:'pointerdown',target:el('outro')});assert.equal(lista.hidden,true);
  await api.buscar(input);assert.equal(input.value,itens[0].rotulo);
  console.log('OK Endereços: Photon simulado, pt/viés/Brasil, debounce 350ms, mínimo, cancelamento/resposta tardia, LRU, vazio, erro, textContent anti-XSS, ARIA, teclado, toque fora e busca por Enter');
}
validarEnderecos().catch(erro=>{console.error(erro);process.exitCode=1;});

async function validarCep() {
  const a=require('./public/enderecos');
  assert.equal(a.normalizarBuscaEndereco('  SÃO   PAULO '),'sao paulo');
  assert.equal(a.identificarCepEndereco('18300-000'),'18300000');
  assert.equal(a.identificarCepEndereco('18300000'),'18300000');
  assert.equal(a.identificarCepEndereco('18300'),null);
  let chamadas=0;
  const s=a.criarServicoEnderecos(async()=>{chamadas++;return [];});
  await s('SÃO PAULO');await s('sao paulo');assert.equal(chamadas,1);
  await s('18300-000');await s('18300000');assert.equal(chamadas,2);
  const reversas=[],featureCep=()=>({geometry:{coordinates:[-48.87,-23.98]},properties:{name:'Praça Central',street:'Rua A',district:'Centro',city:'Capão Bonito',state:'São Paulo',countrycode:'BR'}});
  const reverso=await a.reverterEndereco(-23.98,-48.87,{fetcher:async u=>{
    reversas.push(new URL(u));return {ok:true,json:async()=>({features:[featureCep()]})};
  }});
  assert.equal(reversas[0].pathname,'/reverse');assert.equal(reversas[0].searchParams.get('lat'),'-23.98');
  assert.equal(reversas[0].searchParams.get('lon'),'-48.87');assert.equal(reversas[0].searchParams.get('lang'),'pt');
  assert.equal(reverso.cidade,'Capão Bonito');assert.equal(reverso.brasil,true);
  assert.equal(await a.reverterEndereco(NaN,-48.87,{fetcher:async()=>{throw Error('não deve chamar');}}),null);
  await assert.rejects(()=>a.reverterEndereco(0,0,{fetcher:async()=>({ok:false,status:503})}));
  const requests=[];
  const fallback=await a.consultarProvedorEndereco('TESTE',{fetcher:async u=>{
    requests.push(new URL(u));return requests.length===1?{ok:false,status:400,json:async()=>{throw Error('corpo vazio');}}:{ok:true,json:async()=>({features:[]})};
  }});
  assert.equal(requests[0].searchParams.get('lang'),'pt');assert.equal(requests[1].searchParams.get('lang'),'default');assert.deepEqual(fallback,[]);
  const cep=await a.consultarProvedorEndereco('18300-000',{fetcher:async u=>u.includes('viacep')?{ok:true,json:async()=>({logradouro:'',bairro:'',localidade:'Capão Bonito',uf:'SP'})}:{ok:false,status:503}});
  assert.equal(cep[0].cep,'18300-000');assert.equal(cep[0].latitude,null);assert.equal(cep[0].cidade,'Capão Bonito');
  assert.deepEqual(await a.consultarProvedorEndereco('99999999',{fetcher:async()=>({ok:true,json:async()=>({erro:true})})}),[]);
  assert.deepEqual(await a.consultarProvedorEndereco('18300',{fetcher:async()=>{throw Error('Não deveria consultar');}}),[]);
  await assert.rejects(()=>a.consultarProvedorEndereco('18300000',{fetcher:async()=>{throw Error('offline');}}));
  let urlCep;
  const dadosCep=await a.consultarViaCep('18300-000',{fetcher:async u=>{urlCep=new URL(u);return {ok:true,json:async()=>({logradouro:'Rua A',bairro:'Centro',localidade:'Capão Bonito',uf:'SP'})};}});
  assert.equal(urlCep.origin,'https://viacep.com.br');assert.equal(urlCep.pathname,'/ws/18300000/json/');
  assert.deepEqual(dadosCep,{cep:'18300-000',endereco:'Rua A',bairro:'Centro',cidade:'Capão Bonito',uf:'SP'});
  assert.equal(await a.consultarViaCep('18300',{fetcher:async()=>{throw Error('não deve consultar');}}),null);
  assert.equal(await a.consultarViaCep('99999999',{fetcher:async()=>({ok:true,json:async()=>({erro:true})})}),null);
  await assert.rejects(()=>a.consultarViaCep('18300000',{fetcher:async()=>({ok:false,status:503})}),e=>e.codigoCep==='indisponivel');
  const geoUrls=[];
  const respostaPhoton=()=>({ok:true,json:async()=>({features:[{
    geometry:{coordinates:[-48,-23]},properties:{name:'Rua A',street:'Rua A',district:'Centro',city:'Capão Bonito',state:'São Paulo',countrycode:'BR'}
  }]})});
  const localizado=await a.localizarEnderecoCadastro({endereco:'Rua A',numero:'10',bairro:'Centro',cidade:'Capão Bonito',uf:'SP'},
    {fetcher:async u=>{geoUrls.push(new URL(u));return respostaPhoton();}});
  assert.equal(geoUrls[0].pathname,'/api/');
  assert.match(geoUrls[0].searchParams.get('q'),/rua a, 10, centro/);
  assert.equal(localizado.latitude,-23);assert.equal(localizado.aproximado,true);
  assert.equal(await a.localizarEnderecoCadastro({endereco:'Rua A',numero:'10',cidade:'Sorocaba',uf:'SP'},{fetcher:async()=>respostaPhoton()}),null);
  const semNumero=await a.localizarEnderecoCadastro({endereco:'Rua A',cidade:'Capão Bonito',uf:'SP'},
    {fetcher:async u=>{geoUrls.push(new URL(u));return respostaPhoton();}});
  assert.ok(semNumero);assert.doesNotMatch(geoUrls.at(-1).searchParams.get('q'),/rua a, 10/);
  console.log('OK CEP: com/sem hífen, cache, fallback, inexistente/incompleto/falha, ViaCEP dedicado, geocódigo com número e divergência cidade/UF');
}
// Executado após a suíte existente para manter isolado o teste do idioma inicial.
setTimeout(()=>validarCep().catch(e=>{console.error(e);process.exitCode=1;}),0);

async function validarLembretesEtapa10(){
  const a=require('./public/lembretes'),acao=acoes[0],chave=acao.ods+':'+acao.titulo;
  const storage={v:null,getItem(){return this.v;},setItem(k,v){this.v=v;}};
  let d=a.lerLembretes(storage,acoes),p=new Map([[chave,false]]);
  const futuro=Date.now()+60000;
  d=a.agendarLembrete(d,chave,futuro,p);
  assert.equal(a.agendarLembrete(d,chave,futuro+1,p).itens.length,1);
  assert.throws(()=>a.agendarLembrete(d,chave,0,p));
  assert.throws(()=>a.agendarLembrete(d,chave,futuro,new Map([[chave,true]])));
  a.salvarLembretes(storage,d,acoes);assert.deepEqual(a.lerLembretes(storage,acoes),d);
  assert.equal(a.lembretesVencidos(d,p,futuro-1).length,0);assert.equal(a.lembretesVencidos(d,p,futuro).length,1);
  assert.equal(a.lembretesVencidos({...d,itens:[{...d.itens[0],avisado:true}]},p,futuro).length,0);
  assert.equal(a.reconciliarLembretes(d,new Map()).itens.length,0);
  assert.equal(a.reconciliarLembretes(d,new Map([[chave,true]])).itens.length,0);
  for(const ruim of [{}, {...d,versao:2},{...d,itens:[...d.itens,...d.itens]},{...d,itens:[{chave:'falsa',quando:futuro,avisado:false}]}])assert.throws(()=>a.validarLembretes(ruim,acoes));
  assert.throws(()=>a.salvarLembretes({setItem(){throw Error();}},d,acoes));
  assert.throws(()=>a.horarioLembrete('2027-02-30T12:00',0));assert.throws(()=>a.horarioLembrete('',0));
  assert.ok(a.horarioLembrete('2030-01-01T12:00',0)>0);
  let pedidos=0;
  const ambiente={isSecureContext:true,Notification:{permission:'default',requestPermission:async()=>{pedidos++;return 'granted';}}};
  assert.equal(await a.permitirNotificacoes(ambiente),'granted');assert.equal(pedidos,1);
  ambiente.Notification.permission='denied';assert.equal(await a.permitirNotificacoes(ambiente),'denied');assert.equal(pedidos,1);
  assert.equal(await a.permitirNotificacoes({}),'indisponivel');
  assert.equal(await a.notificarLembrete(ambiente,acao),false);
  let notificadas=0;ambiente.Notification.permission='granted';ambiente.location={href:'https://example.org/sub/'};
  ambiente.navigator={serviceWorker:{getRegistration:async()=>({active:true,showNotification:async(t,o)=>{notificadas++;assert.equal(o.data.ecoa,true);}})}};
  assert.equal(await a.notificarLembrete(ambiente,acao),true);assert.equal(notificadas,1);
  const ics=a.calendarioLembrete({...acao,titulo:'Á'.repeat(100)+'\nBEGIN:TESTE'},futuro);
  assert.ok(ics.includes('BEGIN:VCALENDAR\r\n'));assert.ok(ics.includes('BEGIN:VALARM'));assert.ok(!ics.includes('\r\nBEGIN:TESTE'));
  assert.ok(ics.split('\r\n').every(l=>Buffer.byteLength(l)<=75));
  assert.notEqual(a.calendarioLembrete(acao,futuro),a.calendarioLembrete({...acao,titulo:'outra'},futuro));
  const elementos=new Map();
  const criar=()=>({children:[],eventos:{},value:'',textContent:'',setAttribute(){},replaceChildren(...x){this.children=x;},append(...x){this.children.push(...x);},addEventListener(k,f){this.eventos[k]=f;},focus(){},click(){},remove(){}});
  const el=id=>{if(!elementos.has(id))elementos.set(id,criar());return elementos.get(id);};
  const doc={getElementById:el,createElement:criar,body:criar(),addEventListener(){}};
  storage.v=null;let solicitacoes=0,envios=0;
  const env={localStorage:storage,navigator:{},Notification:{permission:'default'},setInterval(){},setTimeout(){},addEventListener(){}};
  const api={...a,permitirNotificacoes:async()=>{solicitacoes++;env.Notification.permission='granted';return 'granted';},notificarLembrete:async()=>{envios++;return true;}};
  const ui=require('./public/lembretes-ui').iniciarLembretes(doc,env,acoes,()=>p,api);
  el('lembrete-opcao').value='amanha';el('lembrete-opcao').eventos.change();assert.match(el('lembrete-quando').value,/T09:00$/);
  el('lembrete-quando').eventos.input();assert.equal(el('lembrete-opcao').value,'personalizado');
  assert.equal(solicitacoes,0);assert.equal(el('lembretes').hidden,false);assert.equal(el('lembrete-salvar').disabled,false);
  assert.equal(el('lembrete-acao').children[0].value,'');assert.match(el('lembrete-acao').children[0].textContent,/Escolha uma ação/);assert.equal(el('lembrete-quando').disabled,false);
  await el('lembrete-ativar').eventos.click();assert.equal(solicitacoes,1);assert.equal(a.lerLembretes(storage,acoes).notificacoes,true);
  el('lembrete-acao').value=chave;el('lembrete-quando').value='2030-01-01T12:00';el('lembrete-form').eventos.submit({preventDefault(){}});
  assert.equal(a.lerLembretes(storage,acoes).itens.length,1);
  let salvo=a.lerLembretes(storage,acoes);salvo.itens[0].quando=Date.now()-1;a.salvarLembretes(storage,salvo,acoes);
  await ui.verificar();await ui.verificar();assert.equal(envios,1);assert.match(el('lembrete-status').textContent,/Hora de agir/);
  el('lembrete-desativar').eventos.click();assert.equal(a.lerLembretes(storage,acoes).notificacoes,false);
  p.set(chave,true);ui.atualizar();assert.equal(el('lembrete-acao').disabled,true);assert.equal(el('lembrete-quando').disabled,true);assert.match(el('lembrete-salvar-ajuda').textContent,/ação pendente/);assert.equal(a.lerLembretes(storage,acoes).itens.length,0);assert.equal(el('lembrete-salvar').disabled,true);
  p.set(chave,false);ui.atualizar();assert.equal(el('lembrete-salvar').disabled,false);assert.equal(el('lembrete-acao').disabled,false);
  p.clear();ui.atualizar();assert.equal(el('lembretes').hidden,true);
  storage.v='{inválido';ui.atualizar();assert.doesNotMatch(el('lembrete-status').textContent,/json/i);assert.match(el('lembrete-salvar-ajuda').textContent,/Não foi possível ler/);assert.equal(storage.v,'{inválido');assert.equal(el('lembrete-salvar').disabled,true);
  console.log('OK Lembretes: datas, persistência, substituição, conclusão/remoção, permissão só por clique, recusa, disparo único, falha, calendário seguro e interface simulada');
}
validarLembretesEtapa10().catch(e=>{console.error(e);process.exitCode=1;});

function validarSobreEFontes(){
  const fs=require('fs'),path=require('path');
  const origem='https://o-que-da-pra-fazer-ods.gardendogwood1.chatgpt.site';
  for(const pagina of ['index.html','sobre.html']){
    const h=fs.readFileSync('public/'+pagina,'utf8');
    const canonico=origem+(pagina==='index.html'?'/':'/sobre.html');
    assert.ok(h.includes(`rel="canonical" href="${canonico}"`));
    assert.ok(h.includes(`property="og:url" content="${canonico}"`));
    for(const nome of ['og:title','og:description','og:type','og:locale','og:site_name','og:image','og:image:alt','og:image:width','og:image:height'])assert.equal((h.match(new RegExp(`property="${nome}"`,'g'))||[]).length,1);
    assert.match(h,/name="twitter:card" content="summary"/);
    const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
    for(const m of h.matchAll(/(?:href|src)="([^"]+)"/g)){
      const url=m[1];if(url.startsWith('https:'))continue;
      if(url.startsWith('#/')){assert.equal(require('./public/rotas').resolverRotaEcoa(url).hash,url);continue;}
      if(url.startsWith('#')){assert.ok(ids.includes(url.slice(1)),url);continue;}
      const destino=url.split('#')[0]||'index.html';assert.ok(fs.existsSync(path.join('public',destino)),destino);
    }
  }
  const sobre=fs.readFileSync('public/sobre.html','utf8');
  for(let i=1;i<=17;i++)assert.ok(sobre.includes(`href="https://brasil.un.org/pt-br/sdgs/${i}"`));
  for(const id of ['proposta','metodologia','limites','dados','fontes','alternar-tema','preferencia-tema','aumentar-fonte','reduzir-fonte','restaurar-leitura'])assert.ok(sobre.includes(`id="${id}"`));
  assert.match(sobre,/Meta oficial/);assert.match(sobre,/Exemplo didático/);assert.match(sobre,/Ação do projeto/);
  assert.ok(!sobre.includes('src="app.js"'));
  assert.match(fs.readFileSync('public/index.html','utf8'),/href="sobre.html"/);
  console.log('OK Sobre e fontes: 17 links oficiais, seções, controles de leitura, links internos, IDs únicos e metadados de ambas as páginas');
}
validarSobreEFontes();

function validarRotasFase1() {
  const {resolverRotaEcoa:resolver,iniciarRotasEcoa,atalhosEcoa}=require('./public/rotas');
  const fs=require('node:fs');
  for(const [antigo,novo] of Object.entries(atalhosEcoa))assert.equal(resolver('#'+antigo).hash,novo);
  for(const hash of ['','#/nao-existe','#/aprender/ods-0','#/aprender/ods-18','#/agir/outro','#/inicio/extra','#/agir/calcular/extra'])assert.equal(resolver(hash).hash,'#/inicio');
  for(let ods=1;ods<=17;ods++)assert.equal(resolver('#/aprender/ods-'+ods).ods,ods);
  for(const acao of acoes){const chave=acao.ods+':'+acao.titulo;
    const antiga='#acao='+encodeURIComponent(chave),nova=resolver(antiga);
    assert.equal(nova.acao,chave);assert.equal(nova.hash,'#/agir?acao='+encodeURIComponent(chave));
    assert.equal(require('./public/compartilhar').acaoDoLink(antiga,acoes),acao);
    assert.equal(require('./public/compartilhar').acaoDoLink(nova.hash,acoes),acao);
  }
  const elementos=new Map(),eventos={},docEventos={};let foco,rolagens=0,guia,acao;
  const el=id=>{if(!elementos.has(id))elementos.set(id,{id,hidden:false,dataset:{},attrs:{},eventos:{},value:'',
    setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},getAttribute(k){return this.attrs[k];},hasAttribute(k){return k in this.attrs;},
    focus(){foco=id;},scrollIntoView(){this.rolou=true;},addEventListener(k,f){this.eventos[k]=f;}});return elementos.get(id);};
  const telas=['inicio','agir','aprender','na-cidade','meu-espaco'].map(id=>{const x=el('tela-'+id);x.dataset.tela=id;return x;});
  const nav=telas.map(t=>{const x=el('nav-'+t.dataset.tela);x.dataset.nav=t.dataset.tela;return x;});
  const voltar=telas.slice(1).map(t=>el('voltar-'+t.dataset.tela));
  const doc={title:'Ecoa',getElementById:el,querySelector:el,querySelectorAll:s=>({'[data-tela]':telas,'[data-nav]':nav,'[data-voltar]':voltar}[s]||[]),
    addEventListener(k,f){docEventos[k]=f;},dispatchEvent(e){docEventos[e.type]?.(e);}};
  const historico=['#busca'];let pos=0;
  const janela={location:{hash:'#busca'},scrollTo(){rolagens++;},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}},
    addEventListener(k,f){eventos[k]=f;},history:{replaceState(a,b,h){historico[pos]=janela.location.hash=h;},pushState(a,b,h){historico.splice(++pos);historico[pos]=janela.location.hash=h;}}};
  // Um roteador não pode sequer acessar o armazenamento.
  Object.defineProperty(janela,'localStorage',{get(){throw Error('Roteador não deve acessar dados salvos');}});
  const router=iniciarRotasEcoa(doc,janela,{abrirGuia(n){guia=n;},abrirAcao(chave){acao=chave;}});
  assert.equal(janela.location.hash,'#/agir');assert.equal(doc.title,'Agir | Ecoa');assert.equal(foco,'tela-agir-titulo');assert.equal(rolagens,1);
  assert.equal(el('tela-agir-titulo').attrs['data-foco-toque'],'true');
  docEventos.pointerdown();router.navegar('#/inicio');assert.equal(el('tela-inicio-titulo').attrs['data-foco-toque'],'true');
  docEventos.keydown();router.navegar('#/agir');assert.equal(el('tela-agir-titulo').attrs['data-foco-toque'],'false');
  const estado=()=>{assert.equal(telas.filter(t=>!t.hidden).length,1);assert.equal(nav.filter(n=>n.attrs['aria-current']==='page').length,1);};estado();
  el('campo-existente').value='valor não salvo';const original=el('campo-existente');
  router.navegar('#/agir/calcular');assert.equal(el('painel-buscar').hidden,true);assert.equal(el('painel-calcular').hidden,false);
  assert.equal(el('aba-calcular').attrs['aria-selected'],'true');assert.equal(el('aba-buscar').tabIndex,-1);
  el('aba-buscar').dataset.rota='#/agir';el('aba-calcular').dataset.rota='#/agir/calcular';
  el('[role="tablist"]').eventos.keydown({key:'ArrowLeft',target:el('aba-calcular'),preventDefault(){}});
  assert.equal(janela.location.hash,'#/agir');assert.equal(foco,'aba-buscar');
  router.navegar('#/aprender/ods-6');estado();assert.equal(guia,6);assert.equal(foco,'guia-nome');assert.equal(el('quiz').hidden,true);
  assert.equal(el('ods-anterior').href,'#/aprender/ods-5');assert.equal(el('ods-proximo').href,'#/aprender/ods-7');
  assert.ok(voltar.every(v=>v.hidden===false));
  router.navegar('#/aprender/ods-17');assert.equal(el('ods-proximo').href,'#/aprender/ods-1');
  router.navegar('#/aprender/ods-1');assert.equal(el('ods-anterior').href,'#/aprender/ods-17');
  router.navegar('#/aprender');assert.equal(el('quiz').hidden,false);assert.equal(el('cartoes-guias').hidden,false);
  router.navegar('#/na-cidade');estado();router.navegar('#/meu-espaco/desafio');assert.equal(foco,'desafio-titulo');
  // Voltar e Avançar reais usam popstate; hashchange extra não duplica renderização.
  janela.location.hash=historico[--pos];eventos.popstate();assert.equal(doc.title,'Na cidade | Ecoa');const antes=rolagens;eventos.hashchange();assert.equal(rolagens,antes);
  janela.location.hash=historico[++pos];eventos.popstate();assert.equal(foco,'desafio-titulo');
  router.navegar('#/meu-espaco/configuracoes');assert.equal(el('espaco-configuracoes').hidden,false);assert.equal(foco,'configuracoes-titulo');
  router.navegar('#/meu-espaco/conquistas');assert.equal(foco,'conquistas-titulo');
  const paineis=['meu-plano','desafio','espaco-conquistas','espaco-configuracoes'];
  for(const [i,sub] of ['','desafio','conquistas','configuracoes'].entries()){
   router.navegar('#/meu-espaco'+(sub?'/'+sub:''));
   assert.deepEqual(paineis.map(id=>el(id).hidden),paineis.map((_,j)=>i!==j));
   const nome=sub||'plano';assert.equal(el('espaco-tab-'+nome).attrs['aria-selected'],'true');
   el('espaco-tab-'+nome).dataset.rota='#/meu-espaco'+(sub?'/'+sub:'');
  }
  el('espaco-abas').eventos.keydown({key:'ArrowRight',target:el('espaco-tab-configuracoes'),preventDefault(){}});
  assert.equal(janela.location.hash,'#/meu-espaco');assert.equal(foco,'espaco-tab-plano');
  el('espaco-abas').eventos.keydown({key:'End',target:el('espaco-tab-plano'),preventDefault(){}});assert.equal(foco,'espaco-tab-configuracoes');
  router.navegar('#importar-json');assert.equal(el('espaco-configuracoes').hidden,false);
  router.abrirBusca();assert.equal(janela.location.hash,'#/agir');
  router.navegar('#acao='+encodeURIComponent('6:ação antiga'));assert.equal(acao,'6:ação antiga');assert.equal(telas[1].hidden,false);
  router.navegar('#/desconhecida');assert.equal(doc.title,'Início | Ecoa');estado();
  assert.equal(el('campo-existente'),original);assert.equal(original.value,'valor não salvo');
  const link=el('link');link.attrs.href='#/aprender';let impediu=false;
  docEventos.click({target:{closest:()=>link},button:0,preventDefault(){impediu=true;}});assert.ok(impediu);assert.equal(janela.location.hash,'#/aprender');
  link.attrs.href='#conteudo';docEventos.click({target:{closest:()=>link},button:0,preventDefault(){}});assert.equal(foco,'tela-aprender-titulo');assert.equal(el('tela-aprender-titulo').attrs['data-foco-toque'],'false');
  let curadorDestino;janela.location.replace=url=>{curadorDestino=url;};router.navegar('#/curador');assert.equal(curadorDestino,'curador.html#/curador');
  const html=fs.readFileSync('public/index.html','utf8');
  assert.equal((html.match(/data-tela="/g)||[]).length,5);
  assert.equal((html.match(/data-nav="/g)||[]).length,5);
  assert.match(html,/data-nav-badge hidden/);
  assert.match(fs.readFileSync('public/sw.js','utf8'),/prefixo \+ 'v63'/);
  assert.match(fs.readFileSync('public/app.js','utf8'),/EcoaRouter\?\.abrirBusca/);
  assert.match(fs.readFileSync('public/cidade-ui.js','utf8'),/invalidateSize/);
  console.log('OK Rotas: cinco telas, abas/teclado, foco, títulos, Voltar/Avançar, desconhecidas, 17 guias, ações compartilhadas antigas/novas, badge e conservação dos nós');
}
validarRotasFase1();

function validarDesafioSalvoFase1(){
  const {runInNewContext}=require('node:vm'),fs=require('node:fs'),api=require('./public/desafio');
  const salvo={versao:1,ods:6,inicio:api.dataLocalDesafio(),dias:[true,false,false,false,false,false,false]};
  const texto=JSON.stringify(salvo);let escritas=0;const elementos=new Map();
  const criar=()=>({value:'',children:[],dataset:{},eventos:{},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},add(){},addEventListener(k,f){this.eventos[k]=f;},focus(){}});
  const el=id=>{if(!elementos.has(id))elementos.set(id,criar());return elementos.get(id);};
  const ctx={...api,objetivos,acoes,praticasOds:objetivos.map(n=>[n,'Passo 1','Passo 2','Registro']),Option:function(){},setInterval(){},
    document:{querySelector:el,createElement:criar,addEventListener(){}},localStorage:{getItem(k){assert.equal(k,'ecoa-desafio-v1');return texto;},setItem(){escritas++;}}};
  runInNewContext(fs.readFileSync('public/desafio-ui.js','utf8'),ctx);
  assert.equal(el('#desafio-dias').children.length,7);assert.equal(el('#desafio-dias').children[0].children[3].children[0].checked,true);
  assert.equal(el('#desafio-ods').value,6);assert.equal(escritas,0);
  assert.deepEqual(JSON.parse(runInNewContext('JSON.stringify(desafioAtual)',ctx)),salvo);
  assert.match(el('#desafio-resumo').textContent,/Sequência atual: 1 dia\./);
  runInNewContext("desafioAtual.inicio=dataLocalDesafio(new Date(Date.now()-86400000));desafioAtual.dias[1]=true;renderizarDesafio();",ctx);
  assert.match(el('#desafio-resumo').textContent,/Sequência atual: 2 dias\./);
  assert.equal(escritas,0);
  console.log('OK Persistência: desafio anterior reaparece com sete dias, ODS e conclusão preservados, sem regravação; singular de dia');
}
validarDesafioSalvoFase1();

async function validarInicioFase2(){
  const {renderizarResumoInicio,iniciarInicio}=require('./public/inicio');
  const {calcularProgressoPlano}=require('./public/progresso');
  const fs=require('node:fs'),{runInNewContext}=require('node:vm');
  const elementos=new Map(),eventos={};
  const criar=()=>({children:[],eventos:{},style:{},dataset:{},hidden:false,textContent:'',value:'',
    append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=xs;},
    setAttribute(k,v){this[k]=v;},addEventListener(k,f){this.eventos[k]=f;},focus(){}});
  const el=id=>{if(!elementos.has(id))elementos.set(id,criar());return elementos.get(id);};
  const doc={getElementById:id=>el('#'+id),querySelector:el,querySelectorAll:()=>[],createElement:criar,
    addEventListener(k,f){(eventos[k]??=[]).push(f);}};
  const chave=a=>a.ods+':'+a.titulo;
  let mapa=new Map(),leituras=0;
  const ui=iniciarInicio(doc,()=>{leituras++;return calcularProgressoPlano(mapa,acoes);});
  assert.equal(el('#inicio-progresso').hidden,true);
  assert.equal(el('#inicio-barra').value,0);assert.equal(el('#inicio-barra').max,1);
  mapa=new Map([[chave(acoes[0]),false]]);ui.atualizar();
  assert.equal(el('#inicio-progresso').hidden,false);assert.equal(el('#inicio-pendentes').textContent,'1');
  assert.match(el('#inicio-progresso-texto').textContent,/0 de 1 ação concluída/);
  mapa.set(chave(acoes[0]),true);ui.atualizar();
  assert.equal(el('#inicio-barra').value,1);assert.match(el('#inicio-progresso-texto').textContent,/^1 ação concluída\./);
  mapa.set(chave(acoes[1]),true);ui.atualizar();
  assert.equal(el('#inicio-ods').textContent,'2');assert.match(el('#inicio-progresso-texto').textContent,/^2 ações concluídas\./);
  const antes=leituras;eventos['ecoa-rota'][0]({detail:{tela:'agir'}});assert.equal(leituras,antes);
  mapa.clear();eventos['ecoa-rota'][0]({detail:{tela:'inicio'}});assert.equal(leituras,antes+1);assert.equal(el('#inicio-progresso').hidden,true);
  assert.equal(el('#inicio-progresso-texto').textContent,'');assert.equal(el('#inicio-barra').value,0);
  renderizarResumoInicio(doc,calcularProgressoPlano(new Map([[chave(acoes[0]),true],['desconhecido',true]]),acoes));
  assert.equal(el('#inicio-concluidas').textContent,'1');
  // Integração: restaura a chave antiga e usa os próprios eventos de Meu plano.
  let escritas=0,armazenado=JSON.stringify({[chave(acoes[0])]:true});
  const eventosJanela={};
  const ctx={document:doc,acoes,objetivos,encontradas:[acoes[1]],indice:0,
    localStorage:{getItem(){return armazenado;},setItem(k,v){assert.equal(k,'oqdpf-plano-v1');armazenado=v;escritas++;}},
    window:{addEventListener(k,f){eventosJanela[k]=f;}},...require('./public/plano-json')};
  runInNewContext(['progresso.js','plano.js','inicio.js'].map(f=>fs.readFileSync('public/'+f,'utf8')).join('\n'),ctx);
  assert.equal(escritas,0);assert.equal(el('#inicio-concluidas').textContent,'1');
  el('#salvar-acao').eventos.click();assert.equal(el('#inicio-pendentes').textContent,'1');assert.equal(el('#inicio-barra').max,2);
  const caixa=el('#plano-lista').children[1].children[0].children[0];caixa.checked=true;caixa.eventos.change();
  assert.equal(el('#inicio-concluidas').textContent,'2');assert.equal(el('#inicio-pendentes').textContent,'0');
  el('#plano-lista').children[1].children[1].eventos.click();assert.equal(el('#inicio-concluidas').textContent,'1');
  const backup=require('./public/plano-json').exportarPlanoJson(new Map([[chave(acoes[2]),false]]),acoes);
  el('#arquivo-plano').files=[{name:'antigo.json',size:backup.length,text:async()=>backup}];
  await el('#arquivo-plano').eventos.change();assert.equal(el('#inicio-pendentes').textContent,'1');assert.equal(el('#inicio-concluidas').textContent,'1');
  const escritasAntes=escritas;
  eventosJanela.storage({key:'oqdpf-plano-v1',newValue:'{}'});
  assert.equal(el('#inicio-progresso').hidden,true);assert.equal(escritas,escritasAntes);
  const html=fs.readFileSync('public/index.html','utf8');
  const home=html.slice(html.indexOf('<section id="inicio"'),html.indexOf('<section class="wrap tela"'));
  for(const [texto,rota] of [['Encontrar uma ação','#/agir'],['Quero uma ação agora','#/agir'],['Quero entender os ODS','#/aprender'],['Quero me desafiar','#/meu-espaco/desafio']]){
    assert.ok([...home.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].some(m=>m[1]===rota&&m[2].includes(texto)),texto);
  }
  assert.match(home,/aria-labelledby="tela-inicio-titulo"/);
  assert.match(home,/<label[^>]*for="inicio-barra"/);
  assert.ok(!home.includes('<form'));assert.ok(!home.includes('<img'));
  console.log('OK Início: CTAs/rotas, resumo vazio, singular/plural, progresso, plano legado sem gravação, salvar/concluir/remover/importar e atualização de outra aba (DOM simulado)');
}
validarInicioFase2().catch(e=>{console.error(e);process.exitCode=1;});


function validarIndicadorAtividades() {
  const {resumirAtividadesEcoa, iniciarAtividadesEcoa}=require('./public/atividades');
  const {novoDesafio,concluirDiaDesafio}=require('./public/desafio');
  const hoje='2026-11-12', desafio=novoDesafio(6,hoje);
  assert.equal(resumirAtividadesEcoa(0,null,hoje).visivel,false);
  assert.equal(resumirAtividadesEcoa(1,null,hoje).texto,'1 ação pendente');
  assert.equal(resumirAtividadesEcoa(2,desafio,hoje).texto,'2 ações pendentes e desafio de hoje disponível');
  assert.equal(resumirAtividadesEcoa(0,concluirDiaDesafio(desafio,hoje,true),hoje).visivel,false);
  assert.equal(resumirAtividadesEcoa(0,desafio,'2026-11-11').visivel,false);
  assert.equal(resumirAtividadesEcoa(0,desafio,'2026-11-19').visivel,false);
  assert.equal(resumirAtividadesEcoa(0,{},hoje).visivel,false);
  let estado={pendentes:1,desafio:null,hoje};
  const texto={textContent:''},badge={hidden:true,parentElement:{title:''},querySelector:()=>texto};
  const ui=iniciarAtividadesEcoa({querySelectorAll:()=>[badge]},()=>estado);
  assert.equal(badge.hidden,false);assert.match(texto.textContent,/1 ação pendente/);
  estado={pendentes:0,desafio:null,hoje};ui.atualizar();
  assert.equal(badge.hidden,true);assert.equal(texto.textContent,'');
  assert.equal(badge.parentElement.title,'Meu espaço');
  console.log('OK Indicador: plano pendente, desafio de hoje, conclusão, dias futuros/encerrados, dados inválidos e rótulo acessível');
}
validarIndicadorAtividades();

function validarBuscaGuias() {
 const {normalizarBuscaGuia,encontrarGuias,iniciarBuscaGuias}=require('./public/aprender');
 assert.equal(normalizarBuscaGuia(' ÁGUA '),'agua');
 assert.deepEqual(encontrarGuias(objetivos,'ODS 6'),[6]);
 assert.deepEqual(encontrarGuias(objetivos,'1'),[1]);
 assert.deepEqual(encontrarGuias(objetivos,'EDUCACAO'),[4]);
 assert.deepEqual(encontrarGuias(objetivos,'água'),[6,14]);
 assert.equal(encontrarGuias(objetivos,'').length,17);
 assert.deepEqual(encontrarGuias(objetivos,'ODS 18'),[]);
 assert.deepEqual(encontrarGuias(objetivos,'<img onerror=alert(1)>'),[]);
 const els=new Map(),el=id=>{if(!els.has(id))els.set(id,{value:'',eventos:{},addEventListener(n,fn){this.eventos[n]=fn;},focus(){this.focado=true;}});return els.get(id);};
 const cards=objetivos.map((_,i)=>({dataset:{ods:String(i+1)},hidden:false}));
 const ui=iniciarBuscaGuias({getElementById:el,querySelectorAll:()=>cards},objetivos);
 const campo=el('buscar-ods-guia');assert.equal(el('limpar-busca-guias').hidden,true);campo.value='ODS 6';campo.eventos.input();
 assert.equal(el('limpar-busca-guias').hidden,false);assert.equal(cards.filter(c=>!c.hidden).length,1);assert.equal(cards[5].hidden,false);
 assert.equal(el('guias-contagem').textContent,'1 objetivo encontrado');
 campo.value='inexistente';ui.atualizar();assert.equal(el('guias-vazio').hidden,false);
 el('guias-mostrar-todos').eventos.click();assert.equal(campo.value,'');assert.equal(el('limpar-busca-guias').hidden,true);assert.equal(campo.focado,true);assert.equal(cards.filter(c=>!c.hidden).length,17);
 campo.value='água';ui.atualizar();el('limpar-busca-guias').eventos.click();assert.equal(el('guias-vazio').hidden,true);
 console.log('OK Aprender: busca sem acentos/caixa, número exato, termos, vazio, limpeza, foco e cartões preservados');
}
validarBuscaGuias();

async function validarPontosAutomaticos() {
 const api=require('./public/pontos-osm');
 const {iniciarPontosOSM}=require('./public/pontos-osm-ui');
 const b=[-23.56,-46.65,-23.55,-46.64];
 for(const [cat,d] of Object.entries(api.categoriasOSM)){
   const q=api.montarConsultaOSM(cat,b);for(const [k,v] of d.tags)assert.ok(q.includes(`["${k}"="${v}"]`));
   assert.match(q,/out center tags 200;/);assert.match(q,/Ecoa/);assert.ok(q.includes(b.join(',')));
 }
 assert.throws(()=>api.montarConsultaOSM('injetado',b));assert.throws(()=>api.montarConsultaOSM('agua',[-90,-180,90,180]));
 const dados={elements:[{type:'node',id:1,lat:-23.555,lon:-46.645,tags:{name:'<img src=x onerror=alert(1)>','addr:street':'Rua A'}},{type:'way',id:2,center:{lat:-23.5551,lon:-46.645},tags:{name:'Praça Água'}},{type:'relation',id:3,center:{lat:-23.555,lon:-46.645},tags:{name:'Praça Agua'}}]};
 const ps=api.converterPontosOSM(dados,'verde');assert.equal(ps.length,3);assert.equal(ps[0].nome,dados.elements[0].tags.name);
 assert.deepEqual(api.converterPontosOSM({elements:[]},'agua'),[]);assert.throws(()=>api.converterPontosOSM({remark:'timeout',elements:[]},'agua'));
 const fixo={...ps[1],id:'curado',origem:'fixo',dataVerificacao:'2026-01-01'};
 assert.equal(api.validarFixosOSM([fixo,{...fixo,exemplo:true},{...fixo,dataVerificacao:'2026-99-99'}]).length,1);
 assert.equal(api.mesclarPontosOSM([fixo],ps).length,2);assert.equal(api.mesclarPontosOSM([fixo],ps)[0].id,'curado');
 assert.equal(api.mesclarPontosOSM([],Array.from({length:210},(_,i)=>({...ps[0],id:String(i),nome:String(i),latitude:i/1000}))).length,200);
 let chamadas=0,mem='',tempo=1000;const storage={getItem:()=>mem,setItem:(k,v)=>{mem=v;}};
 const resposta=()=>({ok:true,json:async()=>dados});const cliente=api.criarClienteOSM({fetcher:async()=>{chamadas++;return resposta();},storage,agora:()=>tempo});
 await cliente.consultar('verde',b);await cliente.consultar('verde',b);assert.equal(chamadas,1);
 await api.criarClienteOSM({fetcher:()=>{throw Error('não deve chamar');},storage,agora:()=>tempo}).consultar('verde',b);
 tempo+=900001;await cliente.consultar('verde',b);assert.equal(chamadas,2);
 const abort=new AbortController();abort.abort();await assert.rejects(cliente.consultar('verde',b,{signal:abort.signal}),{name:'AbortError'});
 for(const status of [429,504]){
   const urls=[],esperas=[];let now=1000;
   const c=api.criarClienteOSM({servidores:['a','b'],agora:()=>now,esperar:async ms=>{esperas.push(ms);now+=ms;},fetcher:async url=>{urls.push(url);return urls.length===1?{ok:false,status,headers:{get:()=> '45'}}:resposta();}});
   await c.consultar('verde',b);assert.deepEqual(urls,['a','b']);assert.deepEqual(esperas,[45000]);
 }
 const erro=api.criarClienteOSM({servidores:['a','b'],esperar:async()=>{},fetcher:async()=>{throw Error('Sem rede');}});await assert.rejects(erro.consultar('agua',b),/Sem rede/);
 let tempoDebounce=0,id=0,tarefas=new Map(),resolvers=[],sinais=[],resultados=[],estados=[];
 const relogio={setTimeout(fn,ms){const k=++id;tarefas.set(k,{fn,em:tempoDebounce+ms});return k;},clearTimeout(k){tarefas.delete(k);}};
 const avancar=async ms=>{tempoDebounce+=ms;for(const [k,t] of [...tarefas])if(t.em<=tempoDebounce){tarefas.delete(k);t.fn();}await Promise.resolve();await Promise.resolve();};
 const busca=api.criarBuscaOSM({relogio,consultar:(c,b,{signal})=>{sinais.push(signal);return new Promise(r=>resolvers.push(r));},receber:p=>resultados.push(p),estado:t=>estados.push(t)});
 busca.agendar('',b,15);await avancar(1000);assert.equal(sinais.length,0);
 busca.agendar('agua',b,12);assert.match(estados.at(-1),/Aproxime/);
 busca.agendar('agua',b,15);await avancar(599);assert.equal(sinais.length,0);busca.agendar('verde',b,15);await avancar(600);assert.equal(sinais.length,1);
 busca.agendar('agua',b,15);assert.ok(sinais[0].aborted);await avancar(600);resolvers[0](ps);await avancar(0);assert.notDeepEqual(resultados.at(-1),ps);resolvers[1]([]);await avancar(0);assert.deepEqual(resultados.at(-1),[]);assert.match(estados.at(-1),/Nenhum/);

 // DOM simulado: conteúdo externo só pode entrar como texto; preservação local, offline e localização opt-in.
 const criar=()=>({children:[],eventos:{},dataset:{},value:'',hidden:false,textContent:'',append(...x){this.children.push(...x);},prepend(...x){this.children.unshift(...x);},replaceChildren(...x){this.children=x;},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){this.eventos[k]=f;},focus(){},scrollIntoView(){},select(){},click(){this.eventos.click?.();},set innerHTML(v){throw Error('HTML externo não permitido');}});
 const els=new Map(),el=id=>{if(!els.has(id))els.set(id,criar());return els.get(id);};
 const chips=Object.keys(api.categoriasOSM).map(c=>{const e=criar();e.dataset.categoriaOsm=c;return e;});const eventos={};let localizacoes=0,consultas=0;
 const ambiente={...relogio,fetch:async()=>({ok:true,json:async()=>[fixo]}),sessionStorage:storage,localStorage:{setItem(){throw Error('Não pode alterar Meus lugares');}},navigator:{onLine:false,geolocation:{getCurrentPosition(ok,erro){localizacoes++;erro();}}},addEventListener:(k,f)=>eventos[k]=f,
  L:{layerGroup:()=>({addTo(){return this;},clearLayers(){}}),divIcon:()=>({}),marker:()=>({addTo(){return this;},on(){},getElement:()=>({isConnected:false})})}};
 const ui=iniciarPontosOSM({getElementById:el,createElement:criar,querySelectorAll:()=>chips,addEventListener:(k,f)=>eventos[k]=f},ambiente,{...api,criarClienteOSM:()=>({consultar:async()=>{consultas++;return ps;}})});
 await ui.pronto;
 ui.conectar({on(){},getZoom:()=>15,getBounds:()=>({getSouth:()=>-23.56,getWest:()=>-46.65,getNorth:()=>-23.55,getEast:()=>-46.64})});
 await avancar(0);await avancar(0);chips[3].click();assert.equal(consultas,0);assert.equal(el('osm-lista').children.length,1);assert.match(el('osm-status').textContent,/Mostrando pontos salvos/);assert.equal(localizacoes,0);
 el('osm-perto').click();assert.equal(localizacoes,1);assert.equal(el('osm-perto').disabled,false);
 const texto=JSON.stringify(el('osm-lista').children);assert.match(texto,/Verificado pelo Ecoa/);assert.match(texto,/Verificado em 01\/01\/2026/);
 ambiente.navigator.onLine=true;
 ui.atualizar({forcar:true});
 await avancar(600);assert.equal(consultas,1);assert.ok(el('osm-lista').children.length>=2);assert.ok(JSON.stringify(el('osm-lista').children).includes('<img src=x onerror=alert(1)>'));
 const comRede=el('osm-lista').children.length;
 ambiente.navigator.onLine=false;eventos.offline();assert.equal(el('osm-lista').children.length,comRede);assert.match(el('osm-status').textContent,/Mostrando pontos salvos/);

  // Clique no pin abre um unico cartao; descricao externa entra como texto, nunca como HTML.
  const nosCartao=new Map();
  const criarCartao=tag=>({tagName:tag,children:[],attrs:{},dataset:{},eventos:{},value:'',hidden:false,textContent:'',
   append(...xs){this.children.push(...xs);},prepend(...xs){this.children.unshift(...xs);},replaceChildren(...xs){this.children=xs;},
   setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){this.eventos[k]=f;},focus(){this.focado=true;},
   click(){this.eventos.click?.();},set innerHTML(v){throw Error('HTML externo nao permitido');}});
  const elCartao=id=>{if(!nosCartao.has(id))nosCartao.set(id,criarCartao('div'));return nosCartao.get(id);};
  const chipsCartao=['','horta'].map(c=>{const e=criarCartao('button');e.dataset.categoriaOsm=c;return e;});
  const eventosCartao={};let clicarMarcador,focoMarcador=false;
  const elementoMarcador={isConnected:true,focus(){focoMarcador=true;}};
  const marcador={on(nome,fn){if(nome==='click')clicarMarcador=fn;return this;},addTo(){return this;},getElement:()=>elementoMarcador};
  const camadaFake={addTo(){return this;},clearLayers(){}};
  const mapaCartao={getBounds:()=>({getSouth:()=>-24.02,getWest:()=>-48.36,getNorth:()=>-24,getEast:()=>-48.34}),
   getZoom:()=>15,on(){},setView(){return this;},getCenter:()=>({lat:-24.01,lng:-48.35})};
  const pontoCartao={id:'osm-carregado',nome:'Horta',categoria:'horta',descricao:'<img src=x onerror=alert(1)>',
   latitude:-24.01,longitude:-48.35,origem:'osm'};
  let salvouPonto=null,navegouPlano=null;
  const ambienteCartao={fetch:async()=>({ok:true,json:async()=>({versao:1,categorias:{}})}),
   sessionStorage:storage,localStorage:{setItem(){throw Error('Nao pode alterar Meus lugares');}},navigator:{onLine:true},
   setTimeout:fn=>{fn();return 1;},clearTimeout(){},
   addEventListener(){},L:{layerGroup:()=>camadaFake,divIcon:()=>({}),marker:()=>marcador},
   EcoaAcoesPontos:require('./public/acoes-pontos'),
   EcoaPlanoPontos:{contemAcaoPlano:()=>false,salvarAcaoDoPonto:(acao,ponto)=>{salvouPonto={titulo:acao.titulo,id:ponto.id};return {salva:true};}},
    EcoaRouter:{navegar:destino=>{navegouPlano=destino;}}};
  const docCartao={getElementById:elCartao,createElement:criarCartao,querySelectorAll:()=>chipsCartao,activeElement:null,
   addEventListener:(k,f)=>{eventosCartao[k]=f;}};
  const uiCartao=iniciarPontosOSM(docCartao,ambienteCartao,{...api,
   criarClienteOSM:()=>({consultar:async()=>[pontoCartao],consultarComLimite:async()=>({pontos:[],limiteAtingido:false}),cidades:async()=>[]})});
  eventosCartao['ecoa-rota']({detail:{tela:'na-cidade'}});
  await uiCartao.pronto;chipsCartao[1].click();uiCartao.conectar(mapaCartao);
  await new Promise(r=>setTimeout(r,0));
  assert.equal(typeof clicarMarcador,'function');
  clicarMarcador();
  const conteudo=elCartao('ponto-cartao-conteudo');
  const temImg=nos=>nos.some(n=>n.tagName==='img'||temImg(n.children||[]));
  assert.equal(elCartao('ponto-cartao').hidden,false);assert.equal(elCartao('ponto-cartao-titulo').textContent,'Horta');
  assert.equal(temImg(conteudo.children),false);assert.ok(JSON.stringify(conteudo.children).includes('<img src=x onerror=alert(1)>'));
  const textoCartao=JSON.stringify(conteudo.children);
  for(const trecho of ['O que é este lugar','O que fazer aqui?','Ação sugerida pelo Ecoa','Como fazer','ODS relacionados','Antes de ir','Salvar ação no meu plano','Como chegar','não certificação da ONU']){
   assert.ok(textoCartao.includes(trecho),trecho);
  }
  const nosCartaoPlano=(nos)=>nos.flatMap(n=>[n,...nosCartaoPlano(n.children||[])]);
  assert.ok(nosCartaoPlano(conteudo.children).some(n=>n.tagName==='a'&&n.href==='#/aprender/ods-15'));
  const etapas=nosCartaoPlano(conteudo.children).find(n=>n.className==='ponto-etapas');
  assert.ok(etapas&&etapas.children.length>0&&etapas.children.length<=3);
  const botaoSalvar=nosCartaoPlano(conteudo.children).find(n=>n.tagName==='button'&&n.textContent==='Salvar ação no meu plano');
  assert.ok(botaoSalvar,'botão de salvar ação existe');
  botaoSalvar.eventos.click();
  assert.deepEqual(salvouPonto,{titulo:'Observe a vegetação do seu bairro',id:'osm-carregado'});
  assert.equal(botaoSalvar.textContent,'Ver no meu plano');
  botaoSalvar.eventos.click();
  assert.equal(navegouPlano,'#/meu-espaco','botão Ver no meu plano abre o plano');
  assert.equal(elCartao('ponto-cartao').children.length,0,'cartao e um unico painel de conteudo');
  eventosCartao.keydown({key:'Escape',preventDefault(){}});
  assert.equal(elCartao('ponto-cartao').hidden,true);assert.equal(focoMarcador,true);
 console.log('OK Pontos OSM: consultas por categoria, limite, cache de sessão/TTL, 429/504 e mirrors, debounce 600ms, cancelamento, resposta tardia/vazia, mesclagem, datas, offline e localização opt-in');
}
validarPontosAutomaticos().catch(e=>{console.error(e);process.exitCode=1;});

function validarRefinamentoA(){
 const fs=require('node:fs');
 for(const arquivo of ['public/index.html','public/sobre.html']){
  const html=fs.readFileSync(arquivo,'utf8');
  const visivel=html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,'');
  assert.doesNotMatch(visivel,/json/i);
 }
 const h=fs.readFileSync('public/index.html','utf8');
 assert.equal((h.match(/<button[^>]*>Salvar lugar só para mim<\/button>/g)||[]).length,0);
 assert.doesNotMatch(h,/id="cidade-cadastro"/);
 assert.match(h,/id="baixar-plano"[^>]*aria-describedby="plano-pdf-ajuda"/);
 assert.match(h,/id="lembrete-salvar"[^>]*aria-describedby="lembrete-salvar-ajuda"/);
 assert.match(h,/id="lembrete-data-ajuda"/);
 for(const texto of ['{','{}',JSON.stringify({projeto:'oqdpf',versao:1,acoes:[{chave:'x',concluida:'sim'}]})]){
  try{require('./public/plano-json').validarPlanoJson(texto,acoes);assert.fail('Deveria rejeitar');}catch(e){assert.doesNotMatch(e.message,/json|true ou false/i);}
 }
 console.log('OK Fase A: cópias sem jargão, entrada única para adicionar ponto, textos-guia e motivos acessíveis');
}
validarRefinamentoA();

function validarEstruturaB(){
 const fs=require('node:fs');const html=fs.readFileSync('public/index.html','utf8');
 assert.match(html,/<button type="submit" form="filtros">Encontrar uma ação/);
 assert.match(html,/id="espaco-abas" role="tablist"/);
 for(const nome of ['plano','desafio','conquistas','configuracoes'])assert.match(html,new RegExp('id="espaco-tab-'+nome+'" role="tab"'));
 assert.equal((html.match(/id="leitura-painel"/g)||[]).length,1);
 assert.ok(html.indexOf('id="leitura-painel"')<html.indexOf('</header>'));
 assert.ok(html.indexOf('id="quiz"')<html.indexOf('id="cartoes-guias"'));
 let focou=false,valor,observer;const eventos={},cliques={};
 const gatilho={focus(){focou=true;}},painel={open:true,querySelector:()=>gatilho,contains:e=>e==='dentro',addEventListener(k,f){eventos[k]=f;}};
 const doc={getElementById:()=>painel,querySelector:()=>({getBoundingClientRect:()=>({height:100.5})}),addEventListener(k,f){cliques[k]=f;},documentElement:{style:{setProperty(k,v){valor=v;}}}};
 const janela={ResizeObserver:class{constructor(f){observer=f;}observe(){}}};
 require('./public/estrutura').iniciarEstruturaEcoa(doc,janela);assert.equal(valor,'101px');observer();
 cliques.click({target:'dentro'});assert.equal(painel.open,true);
 eventos.keydown({key:'Escape',preventDefault(){}});assert.equal(painel.open,false);assert.equal(focou,true);
 painel.open=true;cliques.click({target:'fora'});assert.equal(painel.open,false);
 painel.open=true;cliques['ecoa-rota']({detail:{alvo:'preferencia-tema'}});assert.equal(painel.open,true);
 cliques['ecoa-rota']({detail:{}});assert.equal(painel.open,false);
 console.log('OK Fase B: abas e formulários preservados, Aa no cabeçalho/Escape/clique fora, barra adaptada à navegação, mapa só ao entrar e busca condicional');
}
validarEstruturaB();

async function validarRotinaD(){
 const {escolherAcaoDoDia,iniciarAcaoDiaria,iniciarGradeDesafio,iniciarInstalacaoEcoa}=require('./public/rotina');
 const data=new Date(2026,10,19,1),fim=new Date(2026,10,19,23,59);
 assert.equal(escolherAcaoDoDia(acoes,data),escolherAcaoDoDia(acoes,fim));
 assert.notEqual(escolherAcaoDoDia(acoes,data),escolherAcaoDoDia(acoes,new Date(2026,10,20)));
 assert.equal(escolherAcaoDoDia([],data),null);assert.equal(escolherAcaoDoDia(acoes,new Date('x')),null);
 const criar=()=>({children:[],eventos:{},hidden:false,value:'1',textContent:'',setAttribute(k,v){this[k]=v;},append(...v){this.children.push(...v);},addEventListener(k,f){this.eventos[k]=f;}});
 const els=new Map(),el=id=>{if(!els.has(id))els.set(id,criar());return els.get(id);};
 const eventos={},doc={getElementById:el,createElement:criar,addEventListener(k,f){eventos[k]=f;}};
 let hoje=data;iniciarAcaoDiaria(doc,acoes,()=>hoje);const primeiro=el('acao-dia-link').href;
 assert.equal(require('./public/compartilhar').acaoDoLink(primeiro,acoes),escolherAcaoDoDia(acoes,data));
 hoje=new Date(2026,10,20);eventos.visibilitychange();assert.notEqual(el('acao-dia-link').href,primeiro);
 iniciarGradeDesafio(doc,objetivos);assert.equal(el('desafio-grade').children.length,17);
 const botoes=el('desafio-grade').children;botoes[5].eventos.click();assert.equal(el('desafio-ods').value,'6');
 assert.equal(botoes.filter(b=>b['aria-pressed']==='true').length,1);assert.equal(botoes[5]['aria-pressed'],'true');
 assert.equal(botoes[5].children[0].src,'ods/6.webp');assert.match(botoes[5]['aria-label'],/ODS 6/);
 const eventosJanela={},modo={matches:false,addEventListener(k,f){this.change=f;}};
 iniciarInstalacaoEcoa(doc,{navigator:{},matchMedia:()=>modo,addEventListener(k,f){eventosJanela[k]=f;}});
 await el('instalar-ecoa').eventos.click();assert.match(el('instalacao-ajuda').textContent,/Safari/);
 let prompts=0;eventosJanela.beforeinstallprompt({preventDefault(){},async prompt(){prompts++;},userChoice:Promise.resolve({outcome:'dismissed'})});
 assert.equal(prompts,0);await el('instalar-ecoa').eventos.click();assert.equal(prompts,1);assert.match(el('instalacao-ajuda').textContent,/Tudo bem/);
 await el('instalar-ecoa').eventos.click();assert.equal(prompts,1);
 eventosJanela.beforeinstallprompt({preventDefault(){},async prompt(){throw Error('falha');}});
 await el('instalar-ecoa').eventos.click();assert.equal(el('instalar-ecoa').disabled,false);assert.match(el('instalacao-ajuda').textContent,/Não foi possível/);
 eventosJanela.appinstalled();assert.equal(el('instalar-ecoa').hidden,true);
 modo.matches=true;modo.change();assert.match(el('instalacao-ajuda').textContent,/como aplicativo/);
 console.log('OK Fase D: data local, virada do dia, link da ação, grade de 17 ODS, seleção, instalação opt-in, recusa, falha e standalone');
}
validarRotinaD().catch(e=>{console.error(e);process.exitCode=1;});


function validarLimpezaFase1(){
 const fs=require('node:fs'),html=fs.readFileSync('public/index.html','utf8');
 assert.doesNotMatch(html,/Combine os filtros|Escolha um cartão|Como o quiz funciona|<summary>Como funciona|Sobre os lembretes/);
 assert.equal((html.match(/<summary>Saiba mais<\/summary>/g)||[]).length,1);
 const agir=html.split('id="tela-agir"')[1].split('id="tela-aprender"')[0];
 assert.equal((agir.match(/Encontrar uma ação/g)||[]).length,1);
 assert.match(html,/<p class="sr-only" id="guias-contagem"/);
 assert.match(html,/id="espaco-configuracoes"[\s\S]*id="lembrete-ativar"/);
 assert.match(html,/class="atalho-lista-teclado"/);
 assert.doesNotMatch(html,/© OpenStreetMap contributors/);
 assert.match(fs.readFileSync('public/cidade-ui.js','utf8'),/OpenStreetMap/);
 const eventos={},nodes={};
 const el=id=>nodes[id]||(nodes[id]={open:false,addEventListener(k,f,c){this[k]=f;this.capture=c;},showModal(){this.open=true;},close(){this.open=false;}});
 const doc={getElementById:el,addEventListener(k,f){eventos[k]=f;}};
 const ui=require('./public/limpeza').iniciarFolhaFiltros(doc);
 el('abrir-filtros').click();assert.equal(el('folha-filtros').open,true);
 el('filtros').submit();assert.equal(el('folha-filtros').open,false);assert.equal(el('filtros').capture,true);
 el('abrir-filtros').click();el('fechar-filtros').click();assert.equal(el('folha-filtros').open,false);
 el('filtros').invalid();assert.equal(el('folha-filtros').open,true);eventos['ecoa-rota']();assert.equal(el('folha-filtros').open,false);ui.fechar();
 // Referências de acessibilidade apontam para nós existentes após remover textos.
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const m of html.matchAll(/aria-(?:labelledby|describedby|controls)="([^"]+)"/g))for(const id of m[1].split(/\s+/))assert.ok(ids.has(id),id);
 console.log('OK Limpeza Fase 1: folha, fechamento, busca única, ajuda, rótulos e controles preservados');
}
validarLimpezaFase1();

async function validarCorrecoesFase2(){
 const {horarioSugeridoLembrete:h}=require('./public/lembretes-ui');
 const agora=new Date(2026,11,31,23,30);
 assert.equal(h('hora',agora),'2027-01-01T00:30');
 assert.equal(h('amanha',agora),'2027-01-01T09:00');
 assert.equal(h('semana',agora),'2027-01-07T09:00');
 assert.equal(h('amanha',new Date(2028,1,28,18)),'2028-02-29T09:00');
 assert.equal(h('personalizado',agora),'');assert.equal(h('',agora),'');assert.equal(agora.getFullYear(),2026);
 const cfg=require('./public/cidade-config');assert.equal(cfg.categoria,'');assert.ok(cfg.zoom>=13);
 const elementos=new Map(),eventos={},chamadas=[];
 const criar=()=>({dataset:{},children:[],eventos:{},hidden:false,value:'',textContent:'',setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},replaceChildren(){this.children=[];},append(x){this.children.push(x);},addEventListener(k,f){this.eventos[k]=f;},focus(){},click(){this.eventos.click?.();}});
 const el=id=>{if(!elementos.has(id))elementos.set(id,criar());return elementos.get(id);};
 const chips=['','reciclagem','agua'].map(c=>{const e=criar();e.dataset.categoriaOsm=c;e['aria-pressed']=c===''?'true':'false';return e;});
 const api=require('./public/pontos-osm');
 const env={fetch:async()=>({ok:true,json:async()=>[]}),navigator:{onLine:true},addEventListener(){},setTimeout:fn=>{fn();return 1;},clearTimeout(){},L:{layerGroup:()=>({addTo(){return this;},clearLayers(){}})}};
 const ui=require('./public/pontos-osm-ui').iniciarPontosOSM({getElementById:el,createElement:criar,querySelectorAll:()=>chips,addEventListener(k,f){eventos[k]=f;}},env,{...api,criarClienteOSM:()=>({consultar(...args){chamadas.push(args);return [];}})});
 assert.equal(chips[0]['aria-pressed'],'true');assert.equal(chips[1]['aria-pressed'],'false');assert.equal(chamadas.length,0);
 await ui.pronto;eventos['ecoa-rota']({detail:{tela:'na-cidade'}});
 ui.conectar({on(){},getZoom:()=>14,getBounds:()=>({getSouth:()=>-24.02,getWest:()=>-48.36,getNorth:()=>-24,getEast:()=>-48.34})});
 assert.equal(chamadas.length,0);
 chips[1].click();assert.equal(chamadas.length,1);assert.equal(chamadas[0][0],'reciclagem');
 eventos['ecoa-rota']({detail:{tela:'inicio'}});ui.atualizar();assert.equal(chamadas.length,1);
 console.log('OK Fase 2: datas locais, todos os tipos por padrão, Overpass só como complemento e consulta só na tela');
}
validarCorrecoesFase2();

function validarPolimentoFase3(){
 const fs=require('node:fs'),html=fs.readFileSync('public/index.html','utf8');
 const css=fs.readFileSync('public/polimento.css','utf8'),tokens=fs.readFileSync('public/design-system.css','utf8');
 for(let ods=1;ods<=17;ods++){
   assert.ok(css.includes(`[data-ods-cor="${ods}"]`));
   assert.match(tokens,new RegExp(`--ods-${ods}:#[0-9A-F]{6}`));
   const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,{setAttribute(k,v){this[k]=v;}});return nodes.get(id);};
   const doc={getElementById:el,addEventListener(){}};
   const acao={ods,titulo:'Ação teste '+ods,tempo:5,custo:0};
   require('./public/rotina').iniciarAcaoDiaria(doc,[acao],()=>new Date(2026,10,21));
   assert.equal(el('acao-do-dia')['data-ods-cor'],String(ods));
   assert.equal(el('acao-dia-titulo').textContent,acao.titulo);
   assert.ok(el('acao-dia-link').href.includes(encodeURIComponent(ods+':'+acao.titulo)));
 }
 assert.equal((html.match(/class="ilustracao-vazio"/g)||[]).length,4);
 assert.equal((html.match(/class="chip-icone"/g)||[]).length,10);
 for(const svg of html.matchAll(/<svg class="(?:ilustracao-inicio|ilustracao-vazio|chip-icone)"[^>]*>/g)){
   assert.ok(svg[0].includes('aria-hidden="true"'));assert.ok(svg[0].includes('focusable="false"'));
 }
 assert.match(css,/min-height:52px/);assert.match(css,/width:100%/);
 assert.match(css,/\.tela\{min-height:0/);
 assert.match(fs.readFileSync('public/sw.js','utf8'),/'polimento.css'/);
 console.log('OK Fase 3: 17 identidades ODS, links da ação diária, SVGs decorativos, chips e CSS offline');
}
validarPolimentoFase3();

function validarVidaFase4(){
 const {sortearAcaoEcoa:sortear,iniciarVidaEcoa}=require('./public/vida');
 const a={ods:1,titulo:'Uma ação'},b={ods:2,titulo:'Outra ação'};
 assert.equal(sortear([]),null);assert.equal(sortear([a], '1:Uma ação'),a);
 assert.equal(sortear([a,b],'1:Uma ação',()=>0),b);
 assert.equal(sortear([a,b],'',()=>.99),b);
 assert.equal(sortear([a,b],'',()=>NaN),a);
 const eventos={},elementos=new Map();let animadas=0,canceladas=0,fecharTimer,rota,sequencia=1;
 let dados={salvas:2,concluidas:1};
 const el=id=>{if(!elementos.has(id))elementos.set(id,{hidden:false,attrs:{},eventos:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.eventos[k]=f;},animate(){animadas++;return {cancel(){canceladas++;}};}});return elementos.get(id);};
 const media={matches:false,addEventListener(k,f){this.mudar=f;}};
 const doc={getElementById:el,querySelectorAll:()=>[el('animacao')],addEventListener(k,f){eventos[k]=f;}};
 const ambiente={matchMedia:()=>media,setTimeout(f){fecharTimer=f;return 1;},clearTimeout(){},addEventListener(k,f){eventos[k]=f;}};
 const ui=iniciarVidaEcoa(doc,ambiente,{catalogo:[a,b],progresso:()=>dados,sequencia:()=>sequencia,aleatorio:()=>0,abrir:r=>rota=r});
 assert.equal(el('inicio-anel').attrs['aria-valuenow'],'50');assert.equal(el('inicio-anel-traco').attrs['stroke-dasharray'],'50 100');assert.match(el('inicio-sequencia').textContent,/1 dia\./);assert.equal(animadas,0);
 el('surpreenda-me').eventos.click();assert.equal(rota,'#/agir?acao='+encodeURIComponent('1:Uma ação'));
 el('surpreenda-me').eventos.click();assert.equal(rota,'#/agir?acao='+encodeURIComponent('2:Outra ação'));
 dados={salvas:2,concluidas:2};sequencia=2;ui.celebrar(2);
 assert.equal(animadas,1);assert.equal(el('vida-celebracao').hidden,false);assert.equal(el('vida-contador').textContent,'2');assert.match(el('vida-mensagem').textContent,/2 ações concluídas/);assert.equal(el('inicio-anel-valor').textContent,'100%');assert.match(el('inicio-sequencia').textContent,/2 dias/);
 media.matches=true;media.mudar();assert.equal(canceladas,1);
 ui.celebrar(1);assert.equal(animadas,1);assert.match(el('vida-mensagem').textContent,/1 ação concluída/);
 fecharTimer();assert.equal(el('vida-celebracao').hidden,true);
 dados={salvas:2,concluidas:0};ui.atualizar();assert.equal(el('inicio-anel-valor').textContent,'0%');assert.equal(animadas,1);
 dados={salvas:0,concluidas:0};sequencia=null;eventos.storage();assert.equal(el('inicio-anel').hidden,true);assert.match(el('inicio-sequencia').textContent,/indisponível/);
 eventos['ecoa-rota']();assert.equal(el('vida-celebracao').hidden,true);
 const css=require('node:fs').readFileSync('public/vida.css','utf8');assert.match(css,/prefers-reduced-motion:reduce/);
 console.log('OK Fase 4: sorteio sem repetição, anel vazio/parcial/completo, sequência, comemoração e movimento reduzido');
}
validarVidaFase4();

function validarCurador(){
 const c=require('./public/curador'),api=require('./public/pontos-osm'),fs=require('node:fs');
 const base=JSON.parse(fs.readFileSync('public/pontos-fixos.json','utf8'));
 const entrada={nome:'Horta São José',categoria:'horta',descricao:'Horta comunitária',endereco:'Rua A, 10',bairro:'Centro',cidade:'Capão Bonito',UF:'sp',latitude:'-24.01',longitude:'-48.35',horario:'9h às 17h',aceita:'Mudas',telefone:'',site:'https://example.org',fonte:'https://example.org/fonte',dataVerificacao:'2026-01-01'};
 const antes=JSON.stringify(base),r=c.gerarPontosCurador(base,entrada,api,'2026-02-01');
 assert.equal(r.ponto.id,'horta-sao-jose');assert.equal(r.ponto.UF,'SP');assert.equal(r.pontos.length,base.length+1);assert.equal(JSON.stringify(base),antes);
 assert.deepEqual(JSON.parse(r.json),r.pontos);assert.deepEqual(JSON.parse(r.trecho),r.ponto);
 assert.equal(r.pontos.filter(p=>p.exemplo).length,2);
 const idIgual=c.gerarPontosCurador(r.pontos,{...entrada,latitude:-24.1},api,'2026-02-01');assert.equal(idIgual.ponto.id,'horta-sao-jose-2');
 const duplicado=c.gerarPontosCurador(r.pontos,{...entrada,nome:'Horta Sao Jose',latitude:-24.01001},api,'2026-02-01');assert.equal(duplicado.duplicado,true);assert.equal(duplicado.pontos.length,r.pontos.length);
 assert.deepEqual(r.pontos,[...r.pontos].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')||a.id.localeCompare(b.id,'pt-BR')));
 for(const dados of [{nome:''},{descricao:''},{nome:'a'.repeat(121)},{categoria:'invalida'},{latitude:''},{latitude:91},{longitude:Infinity},{UF:'XX'},{fonte:'javascript:alert(1)'},{site:'https://user:pass@example.org'},{dataVerificacao:'2026-02-30'},{dataVerificacao:'2099-01-01'}])assert.throws(()=>c.validarPontoCurador({...entrada,...dados},'2026-02-01'));
 for(const categoria of Object.keys(c.categoriasCurador)){const x=c.gerarPontosCurador(base,{...entrada,categoria},api,'2026-02-01');assert.equal(api.validarFixosOSM(x.pontos).length,1);}
 assert.equal(api.categoriaMapaOSM('horta'),'horta');assert.equal(api.categoriaMapaOSM('outro'),'outro');assert.equal(api.categoriaMapaOSM('verde'),'horta');
 const fixo=api.validarFixosOSM(r.pontos)[0];assert.equal(api.mesclarPontosOSM([fixo],[{...fixo,id:'osm/1',origem:'osm'}]).length,1);
 assert.throws(()=>c.gerarPontosCurador([...base,base[0]],entrada,api));
 const xss='<img src=x onerror=alert(1)>',novo=c.gerarPontosCurador(base,{...entrada,nome:xss,descricao:xss},api,'2026-02-01');
 const criar=tag=>({tag,children:[],append(el){this.children.push(el);},set innerHTML(v){throw Error('HTML inseguro');}});
 const card=criar('article');api.preencherCartaoPonto({createElement:criar},card,{...novo.ponto,origem:'fixo'});
 assert.ok(card.children.some(el=>el.textContent===xss));assert.ok(card.children.every(el=>el.tag!=='img'));assert.ok(card.children.some(el=>el.textContent==='Verificado em 01/01/2026'));
 assert.equal(require('./public/rotas').resolverRotaEcoa('#/curador').tela,'curador');
 const html=fs.readFileSync('public/curador.html','utf8');assert.match(html,/<meta name="robots" content="noindex">/);assert.match(html,/data-autocomplete-endereco/);
 assert.doesNotMatch(fs.readFileSync('public/curador-ui.js','utf8'),/localStorage|sessionStorage|innerHTML/);
 assert.match(fs.readFileSync('public/sw.js','utf8'),/'curador.html'/);
 console.log('OK Curador: JSON completo, exemplos, limites, URLs, IDs únicos, duplicidade, categorias, ordenação, XSS e rota');
}
validarCurador();

async function validarBaseRegional(){
 const api=require('./public/pontos-osm'),fs=require('node:fs');
 const {consultaImportacao,converterImportacao,importar}=await import('./scripts/importar-osm.mjs');
 assert.match(consultaImportacao(25),/around:25000,-24.01,-48.35/);assert.throws(()=>consultaImportacao(101));
 const dados={elements:[{type:'node',id:123,lat:-24.01,lon:-48.35,tags:{name:'Praça',leisure:'park'}}]};
 const base=converterImportacao(dados);assert.equal(base.categorias.horta.length,1);assert.equal(base.categorias.agua.length,0);
 let chamadas=0;await importar({fetcher:async()=>{if(++chamadas===1)throw Error('sem rede');return {ok:true,json:async()=>dados};}});assert.equal(chamadas,2);
 await assert.rejects(importar({fetcher:async()=>{throw Error('sem rede');}}));
 const ps=api.validarBaseOSM(base),fixo={...ps[0],id:'curado',origem:'fixo'};
 assert.equal(api.pontosDisponiveisOSM([fixo],ps,ps,'verde',null).length,1);
 assert.equal(api.pontosDisponiveisOSM([],ps,[],'verde',null).length,1);
 const tarefas=[],estados=[],recebidos=[];
 const busca=api.criarBuscaOSM({consultar:async()=>{throw Error('O servidor demorou para responder');},receber:x=>recebidos.push(x),estado:(t,tipo)=>estados.push([t,tipo]),relogio:{setTimeout:f=>tarefas.push(f),clearTimeout(){}}});
 busca.agendar('verde',[-24.02,-48.36,-24,-48.34],14);await tarefas[0]();
 assert.deepEqual(recebidos,[]);assert.deepEqual(estados.at(-1),['Mostrando pontos salvos','salvos']);
 const html=fs.readFileSync('public/index.html','utf8');assert.doesNotMatch(html,/Meus lugares|Salvar lugar só para mim|Cópia dos meus pontos/);
 assert.equal((html.match(/>Sugerir ao Ecoa<\/button>/g)||[]).length,0);assert.match(html,/class="sr-only" id="cidade-status"/);
 assert.ok(api.validarBaseOSM(JSON.parse(fs.readFileSync('public/pontos-osm.json'))).length>0);
 console.log('OK Base regional: importação, fallback, mesclagem, offline, falha não bloqueante e limpeza');
}
validarBaseRegional().catch(e=>{console.error(e);process.exitCode=1;});

async function validarSupabaseFase1(){
 const api=require('./public/pontos-compartilhados'),osm=require('./public/pontos-osm'),fs=require('node:fs');
 const config={SUPABASE_URL:'https://exemplo.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_teste'};
 const url=api.montarConsultaPontos(config,{cidade:'Capão Bonito',uf:'SP',categoria:'verde',nome:'ÁGUA & x',bbox:[-24.02,-48.36,-24,-48.34]});
 assert.equal(url.searchParams.get('cidade_busca'),'eq.capao bonito');assert.equal(url.searchParams.get('uf'),'eq.SP');assert.equal(url.searchParams.get('categoria'),'eq.horta');assert.equal(url.searchParams.get('nome_busca'),'ilike.*agua & x*');assert.equal(url.searchParams.get('status'),'eq.aprovado');assert.equal(url.searchParams.has('lat'),false);
 const area=api.montarConsultaPontos(config,{bbox:[-24.02,-48.36,-24,-48.34],nome:'%_*'});
 assert.deepEqual(area.searchParams.getAll('lat'),['gte.-24.02','lte.-24']);assert.equal(area.searchParams.has('nome_busca'),false);
 assert.throws(()=>api.montarConsultaPontos(config,{bbox:[NaN,0,1,2]}));assert.throws(()=>api.montarConsultaPontos(config,{categoria:'ataque'}));
 const ponto={id:'a',nome:'<img src=x onerror=alert(1)>',cidade:'Capão Bonito',uf:'SP',categoria:'agua',lat:-24.01,lng:-48.35,status:'aprovado',verificado:true};
 const ps=api.converterPontosCompartilhados([ponto,{...ponto,id:'b',status:'pendente'},{...ponto,id:'c',lat:Infinity},{...ponto,id:'d',lat:'-24'},{...ponto,id:'e',nome:'EXEMPLO FICTÍCIO'}]);assert.equal(ps.length,1);
 assert.equal(api.filtrarPontosCompartilhados(ps,{cidade:'capao bonito',uf:'SP'}).length,1);assert.equal(api.filtrarPontosCompartilhados(ps,{cidade:'Outra'}).length,0);
 const cards=[];const doc={createElement:()=>({children:[],append(){},set textContent(v){cards.push(v);},set innerHTML(v){throw Error('XSS');}})},item={append(){}};
 osm.preencherCartaoPonto(doc,item,ps[0]);assert.ok(cards.includes(ponto.nome));assert.ok(cards.some(t=>t.includes('Verificado')));
 osm.preencherCartaoPonto(doc,item,{...ps[0],verificado:false});assert.ok(cards.some(t=>t.includes('Aprovado pela comunidade')));
 assert.equal(osm.pontosDisponiveisOSM(ps,[{...ps[0],id:'osm-1',origem:'osm'}],[],'agua',null).length,1);
 const requests=[];
 const client=api.criarClientePontosCompartilhados(config,{fetcher:async(u,o)=>{requests.push([u,o]);return {ok:true,json:async()=>String(u).includes('rpc/')?[{cidade:'Capão Bonito',uf:'SP'}]:[ponto]};}});
 assert.equal((await client.consultar({categoria:'agua'})).length,1);assert.equal((await client.cidades()).length,1);
 assert.equal(requests[0][1].headers.apikey,config.SUPABASE_ANON_KEY);assert.equal(requests[0][1].headers.Authorization,undefined);assert.equal(requests[0][1].cache,'no-store');
 await assert.rejects(api.criarClientePontosCompartilhados(config,{fetcher:async()=>({ok:false,status:503})}).consultar({}));
 const abort=new AbortController();abort.abort();await assert.rejects(client.consultar({},{signal:abort.signal}),{name:'AbortError'});
 const sql=fs.readFileSync('supabase/schema.sql','utf8');
 for(const t of ['pontos','denuncias'])assert.ok(sql.includes('alter table public.'+t+' enable row level security'));
 assert.match(sql,/with check\(status='pendente' and verificado=false and denuncias=0\)/);assert.match(sql,/for select to anon using\(status='aprovado'\)/);
 assert.doesNotMatch(sql,/grant\s+(?:all|update|delete)\s+on\s+public\.(?:pontos|denuncias)\s+to\s+anon/i);
 assert.doesNotMatch(sql,/grant\s+insert\s*\([^)]*\)\s+on\s+public\.pontos\s+to\s+anon/i,'anon não pode inserir pontos');
 assert.match(sql,/grant\s+select\s+on\s+public\.pontos\s+to\s+anon/i);
 assert.match(sql,/grant\s+insert\s*\(ponto_id,motivo\)\s+on\s+public\.denuncias\s+to\s+anon/i);
 assert.match(sql,/security invoker/);assert.match(sql,/gin_trgm_ops/);
 const sw=fs.readFileSync('public/sw.js','utf8');assert.match(sw,/'pontos-compartilhados.js'/);assert.match(sw,/pathname.startsWith\('\/rest\/v1\/'\)/);
 console.log('OK Supabase fase 1: consultas, filtros, coordenadas, aprovados, XSS, mesclagem, cancelamento, contrato RLS e API fora do cache SW');
}
validarSupabaseFase1().catch(e=>{console.error(e);process.exitCode=1;});

async function validarIntegracaoBancoMapa(){
 const fs=require('node:fs'),osm=require('./public/pontos-osm'),sup=require('./public/pontos-compartilhados');
 const criar=()=>({children:[],eventos:{},dataset:{},value:'',hidden:false,textContent:'',append(...x){this.children.push(...x);},prepend(...x){this.children.unshift(...x);},replaceChildren(...x){this.children=x;},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){this.eventos[k]=f;},focus(){},scrollIntoView(){(this.scrolls=(this.scrolls||0)+1);},click(){this.eventos.click?.();},set innerHTML(v){throw Error('XSS');}});
 const els=new Map(),el=id=>{if(!els.has(id))els.set(id,criar());return els.get(id);},eventos={};
 const bboxA=[-24.02,-48.36,-24,-48.34],bboxB=[-23.99,-48.87,-23.97,-48.85];
 let bboxAtual=bboxA.slice(),falhar=false,vazio=false,pendente=null;
 const queries=[],handlers={};
  const cidadesBanco=[{cidade:'Capão Bonito',uf:'SP'},{cidade:'Itapetininga',uf:'SP'},{cidade:'Sorocaba',uf:'SP'}];
  const centroCidade={'Capão Bonito':[-24.01,-48.35],'Itapetininga':[-23.49,-48.01],'Sorocaba':[-23.5,-47.26]};
 const pontoEm=(b,id,nome,cidade='',uf='SP')=>({id,bancoId:id,nome,categoria:'agua',cidade,UF:uf,latitude:(b[0]+b[2])/2,longitude:(b[1]+b[3])/2,origem:'supabase',verificado:true});
 const mapa={on(n,f){handlers[n]=f;return this;},getZoom:()=>14,
  getBounds:()=>({getSouth:()=>bboxAtual[0],getWest:()=>bboxAtual[1],getNorth:()=>bboxAtual[2],getEast:()=>bboxAtual[3]}),
  getCenter:()=>({lat:(bboxAtual[0]+bboxAtual[2])/2,lng:(bboxAtual[1]+bboxAtual[3])/2}),
  setView(pos){bboxAtual=[pos[0]-.01,pos[1]-.01,pos[0]+.01,pos[1]+.01];handlers.moveend?.();return this;}};
 const clienteFake={consultarComLimite(filtros){
   queries.push({...filtros,bbox:filtros.bbox?.slice()});
   if(falhar)throw Error('503');
   if(pendente)return new Promise(resolve=>{pendente.resolve=resolve;});
   const c=centroCidade[filtros.cidade]||[0,0];
    const area=filtros.bbox||[c[0]-.01,c[1]-.01,c[0]+.01,c[1]+.01];
    return Promise.resolve({pontos:vazio?[]:[pontoEm(area,'db-'+queries.length,'Ponto '+queries.length+(filtros.cidade?' em '+filtros.cidade:''),filtros.cidade||'',filtros.uf||'SP')],limiteAtingido:false});
  },async cidades(){return cidadesBanco;}};
 const chips=['','agua','reciclagem'].map(c=>{const e=criar();e.dataset.categoriaOsm=c;return e;});
 let callbacks={};
 const env={EcoaMapaInicial:{},EcoaConfig:{},EcoaCompartilhados:{...sup,criarClientePontosCompartilhados:()=>clienteFake},setTimeout:fn=>{fn();return 1;},clearTimeout(){},
  EcoaBuscaCidade:{conectar:cb=>{callbacks=cb;}},fetch:async()=>({ok:true,json:async()=>[]}),navigator:{onLine:true},addEventListener(){},
  L:{layerGroup:()=>({addTo(){return this;},clearLayers(){}}),divIcon:()=>({}),marker:()=>({addTo(){return this;},on(){},getElement:()=>({isConnected:false})})}};
 const doc={getElementById:el,createElement:criar,querySelectorAll:()=>chips,addEventListener:(k,f)=>eventos[k]=f};
 const ui=require('./public/pontos-osm-ui').iniciarPontosOSM(doc,env,{...osm,
  criarClienteOSM:()=>({consultar:async()=>[]}),validarBaseOSM:()=>[],validarFixosOSM:()=>[]});
 const esperar=()=>new Promise(r=>setTimeout(r,650));
 chips[1].click();await ui.pronto;ui.conectar(mapa);await esperar();
 assert.equal(queries.length,1);assert.equal(el('osm-lista').children.length,1);
 assert.match(JSON.stringify(el('osm-lista').children),/Ponto 1/);
  const acoesCartao=el('osm-lista').children[0].children.find(x=>x.className==='buttons ponto-botoes');
  acoesCartao.children.find(b=>b.textContent==='Ver detalhes').click();
  assert.equal(el('ponto-cartao').hidden,false);assert.ok(el('ponto-cartao').scrolls>0);
  el('ponto-cartao-fechar').eventos.click();assert.equal(el('ponto-cartao').hidden,true);

 // Atualizar a mesma área não apaga os pontos enquanto a resposta vem.
 pendente={};ui.atualizar({forcar:true});assert.equal(el('osm-lista').children.length,1);await esperar();
 assert.equal(queries.length,2);pendente.resolve({pontos:[pontoEm(bboxA,'db-2','Ponto 2')],limiteAtingido:false});pendente=null;
 await new Promise(r=>setTimeout(r,0));
 assert.equal(el('osm-lista').children.length,1);
 assert.match(JSON.stringify(el('osm-lista').children),/Ponto 2/);
 assert.doesNotMatch(JSON.stringify(el('osm-lista').children),/Ponto 1/);
 // Arrastar troca o escopo para a nova área visível; a área anterior não fica como filtro oculto.
 bboxAtual=bboxB.slice();handlers.moveend();assert.equal(el('osm-lista').children.length,0);await esperar();
 assert.equal(queries.length,3);assert.deepEqual(queries[2].bbox,bboxB);
 assert.equal(el('osm-lista').children.length,1);
 assert.match(JSON.stringify(el('osm-lista').children),/Ponto 3/);
 // Um moveend sem mudança de área apenas revalida a consulta atual, sem limpar os pontos.
 handlers.moveend();await esperar();assert.equal(queries.length,3);
 ui.atualizar({forcar:true});await esperar();assert.equal(el('osm-lista').children.length,1);
 assert.match(JSON.stringify(el('osm-lista').children),/Ponto 4/);
 // Falha de rede não apaga os pontos disponíveis da região atual.
 const qAntesFalha=queries.length;
 falhar=true;ui.atualizar({forcar:true});await esperar();assert.equal(el('osm-lista').children.length,1);
 assert.match(el('osm-status').textContent,/Mostrando pontos salvos/);
 falhar=false;
 // Resposta vazia válida atualiza somente a fonte/consulta correspondente.
 vazio=true;ui.atualizar({forcar:true});await esperar();assert.equal(el('osm-lista').children.length,0);
 assert.match(el('osm-status').textContent,/Nenhum local encontrado com estes filtros/);
 falhar=true;ui.atualizar({forcar:true});await esperar();assert.equal(el('osm-lista').children.length,0);
 assert.match(el('osm-banco-status').textContent,/Não conseguimos atualizar agora/);assert.equal(el('osm-tentar').hidden,false);
 falhar=false;vazio=false;ui.atualizar({forcar:true});await esperar();assert.equal(el('osm-lista').children.length,1);
 // Trocar cidade consulta por cidade/UF e preserva a categoria escolhida.
 const qAntes=queries.length;
  callbacks.aoEndereco({nome:'Itapetininga',cidade:'Itapetininga',uf:'SP',latitude:-23.49,longitude:-48.01});
  assert.match(el('osm-filtro-ajuda').textContent,/Itapetininga\/SP/);
 await esperar();assert.equal(queries.length,qAntes+1);
  assert.equal(queries.at(-1).cidade,'Itapetininga');assert.equal(queries.at(-1).uf,'SP');
  assert.equal(queries.at(-1).categoria,'agua');assert.equal(queries.at(-1).bbox,undefined);
  assert.match(JSON.stringify(el('osm-lista').children),/em Itapetininga/);
  // Arrastar após escolher cidade troca o escopo para a área visível.
  bboxAtual=bboxA.slice();handlers.moveend();
  assert.doesNotMatch(el('osm-filtro-ajuda').textContent,/Itapetininga\/SP/);
  await esperar();assert.equal(queries.at(-1).cidade,undefined);assert.deepEqual(queries.at(-1).bbox,bboxA);
 // A RPC acrescenta cidades com cadastros aprovados; sem coordenadas, aoCidade não move o mapa.
  assert.deepEqual(await callbacks.buscarCidades('itap'),cidadesBanco.filter(c=>/itap/i.test(c.cidade)));
  const centroAntes=bboxAtual.slice();
  callbacks.aoCidade({cidade:'Sorocaba',uf:'SP'});
  await esperar();assert.equal(queries.at(-1).cidade,'Sorocaba');assert.equal(queries.at(-1).categoria,'agua');
  assert.deepEqual(bboxAtual,centroAntes);assert.match(el('osm-filtro-ajuda').textContent,/Sorocaba\/SP/);
  callbacks.aoEndereco({nome:'Capão Bonito',cidade:'Capão Bonito',uf:'SP',latitude:-24.01,longitude:-48.35});
  await esperar();assert.equal(queries.at(-1).cidade,'Capão Bonito');
  chips[2].click();await esperar();assert.equal(queries.at(-1).categoria,'reciclagem');assert.equal(queries.at(-1).cidade,'Capão Bonito');
  pendente={};callbacks.aoCidade({cidade:'Itapetininga',uf:'SP'});await esperar();
  const antiga=pendente;pendente=null;
  callbacks.aoCidade({cidade:'Sorocaba',uf:'SP'});await esperar();
  antiga.resolve({pontos:[pontoEm([0,0,1,1],'atrasado','Ponto atrasado')],limiteAtingido:false});
  await new Promise(r=>setTimeout(r,0));
  assert.doesNotMatch(JSON.stringify(el('osm-lista').children),/Ponto atrasado/);
  chips[1].click();await esperar();
 // Um ponto buscado permanece visível mesmo se a REST tardia chegar vazia.
 const foco={id:'supabase-foco',bancoId:'foco',nome:'Ponto da busca',categoria:'agua',latitude:-23.49,longitude:-48.01,origem:'supabase',verificado:true};
 pendente={};callbacks.aoPonto(foco);await esperar();
 assert.match(JSON.stringify(el('osm-lista').children),/Ponto da busca/);
 pendente.resolve({pontos:[],limiteAtingido:false});pendente=null;await new Promise(r=>setTimeout(r,0));
 assert.match(JSON.stringify(el('osm-lista').children),/Ponto da busca/);
 // Trocar o tipo afasta o ponto focado que não pertence ao novo filtro.
 chips[2].click();await esperar();
 assert.doesNotMatch(JSON.stringify(el('osm-lista').children),/Ponto da busca/);
 eventos['ecoa-rota']({detail:{tela:'inicio'}});
 const html=fs.readFileSync('public/index.html','utf8');
 assert.doesNotMatch(html,/id="osm-cidade"|id="osm-nome"/);
 console.log('OK Integração banco/mapa: área visível, cidade por nome/UF e pela RPC, categoria preservada, arraste troca escopo sem filtro oculto, vazio válido, falha sem apagar marcadores, resposta tardia e ponto em foco');
}
validarIntegracaoBancoMapa().catch(e=>{console.error(e);process.exitCode=1;});

async function validarCadastroFase2(){
 const c=require('./public/cadastro-pontos'),osm=require('./public/pontos-osm'),fs=require('node:fs');
 const dados={nome:'Praça Água',cidade:'Capão Bonito',uf:'sp',bairro:'Centro',categoria:'agua',endereco:'Rua Pública, 10',descricao:'Bebedouro público',horario:'8h às 18h',aceita:'',telefone:'',site:'',lat:'-24,01',lng:'-48,35',localPublico:true,website_extra:'',status:'aprovado',verificado:true,denuncias:99};
 const p=c.validarCadastroPonto(dados);assert.equal(p.status,'pendente');assert.equal(p.verificado,false);assert.equal(p.denuncias,undefined);assert.equal(p.localPublico,undefined);assert.equal(p.lat,-24.01);assert.equal(p.uf,'SP');
 for(const extra of [{localPublico:false},{website_extra:'spam'},{nome:'x'},{descricao:'a'.repeat(601)},{lat:''},{lat:Infinity},{lat:91},{lng:-181},{uf:'ZZ'},{categoria:'inventada'},{site:'javascript:alert(1)'},{site:'https://a:b@example.org'},{cidade:12}])assert.throws(()=>c.validarCadastroPonto({...dados,...extra}));
 const xss=c.validarCadastroPonto({...dados,nome:'<img src=x onerror=alert(1)>'});assert.equal(xss.nome,'<img src=x onerror=alert(1)>');
 const a={id:'osm-1',nome:'Praca Agua',latitude:-24.0105,longitude:-48.35};assert.equal(c.duplicadosCadastroPonto(p,[a,{...a,nome:'Outro'},{...a,latitude:-25},{...a,exemplo:true}],osm).length,1);
 const mem=new Map([['plano-antigo','preservado']]),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
 for(let i=1;i<=5;i++)assert.equal(c.reservarEnvioPonto(storage,new Date(2026,10,22)),i);
 assert.throws(()=>c.reservarEnvioPonto(storage,new Date(2026,10,22)),/5 envios/);assert.equal(c.reservarEnvioPonto(storage,new Date(2026,10,23)),1);assert.equal(mem.get('plano-antigo'),'preservado');
 assert.throws(()=>c.reservarEnvioPonto({getItem:()=>'{',setItem(){}}),/armazenamento/);
 assert.throws(()=>c.reservarEnvioPonto({getItem:()=>null,setItem(){throw Error();}}),/armazenamento/);
 const config={SUPABASE_URL:'https://teste.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_teste'},requisicoes=[];mem.delete(c.CHAVE_ENVIOS_PONTOS);
 const cli=c.criarEnviosPontos(config,{storage,fetcher:async(u,o)=>{requisicoes.push([u,o]);return {ok:true,status:201};}});
 await cli.cadastrar(dados);assert.equal(requisicoes[0][1].headers.Prefer,'return=minimal');const corpo=JSON.parse(requisicoes[0][1].body);assert.equal(corpo.status,'pendente');assert.equal(corpo.verificado,false);assert.equal(corpo.denuncias,undefined);
 assert.throws(()=>cli.cadastrar({...dados,website_extra:'bot'}));assert.equal(requisicoes.length,1);
 await cli.denunciar('ec0a0000-0000-4000-8000-000000000002','nao_existe');assert.equal(JSON.parse(requisicoes[1][1].body).motivo,'nao_existe');assert.throws(()=>cli.denunciar('osm-1','nao_existe'));assert.throws(()=>c.validarDenunciaPonto('ec0a0000-0000-4000-8000-000000000002','outro'));
 for(const [status,codigo,regex] of [[403,'42501',/permissões/],[404,'PGRST205',/tabela/],[429,'',/Muitos envios/],[400,'23514',/Confira/]]){
  const s={getItem:()=>null,setItem(){}};await assert.rejects(c.criarEnviosPontos(config,{storage:s,fetcher:async()=>({ok:false,status,json:async()=>({code:codigo,message:'<script>não mostrar</script>'})})}).cadastrar(dados),regex);
 }
 await assert.rejects(c.criarEnviosPontos(config,{storage:{getItem:()=>null,setItem(){}},fetcher:async()=>{throw TypeError('network');}}).cadastrar(dados),/conexão/);
 const html=fs.readFileSync('public/index.html','utf8');
 for(const trecho of ['id="cadastro-abrir"','id="cadastro-painel"','cadastro-pontos-ui.js','Marcar um ponto','Enviar ponto','Confirmei a posição deste local'])
  assert.doesNotMatch(html,new RegExp(trecho.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(html,/id="denuncia-dialogo"/);
 assert.match(fs.readFileSync('public/pontos-osm-ui.js','utf8'),/Denunciar este ponto/);
 assert.equal(typeof cli.cadastrar,'function');assert.equal(typeof cli.denunciar,'function');
 const sql=fs.readFileSync('supabase/testar-rls.sql','utf8');assert.match(sql,/set local role anon/);assert.match(sql,/rollback;/);assert.match(sql,/visitante criou aprovado/);assert.match(sql,/UPDATE não foi negado/);assert.match(sql,/DELETE não foi negado/);
 console.log('OK Contrato de envios: cadastro permanece no cliente/API (sem UI pública), pendente forçado, validação, honeypot, quota/data, armazenamento preservado, duplicados 100m, denúncia, erros rede/RLS/tabela e SQL de prova');
}
validarCadastroFase2().catch(e=>{console.error(e);process.exitCode=1;});

async function validarInterfaceDenuncia(){
 const fs=require('node:fs');
 const html=fs.readFileSync('public/index.html','utf8'),fonte=fs.readFileSync('public/pontos-osm-ui.js','utf8');
 assert.match(html,/id="denuncia-dialogo"/);
 assert.match(html,/id="denuncia-motivo"/);
 assert.match(html,/id="denuncia-form"/);
 assert.match(fonte,/Denunciar este ponto/);
 assert.match(fonte,/function denunciarPonto\(/);
 for(const trecho of ['id="cadastro-abrir"','id="cadastro-painel"','cadastro-pontos-ui.js','Marcar um ponto','Enviar ponto','Confirmei a posição deste local'])
  assert.doesNotMatch(html,new RegExp(trecho.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 console.log('OK Interface pública: cadastro removido, denúncia preservada e texto seguro');
}
validarInterfaceDenuncia().catch(e=>{console.error(e);process.exitCode=1;});

async function validarBuscaEnderecoConsulta(){
 const fs=require('node:fs');
 const busca=require('./public/cidade-busca');
 const relogio={setTimeout,clearTimeout};
 const servico=busca.criarServicoBuscaCidade({
  buscarPontos:async termo=>termo==='ponto'?[{id:'p1',nome:'Ponto da busca',categoria:'reciclagem',cidade:'Capão Bonito',UF:'SP'}]:[],
  buscarCidades:async termo=>termo==='ita'?[{cidade:'Itapetininga',uf:'SP'},{cidade:'Itapeva',uf:'SP'},{cidade:'Inválida',uf:'X'}]:[],
  provedorEnderecos:async termo=>termo==='18300000'?[{nome:'Rua A',cidade:'Capão Bonito',uf:'SP',latitude:-24.01,longitude:-48.35,cep:'18300-000'}]:termo==='falha'?Promise.reject(Error('rede')):[],
  criarServico:(p)=>async(termo,opcoes)=>p(termo,opcoes),
  relogio
 });
 const Pontos=await servico.buscar('ponto');
 assert.equal(Pontos[0].tipo,'ponto');assert.equal(Pontos[0].ponto.nome,'Ponto da busca');
 const cidades=await servico.buscar('ita');
 assert.deepEqual(cidades.map(c=>c.nome),['Itapetininga','Itapeva']);
 assert.ok(cidades.every(c=>c.origemCidade===true&&c.endereco));
 const endereco=await servico.buscar('18300000');
 assert.equal(endereco[0].tipo,'endereco');assert.equal(endereco[0].endereco.cep,'18300-000');
 assert.equal(Number.isFinite(endereco[0].endereco.latitude),true);
 assert.deepEqual(await servico.buscar('falha'),[]);
 assert.deepEqual(await servico.buscar('ab'),[]);
 const estados=[];
 const controle=busca.criarControleBuscaCidade({buscar:async()=>[{tipo:'endereco',nome:'Capão Bonito',endereco:{cidade:'Capão Bonito',uf:'SP',origemCidade:true}}],atualizar:(e,i)=>estados.push([e,i.length]),relogio});
 controle.cancelar();await controle.executar('capão bonito');assert.equal(estados.at(-1)[0],'pronto');
 const html=fs.readFileSync('public/index.html','utf8');
 assert.match(html,/placeholder="Busque uma cidade, endereço, CEP ou local"/);
 assert.match(html,/Encontre lugares para reciclar, doar e cuidar do seu bairro\./);
 assert.doesNotMatch(html,/Marcar um ponto|Enviar ponto|Confirmei a posição deste local/);
 console.log('OK Busca por cidade/endereço/CEP preservada como consulta, sem cadastro público');
}
function htmlCadastro(){return require('node:fs').readFileSync('public/index.html','utf8');}
validarBuscaEnderecoConsulta().catch(e=>{console.error(e);process.exitCode=1;});

async function validarTelaNaCidade(){
 const fs=require('node:fs');
 const html=fs.readFileSync('public/index.html','utf8'),css=fs.readFileSync('public/pontos-osm.css','utf8');
 for(const trecho of ['<h1 class="tela-titulo" id="tela-na-cidade-titulo" tabindex="-1">Na cidade</h1>',
  'Encontre lugares para reciclar, doar e cuidar do seu bairro.',
  'placeholder="Busque uma cidade, endereço, CEP ou local"',
  '<summary>Ver lista</summary>','id="osm-filtro-ajuda"','id="osm-status"',
  'id="osm-vazio-texto"','Nenhum local encontrado com estes filtros.',
  'id="osm-vazio-atualizar"','id="osm-vazio-limpar"','id="osm-vazio-cidade"','id="osm-vazio-ampliar"',
  'id="denuncia-dialogo"','pontos-cache.js','cidade-busca.js','categorias-pontos.js']){
  assert.ok(html.includes(trecho),trecho);
 }
 for(const proibido of ['Marcar um ponto','Enviar ponto','Confirmei a posição deste local','Conhece um lugar útil?','Ainda não temos pontos cadastrados','cadastro-pontos-ui.js','id="cadastro-abrir"','id="cadastro-painel"'])
  assert.doesNotMatch(html,new RegExp(proibido.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),proibido);
 const uiFonte=fs.readFileSync('public/pontos-osm-ui.js','utf8');
 for(const texto of ['Buscando locais nesta região…','Mostrando pontos salvos','Não conseguimos atualizar agora.','Nenhum local encontrado com estes filtros.'])
  assert.ok(uiFonte.includes(texto),texto);
 assert.equal((html.match(/id="ponto-cartao-titulo"/g)||[]).length,1);
 assert.match(fs.readFileSync('public/cidade-publica.js','utf8'),/cidade-busca-selecionada/);
 assert.match(fs.readFileSync('public/cadastro-pontos-ui.js','utf8'),/cidade-busca-selecionada/);
 assert.match(css,/\.osm-marker span\{[^}]*width:16px;height:16px/);assert.match(css,/\.osm-marker--selecionado span\{[^}]*width:22px/);
 assert.match(fs.readFileSync('public/cidade-layout.css','utf8'),/overflow-x:clip/);
 const sw=fs.readFileSync('public/sw.js','utf8');
 assert.match(sw,/'pontos-cache\.js'/);assert.match(sw,/'cidade-busca\.js'/);
 assert.match(sw,/pathname\.startsWith\('\/rest\/v1\/'\)/);
 const crypto=require('node:crypto');
 const uiMapa=fs.readFileSync('public/cidade-ui.js','utf8');
 for(const [arquivo,hash] of [['leaflet.js','20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='],['leaflet.css','p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=']]){
  const {execFileSync}=require('node:child_process');
  // O navegador recebe o blob do Git; o arquivo de trabalho pode ter CRLF no Windows.
  const conteudo=execFileSync('git',['show','HEAD:public/vendor/leaflet/'+arquivo],{maxBuffer:10*1024*1024});
  const esperado='sha256-'+crypto.createHash('sha256').update(conteudo).digest('base64');
  assert.equal(esperado,'sha256-'+hash);
  assert.ok(uiMapa.includes(esperado),'SRI de '+arquivo);
  assert.ok(uiMapa.includes('if(sri)tentar(null)'),'retry sem SRI em cache misturado');
 }

 // Cache isolado por projeto, validado, limitado e com resposta vazia válida.
 const cacheApi=require('./public/pontos-cache');
 const configCache={SUPABASE_URL:'https://projeto.supabase.co'};
 const mem=new Map([['outro-dado','preservado']]);
 const storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
 let agora=1000;
 const cache=cacheApi.criarCachePontos(configCache,{storage,agora:()=>agora});
 assert.equal(cache.disponivel,true);
 assert.equal(cacheApi.projetoCachePontos(configCache),'projeto.supabase.co');
 assert.equal(cache.ler({cidade:'Itapeva'}),null);
 const pontoCache={id:'supabase-1',bancoId:'ec0a0000-0000-4000-8000-000000000001',nome:'Horta',categoria:'horta',cidade:'Itapeva',UF:'SP',latitude:-23.98,longitude:-48.87,origem:'supabase',verificado:false};
 cache.gravar({cidade:'Itapeva'},[pontoCache]);
 assert.equal(cache.ler({cidade:'itapeva'}).length,1);
 assert.equal(mem.get('outro-dado'),'preservado');
 assert.equal(cacheApi.criarCachePontos({SUPABASE_URL:'https://outro.supabase.co'},{storage}).ler({cidade:'Itapeva'}),null);
 assert.equal(cacheApi.pontoCacheValido({...pontoCache,status:'pendente'}),true);
 assert.equal(cacheApi.pontoCacheValido({...pontoCache,id:'supabase-2',verificado:'sim'}),false);
 assert.equal(cacheApi.pontoCacheValido({...pontoCache,nome:'<img src=x>'}),true);
 cache.gravar({cidade:'Itapeva'},[]);assert.deepEqual(cache.ler({cidade:'Itapeva'}),[]);
 const chaveCache=[...mem.keys()].find(k=>k.startsWith(cacheApi.CHAVE_CACHE_PONTOS));
 mem.set(chaveCache,'{invalido');assert.equal(cache.ler({cidade:'Itapeva'}),null);
 assert.equal(mem.get('outro-dado'),'preservado');
 cache.gravar({cidade:'Itapeva'},[pontoCache]);agora+=86400001;assert.equal(cache.ler({cidade:'Itapeva'}),null);

 // Bbox, nome fora da área, limite explícito e contagem de truncamento.
 const sup=require('./public/pontos-compartilhados');
 const cfg={SUPABASE_URL:'https://exemplo.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_teste'};
 const bbox=[-24.02,-48.36,-24,-48.34];
 const area=sup.montarConsultaPontos(cfg,{bbox});
 assert.deepEqual(area.searchParams.getAll('lat'),['gte.-24.02','lte.-24']);
 assert.deepEqual(area.searchParams.getAll('lng'),['gte.-48.36','lte.-48.34']);
 const fora=sup.montarConsultaPontos(cfg,{bbox,nome:'  HÓRTA  '});
 assert.equal(fora.searchParams.has('lat'),false);
 assert.equal(fora.searchParams.get('nome_busca'),'ilike.*horta*');
 assert.equal(sup.montarConsultaPontos(cfg,{bbox,limite:150}).searchParams.get('limit'),'150');
 assert.equal(sup.montarConsultaPontos(cfg,{bbox,limite:9999}).searchParams.get('limit'),'200');
 const brutos=Array.from({length:201},(_,i)=>({id:'id'+i,nome:'Ponto '+i,categoria:'horta',lat:-24.01,lng:-48.35,status:'aprovado',verificado:false}));
 const cliLimite=sup.criarClientePontosCompartilhados(cfg,{fetcher:async()=>({ok:true,json:async()=>brutos})});
 const limitado=await cliLimite.consultarComLimite({limite:200});
 assert.equal(limitado.pontos.length,200);assert.equal(limitado.limiteAtingido,true);

 // Busca única com debounce/cancelamento/resposta atrasada e sem criar ponto a partir de endereço.
 const buscaApi=require('./public/cidade-busca'),end=require('./public/enderecos');
 let relogioMs=0,proximoTimer=0;const tarefas=new Map();
 const relogio={setTimeout(fn,ms){const id=++proximoTimer;tarefas.set(id,{fn,em:relogioMs+ms});return id;},clearTimeout(id){tarefas.delete(id);}};
 const avancar=async ms=>{relogioMs+=ms;for(const [id,t] of [...tarefas])if(t.em<=relogioMs){tarefas.delete(id);t.fn();}await Promise.resolve();await Promise.resolve();};
 const sinais=[],resolvers=[],estadosControle=[];
 const controle=buscaApi.criarControleBuscaCidade({buscar:(texto,opcoes)=>{sinais.push(opcoes.signal);return new Promise(r=>resolvers.push(r));},atualizar:(estado,itens)=>estadosControle.push([estado,itens]),relogio});
 controle.digitar('agua');await avancar(349);assert.equal(sinais.length,0);await avancar(1);assert.equal(sinais.length,1);
 controle.digitar('agua nova');assert.equal(sinais[0].aborted,true);await avancar(350);assert.equal(sinais.length,2);
 resolvers[0]([{tipo:'ponto',nome:'atrasado'}]);await Promise.resolve();assert.deepEqual(estadosControle.at(-1)[1],[]);
 resolvers[1]([{tipo:'ponto',nome:'atual'}]);await Promise.resolve();assert.equal(estadosControle.at(-1)[0],'pronto');assert.equal(estadosControle.at(-1)[1][0].nome,'atual');

 const termos=[];
 const pontosFora={id:'fora',nome:'Horta com Acento',categoria:'horta',cidade:'Itapeva',UF:'SP',latitude:-23.98,longitude:-48.87};
 const servico=buscaApi.criarServicoBuscaCidade({
  buscarPontos:async(termo,opcoes)=>{termos.push([termo,opcoes]);return [pontosFora];},
  provedorEnderecos:async()=>[], criarServico:provedor=>provedor,
  normalizar:end.normalizarBuscaEndereco, relogio
 });
 const itens=await servico.buscar('HÓRTA');
 assert.equal(termos[0][0],'horta');assert.equal(itens[0].tipo,'ponto');assert.equal(itens[0].ponto.latitude,-23.98);
  // RPC de cidades acrescenta entradas, sem apagar cidades do geocodificador.
  const servicoCidades=buscaApi.criarServicoBuscaCidade({
    buscarPontos:async()=>[],
    buscarCidades:async termo=>String(termo).includes('itape')?[{cidade:'Itapetininga',uf:'SP'}]:[],
    provedorEnderecos:async()=>[{nome:'Itapetininga',cidade:'Itapetininga',uf:'SP',latitude:-23.49,longitude:-48.01,rotulo:'Itapetininga — SP'},
      {nome:'Sorocaba',cidade:'Sorocaba',uf:'SP',latitude:-23.5,longitude:-47.26,rotulo:'Sorocaba — SP'}],
    criarServico:provedor=>provedor,normalizar:end.normalizarBuscaEndereco,relogio
  });
  const itensCidades=await servicoCidades.buscar('itapetininga');
  assert.equal(itensCidades.length,2);
  assert.equal(itensCidades.filter(x=>x.tipo==='endereco').length,2);
  assert.equal(itensCidades.filter(x=>x.endereco.temPontos===true).length,1);
  assert.ok(itensCidades.some(x=>x.endereco.cidade==='Sorocaba'));

 function noSimples(tag){
  const no={tagName:tag,children:[],attrs:{},dataset:{},value:'',hidden:false,textContent:'',eventos:{},parentNode:null,
   setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return Object.prototype.hasOwnProperty.call(this.attrs,k)?this.attrs[k]:null;},
   removeAttribute(k){delete this.attrs[k];},
   append(...filhos){for(const f of filhos){if(!f)continue;if(f.parentNode)f.parentNode.children.splice(f.parentNode.children.indexOf(f),1);f.parentNode=this;this.children.push(f);}},
   prepend(...filhos){for(const f of filhos.reverse())if(f){if(f.parentNode)f.parentNode.children.splice(f.parentNode.children.indexOf(f),1);f.parentNode=this;this.children.unshift(f);}},
   replaceChildren(...filhos){this.children=[];this.append(...filhos);},
   insertBefore(novo,ref){if(novo.parentNode)novo.parentNode.children.splice(novo.parentNode.children.indexOf(novo),1);const i=this.children.indexOf(ref);this.children.splice(i<0?this.children.length:i,0,novo);novo.parentNode=this;},
   addEventListener(k,f){(this.eventos[k]||(this.eventos[k]=[])).push(f);},
   dispatchEvent(e){for(const f of [...(this.eventos[e.type]||[])])f(e);return true;},
   querySelectorAll(sel){const achados=[];const visitar=n=>{for(const f of n.children){if(sel.includes('[role="option"]')&&f.attrs.role==='option')achados.push(f);visitar(f);}};visitar(this);return achados;},
   contains(x){return x===this||this.children.some(f=>f.contains?.(x));},
   focus(){},scrollIntoView(){},click(){this.dispatchEvent({type:'click',target:this,preventDefault(){}});},
   set innerHTML(v){throw Error('HTML externo não permitido');}
  };
  return no;
 }
 const formBusca=noSimples('form'),inputBusca=noSimples('input');formBusca.append(inputBusca);
 const nosBusca={'cidade-busca-endereco':formBusca,'cidade-busca-unica':inputBusca};
 const docBusca={getElementById:id=>nosBusca[id]||null,createElement:noSimples,activeElement:null,addEventListener(){}};
 const ambienteBusca={fetch:async()=>{throw Error('rede não usada');},Event:class{constructor(type){this.type=type;}},CustomEvent:class{constructor(type,opcoes={}){this.type=type;this.detail=opcoes.detail;}},setTimeout:relogio.setTimeout,clearTimeout:relogio.clearTimeout};
 const enderecosTeste=[{nome:'Rua sem posição',cep:'00000-000',cidade:'Itapeva',uf:'SP',subtitulo:'Sem coordenadas — preencha manualmente'},
  {nome:'Itapeva',cidade:'Itapeva',uf:'SP',latitude:-23.98,longitude:-48.87,rotulo:'Itapeva — SP'}];
 let pontoCriado=0,aoEndereco=0;
 const uiBusca=buscaApi.iniciarBuscaCidade(docBusca,ambienteBusca,{
  criarServicoBuscaCidade:buscaApi.criarServicoBuscaCidade,criarControleBuscaCidade:buscaApi.criarControleBuscaCidade,
  criarServico:provedor=>provedor,normalizar:end.normalizarBuscaEndereco,
  consultarProvedor:async texto=>String(texto).toLowerCase()==='itapeva'?[enderecosTeste[1]]:enderecosTeste
 });
 uiBusca.conectar({buscarPontos:async()=>[pontosFora],aoPonto:()=>{pontoCriado++;},aoEndereco:()=>{aoEndereco++;},vies:()=>null});
 inputBusca.value='praça sem acento';const resultados=await uiBusca.buscar(inputBusca.value);
 assert.ok(resultados.some(r=>r.tipo==='ponto'));assert.ok(resultados.some(r=>r.tipo==='endereco'));
 const areaBusca=inputBusca.parentNode;
 const listaBusca=areaBusca.children.find(x=>x.id==='cidade-sugestoes');
 const rotulos=listaBusca.children.filter(x=>x.className==='busca-unica-grupo').map(x=>x.children[0].textContent);
 assert.deepEqual(rotulos,['Pontos cadastrados','Endereços e cidades']);
 const opcoes=listaBusca.querySelectorAll('[role="option"]');
 opcoes.find(x=>x.dataset.tipoBusca==='endereco').click();
 assert.equal(pontoCriado,0);assert.equal(aoEndereco,0);
 assert.match(areaBusca.children.at(-1).textContent,/sem posição confirmada no mapa/);
 inputBusca.value='Itapeva';await uiBusca.buscar(inputBusca.value);
 const lista2=inputBusca.parentNode.children.find(x=>x.id==='cidade-sugestoes');
 const opcaoCidade=lista2.querySelectorAll('[role="option"]').find(x=>x.dataset.tipoBusca==='endereco');
 opcaoCidade.click();assert.equal(aoEndereco,1);assert.equal(pontoCriado,0);
  // Cidade da RPC não tem coordenadas: resolve pelo geocodificador e, na falha,
  // consulta os pontos pelo nome sem inventar posição.
  function uiCidadeRpc(resolver){
    const form=noSimples('form'),input=noSimples('input');form.append(input);
    const nos={'cidade-busca-endereco':form,'cidade-busca-unica':input};
    const d={getElementById:id=>nos[id]||null,createElement:noSimples,activeElement:null,addEventListener(){}};
    const ui=buscaApi.iniciarBuscaCidade(d,ambienteBusca,{
      criarServicoBuscaCidade:buscaApi.criarServicoBuscaCidade,criarControleBuscaCidade:buscaApi.criarControleBuscaCidade,
      criarServico:provedor=>provedor,normalizar:end.normalizarBuscaEndereco,consultarProvedor:async()=>[],resolverCidade:resolver
    });
    const chamadas={endereco:[],cidade:[]};
    ui.conectar({buscarPontos:async()=>[],buscarCidades:async()=>[{cidade:'Sorocaba',uf:'SP'}],
      aoEndereco:p=>chamadas.endereco.push(p),aoCidade:p=>chamadas.cidade.push(p)});
    return {ui,input,chamadas};
  }
  const comPosicao=uiCidadeRpc(async(cidade,uf)=>[{nome:cidade,cidade,uf,latitude:-23.5,longitude:-47.26}]);
  const itensRpc=await comPosicao.ui.buscar('sorocaba');
  assert.equal(itensRpc[0].origemCidade,true);
  const listaRpc=comPosicao.input.parentNode.children.find(x=>x.id==='cidade-sugestoes');
  listaRpc.querySelectorAll('[role="option"]')[0].click();
  await new Promise(r=>setTimeout(r,0));
  assert.equal(comPosicao.chamadas.endereco.length,1);
  assert.equal(comPosicao.chamadas.endereco[0].cidade,'Sorocaba');
  assert.equal(comPosicao.chamadas.endereco[0].latitude,-23.5);
  assert.equal(comPosicao.chamadas.cidade.length,0);
  const semPosicao=uiCidadeRpc(async()=>[]);
  const itensSemPos=await semPosicao.ui.buscar('sorocaba');
  const listaSemPos=semPosicao.input.parentNode.children.find(x=>x.id==='cidade-sugestoes');
  listaSemPos.querySelectorAll('[role="option"]')[0].click();
  await new Promise(r=>setTimeout(r,0));
  assert.equal(itensSemPos[0].origemCidade,true);
  assert.equal(semPosicao.chamadas.cidade.length,1);
  assert.equal(semPosicao.chamadas.cidade[0].cidade,'Sorocaba');
  assert.equal(semPosicao.chamadas.endereco.length,0);

 // Categoria única para filtro, cadastro, filtros de consulta e cartões.
 const cats=require('./public/categorias-pontos');
 assert.deepEqual(cats.CATEGORIAS_PONTOS.map(c=>c.valor),['reciclagem','doacao','agua','horta','oleo-de-cozinha','pilhas-eletronicos','outro']);
 assert.equal(cats.categoriaPontosCanonica('verde'),'horta');assert.equal(cats.categoriaPontosCanonica('outros'),'outro');
 assert.equal(cats.categoriaPontosValida('todos'),false);assert.equal(cats.orientacaoCategoriaPontos('todos'),'');
 const orientacoes={reciclagem:'Local que recebe materiais recicláveis.',doacao:'Local que recebe doações. Informe o que aceita.',agua:'Ponto público de água para beber. Confirme essa informação.',horta:'Horta comunitária, parque ou área verde acessível.','oleo-de-cozinha':'Local que recebe óleo usado para descarte adequado.','pilhas-eletronicos':'Local que recebe pilhas, baterias ou equipamentos eletrônicos.',outro:'Outro local útil para ações ligadas aos ODS. Explique como ele ajuda.'};
 for(const c of cats.CATEGORIAS_PONTOS)assert.equal(c.orientacao,orientacoes[c.valor]);
 const htmlFiltro=html.match(/<div class="osm-chips"[\s\S]*?<\/div>/)[0];
 assert.doesNotMatch(htmlFiltro,/data-categoria-osm="(?:verde|outros|todos)"/);
 assert.ok(htmlFiltro.includes('data-categoria-osm="horta"'));assert.ok(htmlFiltro.includes('data-categoria-osm="outro"'));
 for(const valor of cats.CATEGORIAS_PONTOS.map(c=>c.valor))assert.ok(htmlFiltro.includes('data-categoria-osm="'+valor+'"'));
 assert.doesNotMatch(html,/<option value="(?:todos|verde|outros)"/);
 assert.doesNotMatch(html,/placeholder="Ex\.: recebe papel|Não é enviado automaticamente e não cria um ponto|id="cadastro-descricao"/);
 const uiPontosFonte=fs.readFileSync('public/pontos-osm-ui.js','utf8');
 assert.doesNotMatch(uiPontosFonte,/Sugerir correção|Sugerir ao Ecoa|osm-sug/);
 assert.match(uiPontosFonte,/Denunciar este ponto/);
 assert.doesNotMatch(html,/Sugerir ao Ecoa|Sugerir correção/);
 console.log('OK Tela Na cidade: interface, cache validado/vazio, bbox, categoria única, textos, busca e endereço sem criar ponto');
}
validarTelaNaCidade().catch(e=>{console.error(e);process.exitCode=1;});

async function validarBasesRegionais(){
 const fs=require('node:fs'),bases=require('./public/bases-regiao');
 const indice=bases.validarIndiceBases(JSON.parse(fs.readFileSync('public/bases-regiao-indice.json','utf8')));
 const quantidades={'Capão Bonito':69,'Itapetininga':6,'Sorocaba':7,'Itapeva':6,'Buri':5,'São Miguel Arcanjo':5};
 assert.deepEqual(indice.cidades.map(c=>c.cidade),Object.keys(quantidades));
 const entradas=new Map(indice.cidades.map(c=>[c.cidade,c]));
 assert.equal(entradas.get('Capão Bonito').abrangencia,'cidade e arredores');
 assert.equal(entradas.get('Capão Bonito').ibge,'3510203');
 assert.equal(entradas.get('Itapetininga').ibge,'3522307');
 assert.equal(entradas.get('Sorocaba').ibge,'3552205');
 assert.equal(entradas.get('São Miguel Arcanjo').ibge,'3550209');
 for(const entrada of indice.cidades){
  const base=bases.validarBaseCidade(JSON.parse(fs.readFileSync('public/'+entrada.arquivo,'utf8')),entrada);
  assert.equal(base.pontos.length,quantidades[entrada.cidade]);
  assert.equal(base.pontos.length,entrada.quantidade);
  assert.ok(base.pontos.every(p=>p.origem==='base'&&!/EXEMPLO|FICT[ÍI]CIO/i.test(p.nome)));
  assert.ok(base.pontos.every(p=>!/^https:/.test(p.fonte)||p.fonte.startsWith('https://')));
  assert.ok(base.pontos.every(p=>p.categoria!=='verde'&&p.categoria!=='outros'));
 }
 const mem=new Map();
 const storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
 let falhar=false,dadosInvalidos=false;
 const jsonIndice=fs.readFileSync('public/bases-regiao-indice.json','utf8');
 const fetcher=async url=>{
  if(String(url).includes('indice'))return {ok:true,json:async()=>JSON.parse(jsonIndice)};
  if(falhar)throw Error('sem rede');
  const caminho='public/'+String(url);
  const conteudo=fs.readFileSync(caminho,'utf8');
  return {ok:true,json:async()=>dadosInvalidos?{...JSON.parse(conteudo),pontos:[]}:JSON.parse(conteudo)};
 };
 const gerente=bases.criarGerenciadorBasesRegiao({fetcher,storage});
 assert.equal((await gerente.listar()).cidades.length,6);
 assert.equal(gerente.encontrar('itapetininga','sp').id,'3522307');
 assert.equal(gerente.encontrar('Itapetininga','MG'),null);
 const carregada=await gerente.carregar('3522307');
 assert.equal(carregada.pontos.length,6);assert.equal(carregada.origemCache,false);
 falhar=true;
 const preservada=await gerente.carregar('3522307',{revalidar:true});
 assert.equal(preservada.origemCache,true);assert.equal(preservada.pontos.length,6);
 falhar=false;dadosInvalidos=true;
 await assert.rejects(gerente.carregar('3522406'),/Base regional/);
 assert.equal(gerente.emCache('3522406'),false);
 dadosInvalidos=false;
 const segunda=await gerente.carregar('3522406');assert.equal(segunda.pontos.length,6);
 const outro=bases.criarGerenciadorBasesRegiao({fetcher,storage});
 assert.equal(outro.emCache('3522307'),true);

 // Fluxo completo no mapa: a base local aparece mesmo com Supabase/Overpass falhando.
 const osm=require('./public/pontos-osm'),sup=require('./public/pontos-compartilhados');
 const criar=()=>({children:[],eventos:{},dataset:{},value:'',hidden:false,textContent:'',append(...x){this.children.push(...x);},prepend(...x){this.children.unshift(...x);},replaceChildren(...x){this.children=x;},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){this.eventos[k]=f;},focus(){},scrollIntoView(){(this.scrolls=(this.scrolls||0)+1);},click(){this.eventos.click?.();},set innerHTML(v){throw Error('XSS');}});
 const els=new Map(),el=id=>{if(!els.has(id))els.set(id,criar());return els.get(id);};
 const chips=['','reciclagem','horta'].map(c=>{const e=criar();e.dataset.categoriaOsm=c;return e;});
 const doc={getElementById:el,createElement:criar,querySelectorAll:()=>chips,addEventListener(){}};
 const handlers={};
 const mapa={on(n,f){handlers[n]=f;return this;},getZoom:()=>13,fitBounds(){return this;},
  getBounds:()=>({getSouth:()=>-24.02,getWest:()=>-48.36,getNorth:()=>-24,getEast:()=>-48.34}),
  getCenter:()=>({lat:-24.01,lng:-48.35}),setView(){return this;}};
 let callbacks={};
 const env={EcoaMapaInicial:{},EcoaConfig:{},EcoaBasesRegiao:bases,sessionStorage:storage,
  EcoaBuscaCidade:{conectar:cb=>{callbacks=cb;}},
  fetch:fetcher,navigator:{onLine:false},addEventListener(){},
  L:{layerGroup:()=>({addTo(){return this;},clearLayers(){}}),divIcon:()=>({}),
    latLngBounds:coords=>({pad(){return this;}}),marker:()=>({addTo(){return this;},on(){},getElement:()=>({isConnected:false})})}};
 const ui=require('./public/pontos-osm-ui').iniciarPontosOSM(doc,env,{...osm,validarBaseOSM:()=>[],validarFixosOSM:()=>[]});
 await ui.pronto;ui.conectar(mapa);chips[1].click();
 const esperar=()=>new Promise(r=>setTimeout(r,80));
 callbacks.aoCidade({cidade:'Itapetininga',uf:'SP'});await esperar();
 const cidadeAntes=ui.estado().regiao.chave;handlers.moveend();
 assert.equal(ui.estado().regiao.chave,cidadeAntes,'moveend sem mudar área mantém a cidade');
 const texto=()=>JSON.stringify(el('osm-lista').children);
 assert.match(texto(),/COOPERITA/);assert.doesNotMatch(texto(),/Parque das Águas/);
 assert.match(el('osm-filtro-ajuda').textContent,/Base importada: 6 registros/);
 assert.match(el('osm-status').textContent,/Mostrando pontos salvos|6 pontos encontrados/);
 callbacks.aoCidade({cidade:'Capão Bonito',uf:'SP'});await esperar();
 // Trocar de cidade preserva a categoria: reciclagem continua ativa.
 assert.match(texto(),/Centro de reciclagem/);assert.doesNotMatch(texto(),/COOPERITA/);
 assert.match(el('osm-filtro-ajuda').textContent,/cidade e arredores/);
 chips[0].click();await esperar();
 assert.match(texto(),/Parque das Águas/);
 const todos=el('osm-lista').children.length;
 chips[1].click();await esperar();
 const sobraram=el('osm-lista').children;
 assert.ok(sobraram.length>0&&sobraram.length<todos);
 assert.ok(sobraram.every(p=>p.children[0]?.textContent==='Reciclagem'));
 chips[0].click();await esperar();
 callbacks.aoCidade({cidade:'Buri',uf:'SP'});await esperar();
 assert.match(texto(),/Praça 9 de Julho/);assert.doesNotMatch(texto(),/COOPERITA/);
 // Cidade fora da cobertura não herda base de outra cidade e não alega erro de rede.
 callbacks.aoCidade({cidade:'Presidente Prudente',uf:'SP'});await esperar();
 assert.equal(el('osm-lista').children.length,0);
 assert.match(el('osm-filtro-ajuda').textContent,/Ainda não há base importada/);
 assert.match(el('osm-status').textContent,/Nenhum local encontrado com estes filtros/);
 callbacks.aoCidade({cidade:'Capão Bonito',uf:'SP'});await esperar();
 assert.match(texto(),/Parque das Águas/);
 handlers.moveend();await esperar();
 assert.match(el('osm-filtro-ajuda').textContent,/Base importada/);
 assert.match(texto(),/Parque das Águas/);
 handlers.moveend();await esperar();
 assert.match(el('osm-filtro-ajuda').textContent,/Base importada/);
 assert.match(texto(),/Parque das Águas/);
 const build=fs.readFileSync('build.cjs','utf8');
 assert.doesNotMatch(build,/overpass|importar-osm/);
 console.log('OK Bases regionais: índice, seis cidades, carregamento sob demanda, cache válido, falha preservada e cartões no mapa');
}
validarBasesRegionais().catch(e=>{console.error(e);process.exitCode=1;});

function validarAcoesNosPontos(){
 const fs=require('node:fs');
 const cats=require('./public/categorias-pontos');
 const regras=require('./public/acoes-pontos');
 const catalogo={acoes,objetivos};
 for(const categoria of cats.CATEGORIAS_PONTOS){
  const sugestao=regras.sugestaoAcaoPonto({categoria:categoria.valor,nome:'Local de teste'},catalogo);
  assert.ok(sugestao,categoria.valor);
  assert.ok(sugestao.ods.length>=1&&sugestao.ods.length<=2,categoria.valor);
  assert.ok(sugestao.ods.every(numero=>Number.isInteger(numero)&&numero>=1&&numero<=17),categoria.valor);
  assert.ok(acoes.some(acao=>acao.ods+':'+acao.titulo===sugestao.chave),categoria.valor);
  assert.ok(sugestao.passos.length>=1&&sugestao.passos.length<=3,categoria.valor);
  assert.ok(sugestao.antesDeIr.length>=1&&sugestao.antesDeIr.length<=3,categoria.valor);
  assert.ok(sugestao.oQueFazer&&sugestao.relacao,categoria.valor);
  assert.doesNotMatch(sugestao.relacao+' '+sugestao.antesDeIr.join(' '),/certificad[oa] pela ONU/i,categoria.valor);
 }
 const horta=regras.sugestaoAcaoPonto({categoria:'horta'},catalogo);
 assert.deepEqual(horta.ods,[15,11]);
 assert.equal(horta.chave,'15:Observe a vegetação do seu bairro');
 assert.match(regras.nomeOdsAcaoPonto(horta,15),/^ODS 15 — /);
 const html=fs.readFileSync('public/index.html','utf8');
 const sw=fs.readFileSync('public/sw.js','utf8');
 assert.ok(html.includes('acoes-pontos.js'));
 assert.match(sw,/acoes-pontos\.js/);
 assert.match(sw,/prefixo \+ 'v63'/);
 console.log('OK Ações por ponto: regras por categoria, ODS existentes, passos curtos e texto educativo');
}
validarAcoesNosPontos();

function validarPlanoDoPonto(){
 const fs=require('node:fs'),vm=require('node:vm');
 const chave=acoes[0].ods+':'+acoes[0].titulo,registro=new Map(),documentos=new Map();
 const criar=()=>({children:[],eventos:{},hidden:false,disabled:false,textContent:'',
  append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},setAttribute(){},
  addEventListener(k,f){this.eventos[k]=f;},focus(){},click(){this.eventos.click?.();}});
 const documento={querySelector:seletor=>{if(!documentos.has(seletor))documentos.set(seletor,criar());return documentos.get(seletor);},
  querySelectorAll:()=>[],addEventListener(){},createElement:criar};
 const contexto={acoes,encontradas:acoes,indice:0,document:documento,atualizarProgressoPlano(){},
  window:{addEventListener(){}},
  localStorage:{getItem:k=>registro.has(k)?registro.get(k):null,setItem:(k,v)=>registro.set(k,String(v)),removeItem:k=>registro.delete(k)},
  exportarPlanoJson:()=>'{}',importarPlanoJson:()=>({plano:new Map(),quantidade:0,novas:0}),
  lerArquivoPlanoJson:async()=>'{}',gerarPdfPlano:async()=>new Uint8Array(),
  URL:{createObjectURL:()=>'blob:teste',revokeObjectURL(){}},Blob:class{},setTimeout(){}};
 vm.runInNewContext(fs.readFileSync('public/plano.js','utf8'),contexto,{filename:'public/plano.js'});
 const api=contexto.window.EcoaPlanoPontos;
 assert.ok(api&&typeof api.salvarAcaoDoPonto==='function');
 const ponto={id:'osm-horta-1',nome:'Horta',cidade:'Buri',UF:'sp'};
 const salvo=api.salvarAcaoDoPonto(acoes[0],ponto);
 assert.equal(salvo.salva,true);assert.equal(salvo.jaSalva,false);assert.equal(salvo.vinculada,true);
 assert.equal(api.contemAcaoPlano(acoes[0]),true);
 assert.equal(JSON.parse(registro.get('oqdpf-plano-v1'))[chave],false);
 const vinculos=()=>JSON.parse(registro.get('ecoa:acoes-pontos-v1'));
 assert.equal(vinculos()[chave+'|osm-horta-1'].uf,'SP');
 assert.equal(vinculos()[chave+'|osm-horta-1'].cidade,'Buri');
 assert.equal(api.salvarAcaoDoPonto(acoes[0],ponto).jaSalva,true);
 assert.equal(Object.keys(vinculos()).length,1,'mesma ação no mesmo ponto não duplica');
 assert.equal(api.salvarAcaoDoPonto(acoes[0],{id:'osm-horta-2',nome:'Outra horta'}).jaSalva,true);
 assert.equal(Object.keys(vinculos()).length,2,'mesma ação em outro ponto mantém os dois vínculos');
 assert.equal(api.vinculoDoPonto(acoes[0],ponto).nome,'Horta');
 assert.equal(api.salvarAcaoDoPonto({ods:99,titulo:'Fora do catálogo'},ponto).salva,false);
 const remover=documento.querySelector('#plano-lista').children.flatMap(li=>li.children).find(b=>b.textContent==='Remover');
 assert.ok(remover,'botão Remover existe');remover.eventos.click();
 assert.equal(JSON.parse(registro.get('oqdpf-plano-v1'))[chave],undefined);
 assert.equal(Object.keys(vinculos()).length,0,'remover a ação limpa os vínculos');
 const json=require('./public/plano-json');
 assert.deepEqual(json.validarPlanoJson('{"projeto":"oqdpf","versao":1,"acoes":[]}',acoes),new Map());
 const html=fs.readFileSync('public/index.html','utf8');
 assert.ok(html.indexOf('acoes-pontos.js')<html.indexOf('plano.js'));
 assert.ok(html.indexOf('plano.js')<html.indexOf('pontos-osm-ui.js'));
 console.log('OK Meu plano pelo ponto: ação salva sem duplicar, vínculo separado do backup e limpeza ao remover');
}
validarPlanoDoPonto();
