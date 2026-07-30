import fs from 'fs';

const p = 'client/content/part1/scenes.json';
const c = JSON.parse(fs.readFileSync(p, 'utf8'));

function stripFigureLabelBrackets(labels) {
  if (!labels || typeof labels !== 'object') return;
  for (const [k, v] of Object.entries(labels)) {
    if (typeof v === 'string') {
      // [AB] → AB (labels de figure uniquement)
      labels[k] = v.replace(/\[([A-Z]{1,3})\]/g, '$1');
    }
  }
}

function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.figureLabels) stripFigureLabelBrackets(n.figureLabels);
  if (Array.isArray(n)) n.forEach(walk);
  else Object.values(n).forEach(walk);
}
walk(c);

// Encrier : remonter vers l'encrier + plume (droite de la table)
const v = c.scenes.find((s) => s.id === 'p1_3_verification');
const enc = v.hotspots.find((h) => h.id === 'opt_encrier_p3');
Object.assign(enc, { x: 72, y: 48, w: 10, h: 12 });

fs.writeFileSync(p, JSON.stringify(c, null, 2) + '\n');

const q = v.hotspots[0].sequence.find((s) => s.type === 'quiz');
console.log('labels', q.figureLabels);
console.log(
  'opts still brackets',
  q.options.map((o) => o.text),
);
console.log('encrier', enc);
