import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { extname } from 'node:path';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.json': 'application/manifest+json; charset=utf-8'
};
const arquivos = {};
for (const caminho of await readdir('dist', { recursive: true })) {
  const tipo = mime[extname(caminho)];
  if (!tipo || caminho.startsWith('server/')) continue;
  arquivos['/' + caminho] = [tipo, (await readFile('dist/' + caminho)).toString('base64')];
}
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
await writeFile('dist/server/index.js',
  'const arquivos = ' + JSON.stringify(arquivos) + ';\n' + await readFile('worker/index.mjs', 'utf8'));
