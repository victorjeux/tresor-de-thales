/**
 * Copie les assets partie 1 depuis « images références » (racine ou sous-dossiers)
 * vers client/assets/... par nom exact. N’invente aucun fichier.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function findImagesRoot() {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const dir = entries.find((e) => e.isDirectory() && e.name.startsWith('images'));
  if (!dir) throw new Error('Dossier images références introuvable');
  return path.join(root, dir.name);
}

function findFileRecursive(dir, fileName, hits = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) findFileRecursive(full, fileName, hits);
    else if (ent.name === fileName) hits.push(full);
  }
  return hits;
}

const BACKGROUNDS = [
  'p1-entree-recif.png',
  'p1-dallage-pythagore.png',
  'p1-table-carnet.png',
  'p1-balises-entrainement.png',
  'p1-passage-exterieur.png',
  'p1-passage-interieur.png',
  'p1-sanctuaire-fragment.png',
  'p1-trace-silas.png',
];

const OBJECTS = [
  'carte-recif.png',
  'carnet-euclide-ouvert.png',
  'dalle-carree-gravee.png',
  'balise-rouge.png',
  'balise-verte.png',
  'balises-nautiques.png',
  'fragment-carte-1.png',
  'indice-silas.png',
];

const imgRoot = findImagesRoot();
const bgOut = path.join(root, 'client', 'assets', 'backgrounds', 'part1');
const objOut = path.join(root, 'client', 'assets', 'objects', 'part1');
fs.mkdirSync(bgOut, { recursive: true });
fs.mkdirSync(objOut, { recursive: true });

function copyNamed(names, outDir, label) {
  const report = [];
  for (const name of names) {
    const hits = findFileRecursive(imgRoot, name);
    if (hits.length === 0) {
      report.push({ name, status: 'MISSING' });
      continue;
    }
    const src = hits[0];
    fs.copyFileSync(src, path.join(outDir, name));
    report.push({ name, status: 'OK', src });
  }
  console.log(`\n=== ${label} ===`);
  for (const r of report) {
    console.log(r.status === 'OK' ? `OK  ${r.name}\n    ← ${r.src}` : `MISS ${r.name}`);
  }
  return report;
}

const bg = copyNamed(BACKGROUNDS, bgOut, 'DÉCORS');
const obj = copyNamed(OBJECTS, objOut, 'OBJETS');

// Repli décor (non p1-*) pour fallback moteur
const recif = findFileRecursive(imgRoot, 'recif-angles-droits.png');
if (recif[0]) {
  fs.copyFileSync(recif[0], path.join(bgOut, 'recif-angles-droits.png'));
  console.log('\nOK  recif-angles-droits.png (fallback)');
}

const missingBg = bg.filter((r) => r.status === 'MISSING').length;
process.exitCode = missingBg > 0 ? 2 : 0;
