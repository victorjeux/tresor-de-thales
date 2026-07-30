/**
 * Build statique pour GitHub Pages.
 *
 * Usage :
 *   node scripts/build-pages.mjs
 *   BASE_PATH=/tresor-de-thales node scripts/build-pages.mjs
 *
 * Produit le dossier dist/ avec :
 *   - index.html, css/, js/, assets/, content/, vendor/, shared/
 *   - chemins préfixés pour le base path GH Pages
 *   - mode offline (localStorage, sans API Express)
 *   - .nojekyll + 404.html (SPA)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** Base path GitHub Pages (sans slash final, sauf racine) */
function normalizeBase(raw) {
  let b = (raw ?? process.env.BASE_PATH ?? '/tresor-de-thales').trim();
  if (!b || b === '/') return '';
  if (!b.startsWith('/')) b = `/${b}`;
  return b.replace(/\/+$/, '');
}

const BASE = normalizeBase();
const OUT = path.join(root, process.env.OUT_DIR || 'dist');
const CLIENT = path.join(root, 'client');
const SHARED = path.join(root, 'shared');

const TEXT_EXT = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.map',
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rimraf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    if (name === '.DS_Store') continue;
    const from = path.join(src, name);
    const to = path.join(dest, name);
    const st = fs.statSync(from);
    if (st.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

/**
 * Réécrit les chemins absolus du site vers BASE + path.
 * Ex. /assets/foo → /tresor-de-thales/assets/foo
 */
function rewritePaths(content, base) {
  if (!base) return content;
  let out = content;

  // Évite de double-préfixer
  const already = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const prefixAbs = (match, quote, p1) => {
    if (p1.startsWith(base + '/') || p1 === base) return match;
    // Ne pas toucher aux protocoles / data URIs déjà exclus par le motif
    return `${quote}${base}${p1}${quote}`;
  };

  // Imports et chaînes JS/HTML : '/shared/...' "/assets/..."
  out = out.replace(/(['"])(\/(?:shared|assets|content|vendor|css|js)\/[^'"]*)\1/g, prefixAbs);

  // href="/..." src="/..." (hors //cdn)
  out = out.replace(
    /(\b(?:href|src)=)(['"])(\/(?!\/)[^'"]*)\2/gi,
    (m, attr, q, p1) => {
      if (p1.startsWith(base + '/') || p1 === base) return m;
      return `${attr}${q}${base}${p1}${q}`;
    },
  );

  // CSS url('/assets...') url(/assets...)
  out = out.replace(
    /url\(\s*(['"]?)(\/(?:assets|vendor|css|js|content|shared)\/[^'")]+)\1\s*\)/g,
    (m, q, p1) => {
      if (p1.startsWith(base + '/')) return m;
      const quote = q || '';
      return `url(${quote}${base}${p1}${quote})`;
    },
  );

  // location.href = '/' ou window.location.href = '/'
  out = out.replace(
    /(location\.href\s*=\s*)(['"])\/\2/g,
    `$1$2${base || '/'}$2`,
  );

  // PART_LOADERS url déjà couvert par /content/

  // Guard accidental double base
  const double = new RegExp(`${already}${already}`, 'g');
  out = out.replace(double, base);

  return out;
}

function walkFiles(dir, onFile) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkFiles(full, onFile);
    else onFile(full);
  }
}

function rewriteTree(dir, base) {
  let n = 0;
  walkFiles(dir, (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!TEXT_EXT.has(ext)) return;
    const raw = fs.readFileSync(file, 'utf8');
    const next = rewritePaths(raw, base);
    if (next !== raw) {
      fs.writeFileSync(file, next, 'utf8');
      n += 1;
    }
  });
  return n;
}

function injectIndexConfig(indexPath, base) {
  let html = fs.readFileSync(indexPath, 'utf8');
  // Pas de <base> : les chemins sont déjà absolus avec le préfixe BASE
  // (évite le double préfixage).
  const boot = `
  <script>
    // Config build statique (GitHub Pages)
    globalThis.__THALES_BASE__ = ${JSON.stringify(base || '')};
    globalThis.__THALES_OFFLINE__ = true;
  </script>`;

  if (!html.includes('__THALES_OFFLINE__')) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${boot}`);
  }
  // robots : publication OK
  html = html.replace(
    /content="noindex,\s*nofollow"/i,
    'content="index, follow"',
  );
  fs.writeFileSync(indexPath, html, 'utf8');
}

function writeNoJekyll(outDir) {
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');
}

function writeSpa404(outDir) {
  // GitHub Pages : 404.html = copie de index pour rechargement SPA
  const index = path.join(outDir, 'index.html');
  if (fs.existsSync(index)) {
    fs.copyFileSync(index, path.join(outDir, '404.html'));
  }
}

function ensureKatex() {
  const katexDest = path.join(CLIENT, 'vendor', 'katex');
  if (!fs.existsSync(path.join(katexDest, 'katex.min.js'))) {
    console.log('→ Copie KaTeX (postinstall)…');
    execSync('node scripts/copy-katex.js', { cwd: root, stdio: 'inherit' });
  }
}

// --- run ---
console.log('Build GitHub Pages — Le Trésor de Thalès');
console.log(`  BASE_PATH = ${BASE || '/'} (site root if empty)`);
console.log(`  OUT_DIR   = ${path.relative(root, OUT)}`);

ensureKatex();

rimraf(OUT);
ensureDir(OUT);

console.log('→ Copie client/…');
copyDir(CLIENT, OUT);

console.log('→ Copie shared/…');
copyDir(SHARED, path.join(OUT, 'shared'));

console.log('→ Réécriture des chemins…');
const rewritten = rewriteTree(OUT, BASE);
console.log(`  ${rewritten} fichier(s) texte mis à jour`);

injectIndexConfig(path.join(OUT, 'index.html'), BASE);
writeNoJekyll(OUT);
writeSpa404(OUT);

// Manifeste simple
const manifest = {
  name: 'Le Trésor de Thalès',
  basePath: BASE || '/',
  offline: true,
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(OUT, 'build-manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8',
);

// Stats
let files = 0;
let bytes = 0;
walkFiles(OUT, (f) => {
  files += 1;
  bytes += fs.statSync(f).size;
});

console.log('');
console.log('Build terminé.');
console.log(`  Fichiers : ${files}`);
console.log(`  Taille   : ${(bytes / (1024 * 1024)).toFixed(1)} Mo`);
console.log(`  Sortie   : ${OUT}`);
console.log('');
console.log('Publication GitHub Pages :');
console.log('  1. npm run build:pages');
console.log('  2. Déployer le dossier dist/ (Actions ou branche gh-pages)');
console.log(`  3. Site : https://<user>.github.io${BASE || ''}/`);
