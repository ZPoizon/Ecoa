const assert = require('node:assert/strict');
const { objetivos, acoes, filtrarAcoes } = require('./dist/acoes');
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

async function validarPwa() {
  const { existsSync, readFileSync } = require('node:fs');
  const { runInNewContext } = require('node:vm');
  const manifesto = require('./dist/manifest.json');
  assert.equal(manifesto.display, 'standalone');
  assert.equal(manifesto.start_url, './');
  for (const icone of manifesto.icons) {
    const png = readFileSync('dist/' + icone.src);
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
  runInNewContext(readFileSync('dist/sw.js', 'utf8'), {
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
              assert.ok(existsSync('dist/' + pedido.url.slice(origem.length)), pedido.url);
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
  for (const arquivo of ['pontos-osm.js', 'pontos-osm-ui.js', 'pontos-osm.css', 'pontos-fixos.json', 'cidade-layout.css', 'aprender.js', 'aprender.css', 'agir.js', 'agir.css', 'inicio.js', 'inicio.css', 'rotas.js', 'design-system.css', 'index.html', 'sobre.html', 'vendor/pdf-lib.min.js', 'guias.js', 'plano-json.js', 'lembretes.js', 'lembretes-ui.js', 'enderecos.js', 'cidade.js', 'cidade-ui.js', 'pontos-modelo.json', 'estimativa.js', 'estimativa-ui.js', 'progresso.js', 'desafio.js', 'desafio-ui.js', 'quiz.js', 'quiz-ui.js', 'acessibilidade.js', 'acessibilidade.css', 'compartilhar.js', 'compartilhar-ui.js', 'ods/17.webp']) {
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
  const executarRegistro = navigator => runInNewContext(readFileSync('dist/pwa.js', 'utf8'), {
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
  const { validarPlanoJson, exportarPlanoJson, mesclarPlanoJson, importarPlanoJson, lerArquivoPlanoJson } = require('./dist/plano-json');
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
  await assert.rejects(lerArquivoPlanoJson({name:'plano.txt',size:10}), /extensão/);
  await assert.rejects(lerArquivoPlanoJson({name:'plano.json',size:102401}), /100 KB/);
  await assert.rejects(lerArquivoPlanoJson({name:'plano.json',size:10,text:async()=>{throw Error();}}), /ler o arquivo/);
  console.log('OK JSON: leitura, extensão, limite e erro de acesso ao arquivo');
}
validarBackupPlano().catch(erro => { console.error(erro); process.exitCode = 1; });

async function validarCompartilhamento() {
  const api = require('./dist/compartilhar');
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
  runInNewContext(readFileSync('dist/compartilhar-ui.js','utf8'),contexto);
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
  const a = require('./dist/acessibilidade');
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
  const css = readFileSync('dist/design-system.css','utf8');
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
  runInNewContext(readFileSync('dist/guias.js','utf8'),ctx);
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
  const {iniciarAgir}=require('./dist/agir');
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
  const {perguntasQuiz,calcularResultadoQuiz} = require('./dist/quiz');
  const {iniciarQuiz} = require('./dist/quiz-ui');
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
  const html=readFileSync('dist/index.html','utf8');
  const manifesto=require('./dist/manifest.json');
  assert.equal(manifesto.name,'Ecoa');assert.equal(manifesto.short_name,'Ecoa');assert.equal(manifesto.id,'./');
  assert.ok(html.includes('<title>Ecoa</title>'));
  assert.ok(html.includes('Pequenas ações,'));assert.ok(html.includes('Com o tempo e o dinheiro que tenho hoje, o que posso fazer?'));
  assert.ok(html.includes('og:title'));assert.ok(html.includes('não oficial da ONU'));
  const legado = new Map([[acoes[0].ods+':'+acoes[0].titulo,true]]);
  const json=require('./dist/plano-json');
  const backup=JSON.stringify({projeto:'oqdpf',versao:1,acoes:[...legado].map(([chave,concluida])=>({chave,concluida}))});
  assert.deepEqual(json.validarPlanoJson(backup,acoes),legado);
  const elementos=new Map();const el=id=>{if(!elementos.has(id))elementos.set(id,{addEventListener(){},replaceChildren(){},append(){},setAttribute(){}});return elementos.get(id);};
  let leu,escreveu=false;
  const contexto={atualizarProgressoPlano(){},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el(Symbol())},
    localStorage:{getItem:k=>{leu=k;return JSON.stringify(Object.fromEntries(legado));},setItem:()=>{escreveu=true;}},acoes,encontradas:[],indice:0};
  runInNewContext(readFileSync('dist/plano.js','utf8'),contexto);
  assert.equal(leu,'oqdpf-plano-v1');assert.equal(escreveu,false);
  assert.equal(runInNewContext('plano.size',contexto),1);
  assert.equal(runInNewContext('[...plano.values()][0]',contexto),true);
  assert.ok(readFileSync('dist/acessibilidade.js','utf8').includes("'oqdpf-acessibilidade-v1'"));
  console.log('OK Ecoa: título, manifesto, marca independente e preservação de plano/preferências/JSON antigos sem migração');
}
validarMarcaEcoa();

function validarDesafioSeteDias() {
  const d=require('./dist/desafio');
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
  runInNewContext(readFileSync('dist/desafio-ui.js','utf8'),ctx);
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
  const {calcularProgressoPlano,renderizarProgressoPlano}=require('./dist/progresso');
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
  renderizarProgressoPlano(doc,dados,objetivos);
  assert.equal(el('#progresso-vazio').hidden,true);assert.equal(el('#progresso-grafico').children.length,17);
  assert.equal(el('#progresso-grafico').children[11].children[2].children[0].style.width,'100%');
  assert.equal(el('#progresso-selos').children.length,4);
  let salvo;
  const ctx={document:doc,acoes,objetivos,encontradas:[acoes[0]],indice:0,
    localStorage:{getItem:()=>null,setItem:(k,v)=>{salvo=v;}},
    ...require('./dist/plano-json')};
  runInNewContext(readFileSync('dist/progresso.js','utf8')+'\n'+readFileSync('dist/plano.js','utf8'),ctx);
  el('#salvar-acao').eventos.click();assert.equal(el('#progresso-pendentes').textContent,'1');
  const caixa=el('#plano-lista').children[0].children[0].children[0];caixa.checked=true;caixa.eventos.change();
  assert.equal(el('#progresso-concluidas').textContent,'1');assert.equal(el('#progresso-ods').textContent,'1');
  caixa.checked=false;caixa.eventos.change();assert.equal(el('#progresso-concluidas').textContent,'0');
  el('#plano-lista').children[0].children[1].eventos.click();assert.equal(el('#progresso-pendentes').textContent,'0');
  const backup=require('./dist/plano-json').exportarPlanoJson(completo,acoes);
  el('#arquivo-plano').files=[{name:'ecoa.json',size:backup.length,text:async()=>backup}];
  await el('#arquivo-plano').eventos.change();
  assert.equal(el('#progresso-concluidas').textContent,'20');assert.equal(el('#progresso-ods').textContent,'17');
  assert.equal(Object.keys(JSON.parse(salvo)).length,20);
  console.log('OK Progresso: renderização e integração com salvar, concluir, desmarcar, remover e importar JSON');
}
validarProgresso().catch(erro=>{console.error(erro);process.exitCode=1;});

function validarEstimativas() {
  const e=require('./dist/estimativa');
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
  const {iniciarEstimativa}=require('./dist/estimativa-ui');
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
  const c=require('./dist/cidade');
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
  const ui=require('./dist/cidade-ui');
  const {iniciarCidade,carregarLeafletCidade,resumoPontosCidade}=ui;
  assert.equal(resumoPontosCidade(1),'1 ponto na sua lista.');
  assert.equal(resumoPontosCidade(2),'2 pontos na sua lista.');
  assert.equal(resumoPontosCidade(0),'0 pontos na sua lista.');
  const elementos=new Map();
  const criar=()=>({value:'',textContent:'',children:[],eventos:{},setAttribute(k,v){this[k]=v;},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},addEventListener(k,v){this.eventos[k]=v;},focus(){this.focado=true;},reset(){},remove(){},click(){this.clicado=true;}});
  const el=id=>{if(!elementos.has(id))elementos.set(id,criar());return elementos.get(id);};
  const doc={getElementById:el,createElement:criar,head:criar(),body:criar()};
  const ambiente={localStorage:storage,crypto:{randomUUID:()=> 'novo'},confirm:()=>true,URL:{createObjectURL:()=> 'blob:teste',revokeObjectURL(){}},setTimeout:fn=>{fn();return 1;},clearTimeout(){}};
  const pontosAntesDaLeitura=storage.valor;
  await iniciarCidade(doc,ambiente,c);
  assert.equal(storage.valor,pontosAntesDaLeitura);
  el('cidade-adicionar').eventos.click();assert.equal(el('cidade-cadastro').open,true);assert.equal(el('ponto-nome').focado,true);
  el('cidade-fechar-cadastro').eventos.click();assert.equal(el('cidade-cadastro').open,false);assert.equal(el('cidade-adicionar')['aria-expanded'],'false');
  el('cidade-cadastro').open=true;el('cidade-cadastro').eventos.toggle();assert.equal(el('cidade-adicionar')['aria-expanded'],'true');

  assert.equal(el('cidade-lista').children.length,1);
  el('cidade-filtro').value='outra';el('cidade-filtro').eventos.input();assert.equal(el('cidade-lista').children.length,0);
  assert.equal(el('cidade-vazio').hidden,false);assert.equal(el('cidade-vazio-acao').textContent,'Limpar filtros');
  el('cidade-vazio-acao').eventos.click();assert.equal(el('cidade-filtro').value,'');assert.equal(el('cidade-vazio').hidden,true);

  el('cidade-lista').children[0].children.at(-1).children.at(-1).eventos.click();assert.equal(c.lerJsonCidade(storage.valor).length,0);
  assert.equal(el('cidade-vazio-acao').textContent,'Adicionar meu primeiro ponto');el('cidade-vazio-acao').eventos.click();assert.equal(el('cidade-cadastro').open,true);
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
  const mapaFake={setView(){return this;},fitBounds(){},remove(){}};
  ambiente.__ecoaLeafletPronto=true;
  ambiente.L={map:()=>mapaFake,control:{zoom:()=>({addTo(){}})},tileLayer:()=>({on(){return this;},addTo(){}}),layerGroup:()=>({addTo(){return this;},clearLayers(){limpezas++;}}),marker:()=>({bindPopup(popup){assert.equal(typeof popup,'object');return this;},addTo(){marcadores++;}})};
  await el('cidade-carregar').eventos.click();assert.equal(el('cidade-mapa').hidden,false);assert.equal(marcadores,2);
  el('cidade-categoria').value='horta';el('cidade-categoria').eventos.change();assert.equal(el('cidade-lista').children.length,0);assert.ok(limpezas>=2);
  storage.valor='JSON inválido';await iniciarCidade(doc,ambiente,c);
  for(const campo of Object.keys(p).filter(k=>k!=='id'))el('ponto-'+campo).value=String(p[campo]);
  el('cidade-form').eventos.submit({preventDefault(){}});assert.equal(storage.valor,'JSON inválido');
  const html=require('fs').readFileSync('dist/index.html','utf8');assert.match(html,/id="na-minha-cidade"/);assert.match(html,/id="cidade-lista"/);
  console.log('OK Cidade: schema, limites, links seguros, datas, filtros, união, persistência, cadastro, remoção, importação, exportação, falha de mapa e proteção de dados inválidos (DOM simulado)');
}
validarCidade().catch(erro=>{console.error(erro);process.exitCode=1;});

async function validarEnderecos() {
  const a=require('./dist/enderecos');
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
  const a=require('./dist/enderecos');
  assert.equal(a.normalizarBuscaEndereco('  SÃO   PAULO '),'sao paulo');
  assert.equal(a.identificarCepEndereco('18300-000'),'18300000');
  assert.equal(a.identificarCepEndereco('18300000'),'18300000');
  assert.equal(a.identificarCepEndereco('18300'),null);
  let chamadas=0;
  const s=a.criarServicoEnderecos(async()=>{chamadas++;return [];});
  await s('SÃO PAULO');await s('sao paulo');assert.equal(chamadas,1);
  await s('18300-000');await s('18300000');assert.equal(chamadas,2);
  const requests=[];
  const fallback=await a.consultarProvedorEndereco('TESTE',{fetcher:async u=>{
    requests.push(new URL(u));return requests.length===1?{ok:false,status:400,json:async()=>({lang:[{}]})}:{ok:true,json:async()=>({features:[]})};
  }});
  assert.equal(requests[0].searchParams.get('lang'),'pt');assert.equal(requests[1].searchParams.get('lang'),'default');assert.deepEqual(fallback,[]);
  const cep=await a.consultarProvedorEndereco('18300-000',{fetcher:async u=>u.includes('viacep')?{ok:true,json:async()=>({logradouro:'',bairro:'',localidade:'Capão Bonito',uf:'SP'})}:{ok:false,status:503}});
  assert.equal(cep[0].cep,'18300-000');assert.equal(cep[0].latitude,null);assert.equal(cep[0].cidade,'Capão Bonito');
  assert.deepEqual(await a.consultarProvedorEndereco('99999999',{fetcher:async()=>({ok:true,json:async()=>({erro:true})})}),[]);
  assert.deepEqual(await a.consultarProvedorEndereco('18300',{fetcher:async()=>{throw Error('Não deveria consultar');}}),[]);
  await assert.rejects(()=>a.consultarProvedorEndereco('18300000',{fetcher:async()=>{throw Error('offline');}}));
  console.log('OK CEP: com/sem hífen, cache sem acentos/caixa, fallback de idioma, CEP inexistente/incompleto, falha de rede e endereço sem coordenadas');
}
// Executado após a suíte existente para manter isolado o teste do idioma inicial.
setTimeout(()=>validarCep().catch(e=>{console.error(e);process.exitCode=1;}),0);

async function validarLembretesEtapa10(){
  const a=require('./dist/lembretes'),acao=acoes[0],chave=acao.ods+':'+acao.titulo;
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
  const ui=require('./dist/lembretes-ui').iniciarLembretes(doc,env,acoes,()=>p,api);
  assert.equal(solicitacoes,0);assert.equal(el('lembrete-salvar').disabled,false);
  await el('lembrete-ativar').eventos.click();assert.equal(solicitacoes,1);assert.equal(a.lerLembretes(storage,acoes).notificacoes,true);
  el('lembrete-acao').value=chave;el('lembrete-quando').value='2030-01-01T12:00';el('lembrete-form').eventos.submit({preventDefault(){}});
  assert.equal(a.lerLembretes(storage,acoes).itens.length,1);
  let salvo=a.lerLembretes(storage,acoes);salvo.itens[0].quando=Date.now()-1;a.salvarLembretes(storage,salvo,acoes);
  await ui.verificar();await ui.verificar();assert.equal(envios,1);assert.match(el('lembrete-status').textContent,/Hora de agir/);
  el('lembrete-desativar').eventos.click();assert.equal(a.lerLembretes(storage,acoes).notificacoes,false);
  p.set(chave,true);ui.atualizar();assert.equal(a.lerLembretes(storage,acoes).itens.length,0);assert.equal(el('lembrete-salvar').disabled,true);
  storage.v='{inválido';ui.atualizar();assert.equal(storage.v,'{inválido');assert.equal(el('lembrete-salvar').disabled,true);
  console.log('OK Lembretes: datas, persistência, substituição, conclusão/remoção, permissão só por clique, recusa, disparo único, falha, calendário seguro e interface simulada');
}
validarLembretesEtapa10().catch(e=>{console.error(e);process.exitCode=1;});

function validarSobreEFontes(){
  const fs=require('fs'),path=require('path');
  const origem='https://o-que-da-pra-fazer-ods.gardendogwood1.chatgpt.site';
  for(const pagina of ['index.html','sobre.html']){
    const h=fs.readFileSync('dist/'+pagina,'utf8');
    const canonico=origem+(pagina==='index.html'?'/':'/sobre.html');
    assert.ok(h.includes(`rel="canonical" href="${canonico}"`));
    assert.ok(h.includes(`property="og:url" content="${canonico}"`));
    for(const nome of ['og:title','og:description','og:type','og:locale','og:site_name','og:image','og:image:alt','og:image:width','og:image:height'])assert.equal((h.match(new RegExp(`property="${nome}"`,'g'))||[]).length,1);
    assert.match(h,/name="twitter:card" content="summary"/);
    const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
    for(const m of h.matchAll(/(?:href|src)="([^"]+)"/g)){
      const url=m[1];if(url.startsWith('https:'))continue;
      if(url.startsWith('#/')){assert.equal(require('./dist/rotas').resolverRotaEcoa(url).hash,url);continue;}
      if(url.startsWith('#')){assert.ok(ids.includes(url.slice(1)),url);continue;}
      const destino=url.split('#')[0]||'index.html';assert.ok(fs.existsSync(path.join('dist',destino)),destino);
    }
  }
  const sobre=fs.readFileSync('dist/sobre.html','utf8');
  for(let i=1;i<=17;i++)assert.ok(sobre.includes(`href="https://brasil.un.org/pt-br/sdgs/${i}"`));
  for(const id of ['proposta','metodologia','limites','dados','fontes','alternar-tema','preferencia-tema','aumentar-fonte','reduzir-fonte','restaurar-leitura'])assert.ok(sobre.includes(`id="${id}"`));
  assert.match(sobre,/Meta oficial/);assert.match(sobre,/Exemplo didático/);assert.match(sobre,/Ação do projeto/);
  assert.ok(!sobre.includes('src="app.js"'));
  assert.match(fs.readFileSync('dist/index.html','utf8'),/href="sobre.html"/);
  console.log('OK Sobre e fontes: 17 links oficiais, seções, controles de leitura, links internos, IDs únicos e metadados de ambas as páginas');
}
validarSobreEFontes();

function validarRotasFase1() {
  const {resolverRotaEcoa:resolver,iniciarRotasEcoa,atalhosEcoa}=require('./dist/rotas');
  const fs=require('node:fs');
  for(const [antigo,novo] of Object.entries(atalhosEcoa))assert.equal(resolver('#'+antigo).hash,novo);
  for(const hash of ['','#/nao-existe','#/aprender/ods-0','#/aprender/ods-18','#/agir/outro','#/inicio/extra','#/agir/calcular/extra'])assert.equal(resolver(hash).hash,'#/inicio');
  for(let ods=1;ods<=17;ods++)assert.equal(resolver('#/aprender/ods-'+ods).ods,ods);
  for(const acao of acoes){const chave=acao.ods+':'+acao.titulo;
    const antiga='#acao='+encodeURIComponent(chave),nova=resolver(antiga);
    assert.equal(nova.acao,chave);assert.equal(nova.hash,'#/agir?acao='+encodeURIComponent(chave));
    assert.equal(require('./dist/compartilhar').acaoDoLink(antiga,acoes),acao);
    assert.equal(require('./dist/compartilhar').acaoDoLink(nova.hash,acoes),acao);
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
  router.navegar('#/meu-espaco/configuracoes');assert.equal(el('.leitura').open,true);
  router.navegar('#/meu-espaco/conquistas');assert.equal(foco,'progresso-selos-titulo');
  router.abrirBusca();assert.equal(janela.location.hash,'#/agir');
  router.navegar('#acao='+encodeURIComponent('6:ação antiga'));assert.equal(acao,'6:ação antiga');assert.equal(telas[1].hidden,false);
  router.navegar('#/desconhecida');assert.equal(doc.title,'Início | Ecoa');estado();
  assert.equal(el('campo-existente'),original);assert.equal(original.value,'valor não salvo');
  const link=el('link');link.attrs.href='#/aprender';let impediu=false;
  docEventos.click({target:{closest:()=>link},button:0,preventDefault(){impediu=true;}});assert.ok(impediu);assert.equal(janela.location.hash,'#/aprender');
  link.attrs.href='#conteudo';docEventos.click({target:{closest:()=>link},button:0,preventDefault(){}});assert.equal(foco,'tela-aprender-titulo');
  const html=fs.readFileSync('dist/index.html','utf8');
  assert.equal((html.match(/data-tela="/g)||[]).length,5);
  assert.equal((html.match(/data-nav="/g)||[]).length,5);
  assert.match(html,/data-nav-badge hidden/);
  assert.match(fs.readFileSync('dist/sw.js','utf8'),/prefixo \+ 'v27'/);
  assert.match(fs.readFileSync('dist/app.js','utf8'),/EcoaRouter\?\.abrirBusca/);
  assert.match(fs.readFileSync('dist/cidade-ui.js','utf8'),/invalidateSize/);
  console.log('OK Rotas: cinco telas, abas/teclado, foco, títulos, Voltar/Avançar, desconhecidas, 17 guias, ações compartilhadas antigas/novas, badge e conservação dos nós');
}
validarRotasFase1();

function validarDesafioSalvoFase1(){
  const {runInNewContext}=require('node:vm'),fs=require('node:fs'),api=require('./dist/desafio');
  const salvo={versao:1,ods:6,inicio:api.dataLocalDesafio(),dias:[true,false,false,false,false,false,false]};
  const texto=JSON.stringify(salvo);let escritas=0;const elementos=new Map();
  const criar=()=>({value:'',children:[],dataset:{},eventos:{},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},add(){},addEventListener(k,f){this.eventos[k]=f;},focus(){}});
  const el=id=>{if(!elementos.has(id))elementos.set(id,criar());return elementos.get(id);};
  const ctx={...api,objetivos,acoes,praticasOds:objetivos.map(n=>[n,'Passo 1','Passo 2','Registro']),Option:function(){},setInterval(){},
    document:{querySelector:el,createElement:criar,addEventListener(){}},localStorage:{getItem(k){assert.equal(k,'ecoa-desafio-v1');return texto;},setItem(){escritas++;}}};
  runInNewContext(fs.readFileSync('dist/desafio-ui.js','utf8'),ctx);
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
  const {renderizarResumoInicio,iniciarInicio}=require('./dist/inicio');
  const {calcularProgressoPlano}=require('./dist/progresso');
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
    window:{addEventListener(k,f){eventosJanela[k]=f;}},...require('./dist/plano-json')};
  runInNewContext(['progresso.js','plano.js','inicio.js'].map(f=>fs.readFileSync('dist/'+f,'utf8')).join('\n'),ctx);
  assert.equal(escritas,0);assert.equal(el('#inicio-concluidas').textContent,'1');
  el('#salvar-acao').eventos.click();assert.equal(el('#inicio-pendentes').textContent,'1');assert.equal(el('#inicio-barra').max,2);
  const caixa=el('#plano-lista').children[1].children[0].children[0];caixa.checked=true;caixa.eventos.change();
  assert.equal(el('#inicio-concluidas').textContent,'2');assert.equal(el('#inicio-pendentes').textContent,'0');
  el('#plano-lista').children[1].children[1].eventos.click();assert.equal(el('#inicio-concluidas').textContent,'1');
  const backup=require('./dist/plano-json').exportarPlanoJson(new Map([[chave(acoes[2]),false]]),acoes);
  el('#arquivo-plano').files=[{name:'antigo.json',size:backup.length,text:async()=>backup}];
  await el('#arquivo-plano').eventos.change();assert.equal(el('#inicio-pendentes').textContent,'1');assert.equal(el('#inicio-concluidas').textContent,'1');
  const escritasAntes=escritas;
  eventosJanela.storage({key:'oqdpf-plano-v1',newValue:'{}'});
  assert.equal(el('#inicio-progresso').hidden,true);assert.equal(escritas,escritasAntes);
  const html=fs.readFileSync('dist/index.html','utf8');
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
  const {resumirAtividadesEcoa, iniciarAtividadesEcoa}=require('./dist/atividades');
  const {novoDesafio,concluirDiaDesafio}=require('./dist/desafio');
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
 const {normalizarBuscaGuia,encontrarGuias,iniciarBuscaGuias}=require('./dist/aprender');
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
 const campo=el('buscar-ods-guia');campo.value='ODS 6';campo.eventos.input();
 assert.equal(cards.filter(c=>!c.hidden).length,1);assert.equal(cards[5].hidden,false);
 assert.equal(el('guias-contagem').textContent,'1 objetivo encontrado');
 campo.value='inexistente';ui.atualizar();assert.equal(el('guias-vazio').hidden,false);
 el('guias-mostrar-todos').eventos.click();assert.equal(campo.value,'');assert.equal(campo.focado,true);assert.equal(cards.filter(c=>!c.hidden).length,17);
 campo.value='água';ui.atualizar();el('limpar-busca-guias').eventos.click();assert.equal(el('guias-vazio').hidden,true);
 console.log('OK Aprender: busca sem acentos/caixa, número exato, termos, vazio, limpeza, foco e cartões preservados');
}
validarBuscaGuias();

async function validarPontosAutomaticos() {
 const api=require('./dist/pontos-osm');
 const {linksSugestaoOSM,iniciarPontosOSM}=require('./dist/pontos-osm-ui');
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
 assert.equal(linksSugestaoOSM('Olá').email,'');assert.match(linksSugestaoOSM('Olá','teste@example.org','5511999999999').whatsapp,/wa.me\/5511999999999/);
 // DOM simulado: conteúdo externo só pode entrar como texto; preservação local, offline e localização opt-in.
 const criar=()=>({children:[],eventos:{},dataset:{},value:'',hidden:false,textContent:'',append(...x){this.children.push(...x);},prepend(...x){this.children.unshift(...x);},replaceChildren(...x){this.children=x;},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){this.eventos[k]=f;},focus(){},scrollIntoView(){},select(){},click(){this.eventos.click?.();},set innerHTML(v){throw Error('HTML externo não permitido');}});
 const els=new Map(),el=id=>{if(!els.has(id))els.set(id,criar());return els.get(id);};
 const chips=Object.keys(api.categoriasOSM).map(c=>{const e=criar();e.dataset.categoriaOsm=c;return e;});const eventos={};let localizacoes=0,consultas=0;
 const ambiente={fetch:async()=>({ok:true,json:async()=>[fixo]}),sessionStorage:storage,localStorage:{setItem(){throw Error('Não pode alterar Meus lugares');}},navigator:{onLine:false,geolocation:{getCurrentPosition(ok,erro){localizacoes++;erro();}}},addEventListener:(k,f)=>eventos[k]=f};
 let receberUI;
 const ui=iniciarPontosOSM({getElementById:el,createElement:criar,querySelectorAll:()=>chips,addEventListener:(k,f)=>eventos[k]=f},ambiente,{...api,criarClienteOSM:()=>({consultar:async()=>{consultas++;return ps;}}),criarBuscaOSM:({receber})=>{receberUI=receber;return {cancelar(){},agendar(){}}}});
 await avancar(0);await avancar(0);chips[3].click();assert.equal(consultas,0);assert.equal(el('osm-lista').children.length,1);assert.match(el('osm-status').textContent,/offline/);assert.equal(localizacoes,0);
 el('osm-perto').click();assert.equal(localizacoes,1);assert.equal(el('osm-perto').disabled,false);
 const texto=JSON.stringify(el('osm-lista').children);assert.match(texto,/Verificado pelo Ecoa/);assert.match(texto,/Verificado em 01\/01\/2026/);
 ambiente.navigator.onLine=true;receberUI(ps);assert.equal(el('osm-lista').children.length,2);assert.ok(JSON.stringify(el('osm-lista').children).includes('<img src=x onerror=alert(1)>'));
 ambiente.navigator.onLine=false;eventos.offline();assert.equal(el('osm-lista').children.length,1);
 el('osm-sug-form').eventos.submit({preventDefault(){}});assert.match(el('osm-contato-aviso').textContent,/não foi enviada/);assert.equal(el('osm-enviar-email').hidden,true);
 console.log('OK Pontos OSM: consultas por categoria, limite, cache de sessão/TTL, 429/504 e mirrors, debounce 600ms, cancelamento, resposta tardia/vazia, mesclagem, datas, offline e localização opt-in');
}
validarPontosAutomaticos().catch(e=>{console.error(e);process.exitCode=1;});
