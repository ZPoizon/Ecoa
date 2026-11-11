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
  for (const arquivo of ['index.html', 'vendor/pdf-lib.min.js', 'guias.js', 'plano-json.js', 'enderecos.js', 'cidade.js', 'cidade-ui.js', 'pontos-modelo.json', 'estimativa.js', 'estimativa-ui.js', 'progresso.js', 'desafio.js', 'desafio-ui.js', 'quiz.js', 'quiz-ui.js', 'acessibilidade.js', 'acessibilidade.css', 'compartilhar.js', 'compartilhar-ui.js', 'ods/17.webp']) {
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
    atualizarProgressoPlano(){},document:doc,localStorage:{getItem:()=>null,setItem(){}},acoes,encontradas:[],indice:0,
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
  assert.throws(()=>c.lerJsonCidade('{'),/JSON/);assert.throws(()=>c.lerJsonCidade('a'.repeat(500001)),/500 KB/);
  assert.equal(c.unirPontosCidade([p],[{...p,nome:'não sobrescrever'}])[0].nome,p.nome);
  assert.equal(c.unirPontosCidade([p],[{...p,id:'segundo'}]).length,2);
  assert.equal(c.filtrarPontosCidade([p],'sao paulo','coleta').length,1);
  assert.equal(c.filtrarPontosCidade([p],'são','horta').length,0);
  const storage={valor:null,setItem(k,v){this.valor=v;},getItem(){return this.valor;}};
  c.salvarPontosCidade(storage,[p]);assert.equal(c.lerJsonCidade(storage.valor)[0].id,p.id);
  assert.throws(()=>c.salvarPontosCidade({setItem(){throw Error();}},[p]),/Não foi possível salvar/);
  const ui=require('./dist/cidade-ui');
  const {iniciarCidade,carregarLeafletCidade}=ui;
  const elementos=new Map();
  const criar=()=>({value:'',textContent:'',children:[],eventos:{},setAttribute(k,v){this[k]=v;},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},addEventListener(k,v){this.eventos[k]=v;},focus(){this.focado=true;},reset(){},remove(){},click(){this.clicado=true;}});
  const el=id=>{if(!elementos.has(id))elementos.set(id,criar());return elementos.get(id);};
  const doc={getElementById:el,createElement:criar,head:criar(),body:criar()};
  const ambiente={localStorage:storage,crypto:{randomUUID:()=> 'novo'},confirm:()=>true,URL:{createObjectURL:()=> 'blob:teste',revokeObjectURL(){}},setTimeout:fn=>{fn();return 1;},clearTimeout(){}};
  await iniciarCidade(doc,ambiente,c);
  assert.equal(el('cidade-lista').children.length,1);
  el('cidade-filtro').value='outra';el('cidade-filtro').eventos.input();assert.equal(el('cidade-lista').children.length,0);
  el('cidade-filtro').value='';el('cidade-filtro').eventos.input();
  el('cidade-lista').children[0].children.at(-1).children.at(-1).eventos.click();assert.equal(c.lerJsonCidade(storage.valor).length,0);
  for(const campo of Object.keys(p).filter(k=>k!=='id'))el('ponto-'+campo).value=String(p[campo]);
  el('cidade-form').eventos.submit({preventDefault(){}});assert.equal(c.lerJsonCidade(storage.valor).length,1);
  const anterior=storage.valor;
  await el('cidade-importar').eventos.change({target:{files:[{name:'ruim.json',size:2,text:async()=>'{'}],value:'x'}});assert.equal(storage.valor,anterior);assert.match(el('cidade-status').textContent,/JSON/);
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
