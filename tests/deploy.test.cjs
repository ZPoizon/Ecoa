const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const raiz = path.resolve(__dirname, '..');

test('build limpo, estático, repetível e sem alterar os fontes', () => {
  const antes = fs.readFileSync('public/index.html', 'utf8');
  execFileSync(process.execPath, ['build.cjs'], { cwd: raiz, env: { ...process.env, SITE_URL: 'https://ecoa.example' } });
  assert.equal(fs.readFileSync('public/index.html', 'utf8'), antes);
  assert.match(fs.readFileSync('dist/index.html', 'utf8'), /https:\/\/ecoa.example\//);
  assert.ok(fs.existsSync('dist/sw.js'));
  assert.ok(fs.existsSync('dist/icons/icon-512.png'));
  assert.ok(!fs.existsSync('dist/server'));
  assert.ok(!fs.existsSync('dist/.openai'));
  fs.writeFileSync('dist/obsoleto.txt', 'antigo');
  execFileSync(process.execPath, ['build.cjs'], { cwd: raiz });
  assert.ok(!fs.existsSync('dist/obsoleto.txt'));
  const config = require('../vercel.json');
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, 'dist');
  assert.equal(config.buildCommand, 'npm run build');
  assert.ok(!config.rewrites && !config.routes);
  assert.ok(!fs.existsSync('server.cjs'));
});

test('API indisponível mantém contrato; rejeita métodos não permitidos', async () => {
  const handler = require('../api/onu.js');
  const original = global.fetch;
  global.fetch = async () => { throw new Error('offline'); };
  const resposta = { status(n) { this.code = n; return this; }, setHeader() {}, json(data) { this.body = data; }, end() {} };
  try {
    await handler({ method: 'GET', query: { ods: '6' } }, resposta);
    assert.equal(resposta.code, 200);
    assert.deepEqual(resposta.body, { iniciativas: null, historias: null });
    await handler({ method: 'POST' }, resposta);
    assert.equal(resposta.code, 405);
  } finally { global.fetch = original; }
});

for (const preview of [false, true]) {
  test(`HTTP ${preview ? 'preview' : 'dev'}: início e recursos sem depender da API`, async () => {
    const child = spawn(process.execPath, ['scripts/dev.cjs', ...(preview ? ['--preview'] : [])], { cwd: raiz, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      const porta = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Servidor não iniciou')), 5000);
        child.once('error', reject);
        child.stdout.on('data', data => {
          const numero = String(data).match(/localhost:(\d+)/);
          if (numero) { clearTimeout(timer); resolve(numero[1]); }
        });
      });
      const base = `http://127.0.0.1:${porta}`;
      const inicio = await fetch(base);
      assert.equal(inicio.status, 200);
      assert.match(inicio.headers.get('content-type'), /text\/html/);
      const html = await inicio.text();
      assert.match(html, /Ecoa/);
      for (const exigido of [
        'Busque uma cidade, endereço, CEP ou local',
        'Nenhum local encontrado com estes filtros.',
        'Buscar outra cidade',
        'Ampliar a área'
      ]) assert.ok(html.includes(exigido), exigido);
      for (const proibido of [
        'cadastro-pontos-ui.js', 'Marcar um ponto', 'Enviar ponto',
        'id="cadastro-abrir"', 'id="cadastro-painel"', 'Ainda não temos pontos cadastrados'
      ]) assert.ok(!html.includes(proibido), proibido);
      const recursos = [...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)].map(m => m[1]).filter(u => !/^(https?:|data:|mailto:)/.test(u));
      for (const recurso of new Set([...recursos, 'manifest.json', 'sw.js', 'sobre.html'])) {
        assert.equal((await fetch(new URL(recurso, base))).status, 200, recurso);
      }
      assert.equal((await fetch(base + '/nao-existe.js')).status, 404);
      assert.equal((await fetch(base + '/%ZZ')).status, 400);
      assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
    } finally { child.kill(); }
  });
}
