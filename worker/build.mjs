import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { extname } from 'node:path';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};
const arquivos = {};
for (const caminho of await readdir('public', { recursive: true })) {
  const tipo = mime[extname(caminho)];
  if (!tipo || caminho.startsWith('server/')) continue;
  arquivos['/' + caminho] = [tipo, (await readFile('public/' + caminho)).toString('base64')];
}
await mkdir('worker-dist/server', { recursive: true });
await mkdir('worker-dist/.openai', { recursive: true });
// A configuração da hospedagem anterior é local e opcional no GitHub.
try { await copyFile('.openai/hosting.json', 'worker-dist/.openai/hosting.json'); }
catch (erro) { if (erro.code !== 'ENOENT') throw erro; }
await writeFile('worker-dist/server/index.js',
  'const arquivos = ' + JSON.stringify(arquivos) + ';\n' + await readFile('worker/index.mjs', 'utf8'));
