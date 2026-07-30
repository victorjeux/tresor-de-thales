import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const checks = [
  'index.html',
  '404.html',
  '.nojekyll',
  'build-manifest.json',
  'js/main.js',
  'shared/saveQueue.js',
  'shared/progression.js',
  'content/part7/scenes.json',
  'assets/diagrams/part7/p7-exercice-1-aquathlon-schema.png',
  'vendor/katex/katex.min.js',
];

let ok = true;
for (const c of checks) {
  const exists = fs.existsSync(path.join(dist, c));
  console.log(exists ? 'OK ' : 'MISSING ', c);
  if (!exists) ok = false;
}

const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
console.log('offline flag', index.includes('__THALES_OFFLINE__'));
console.log('base path in index', index.includes('/tresor-de-thales/'));

const main = fs.readFileSync(path.join(dist, 'js/main.js'), 'utf8');
console.log(
  'main shared import',
  main.match(/from ['"][^'"]*shared[^'"]+['"]/)?.[0],
);
console.log(
  'main content url',
  main.match(/url:\s*['"][^'"]*content[^'"]+['"]/)?.[0],
);

const scene = JSON.parse(
  fs.readFileSync(path.join(dist, 'content/part7/scenes.json'), 'utf8'),
);
console.log('diagram path', scene.assets.diagrams.ex1);

if (!ok) process.exit(1);
console.log('dist OK');
