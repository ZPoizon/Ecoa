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
  for (const arquivo of ['index.html', 'vendor/pdf-lib.min.js', 'guias.js', 'plano-json.js', 'ods/17.webp']) {
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
