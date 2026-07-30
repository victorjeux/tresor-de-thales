/**
 * Copie KaTeX (CSS, polices, JS) dans client/vendor pour un service local (sans CDN).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'katex', 'dist');
const dest = path.join(root, 'client', 'vendor', 'katex');

if (!fs.existsSync(src)) {
  console.warn('KaTeX introuvable (node_modules/katex). Lancez npm install.');
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });

function copyRecursive(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
  } else {
    fs.copyFileSync(from, to);
  }
}

copyRecursive(src, dest);
console.log('KaTeX copié vers client/vendor/katex');
