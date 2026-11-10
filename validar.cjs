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
  runInNewContext(readFileSync('dist/sw.js', 'utf8'), {
    URL, Request,
    fetch: async pedido => { rede.push(pedido.url); return 'rede'; },
    self: {
      registration: { scope: origem },
      addEventListener: (nome, callback) => { eventos[nome] = callback; },
      clients: { claim: async () => { assumiuControle = true; } }
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
  for (const arquivo of ['index.html', 'vendor/pdf-lib.min.js', 'guias.js', 'plano-json.js', 'acessibilidade.js', 'acessibilidade.css', 'compartilhar.js', 'compartilhar-ui.js', 'ods/17.webp']) {
    assert.ok(armazenados.has(origem + arquivo));
  }
  console.log('OK Instalação inclui arquivos necessários para guias e PDF offline');
  await rodar('activate');
  assert.deepEqual(excluidos, ['oqdpf:' + origem + ':antigo']);
  assert.ok(assumiuControle);
  console.log('OK Ativação preserva caches de outros apps');

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
  assert.equal(requisitar(origem + 'api/onu?ods=6'), undefined);
  assert.equal(requisitar('https://brasil.un.org/pt-br/sdgs'), undefined);
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
  const css = readFileSync('dist/acessibilidade.css','utf8');
  const base = readFileSync('dist/style.css','utf8');
  const variaveis = bloco => Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(m=>[m[1],m[2]]));
  const claro = {...variaveis(base.split('}')[0]),...variaveis(css.match(/:root\s*\{([^}]+)/)[1])};
  const escuro = {...claro,...variaveis(css.match(/:root\[data-tema="escuro"\]\s*\{([^}]+)/)[1])};
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
  for (const cor of ['#fff0b9','#d7edf8','#f9dfd3','#ece0fa','#dbedd3']) assert.ok(contraste('#20352a',cor)>=4.5);
  for (const cor of ['#f7f7f2','#cfdfa7','#e1ebdb']) assert.ok(contraste(cor,'#15382c')>=4.5);
  assert.ok(contraste('#ffffff','#173b2d')>=4.5);
  console.log(`OK Contraste: paletas de texto >= 4,5:1 (mínimo ${minimo.toFixed(2)}:1), controles e foco >= 3:1`);
}
validarAcessibilidade();

function validarCartoesGuias() {
  const {runInNewContext} = require('node:vm');
  const {readFileSync} = require('node:fs');
  const elemento = () => ({dataset:{},children:[],eventos:{},value:'',
    setAttribute(k,v){this[k]=v;},append(...itens){this.children.push(...itens);},
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
  assert.equal(cartoes[0]['aria-pressed'],'true');
  cartoes[5].eventos.click();
  assert.equal(el('#seletor-guia').value,6);
  assert.equal(cartoes[5]['aria-pressed'],'true');
  assert.equal(cartoes[0]['aria-pressed'],'false');
  assert.equal(el('#guia-nome').focado,true);
  assert.equal(el('img').src,'ods/6.webp');
  el('#buscar-guia').eventos.click();
  assert.equal(buscou,true);
  assert.equal(el('input[value="6"]').checked,true);
  console.log('OK Guias: 17 cartões, seleção única, foco no conteúdo e busca do ODS escolhido');
}
validarCartoesGuias();

function validarIsolamentoTema() {
  const {runInNewContext} = require('node:vm');
  const {readFileSync} = require('node:fs');
  const elemento = (dataset = {}) => ({dataset,eventos:{},textContent:'',
    addEventListener(nome,cb){this.eventos[nome]=cb;},replaceChildren(){},append(){},setAttribute(){},focus(){}});
  // O atributo data-tema também existe no HTML para controlar a aparência.
  const raiz = elemento({tema:'claro'});
  const atalho = elemento({tema:'6,14'});
  const elementos = new Map();
  const el = id => {if (!elementos.has(id)) elementos.set(id,elemento());return elementos.get(id);};
  let buscas=0, resets=0;
  const campos=[{value:'6',checked:false},{value:'14',checked:false},{value:'1',checked:true}];
  const doc={querySelector:el,addEventListener(){},createElement:elemento,
    querySelectorAll:seletor => {
      // Reproduz a correspondência do seletor no HTML raiz versus botões da seção Explorar.
      return seletor.includes('#explorar button') ? [atalho] : [raiz,atalho];
    }};
  runInNewContext(readFileSync('dist/plano.js','utf8'),{
    document:doc,localStorage:{getItem:()=>null,setItem(){}},acoes,encontradas:[],indice:0,
    form:{reset(){resets++;},elements:{},querySelectorAll:()=>campos},buscar(){buscas++;}
  });
  // Um clique no tema borbulha até o HTML e não deve disparar o buscador.
  raiz.eventos.click?.();
  assert.equal(buscas,0);
  assert.equal(resets,0);
  atalho.eventos.click();
  assert.equal(buscas,1);
  assert.equal(resets,1);
  assert.deepEqual(campos.map(c=>c.checked),[true,true,false]);
  console.log('OK Regressão: clique no tema não aciona busca; atalhos de ODS continuam funcionando');
}
validarIsolamentoTema();
