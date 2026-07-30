import fs from 'fs';

const p = 'client/content/part1/scenes.json';
const c = JSON.parse(fs.readFileSync(p, 'utf8'));

function fix(s) {
  if (typeof s !== 'string') return s;
  let out = s;
  out = out.replace(
    /longueur de l[’']hypoténuse ([A-Z]{2,3})\b/g,
    "longueur de l’hypoténuse [$1]",
  );
  out = out.replace(/longueur de ([A-Z]{2,3})\b/g, 'longueur de [$1]');
  out = out.replace(/\[\[([A-Z]{2,3})\]\]/g, '[$1]');
  return out;
}

function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) {
    n.forEach(walk);
    return;
  }
  for (const [k, v] of Object.entries(n)) {
    if (
      typeof v === 'string' &&
      ![
        'math',
        'correctionMath',
        'tex',
        'id',
        'image',
        'illustration',
        'background',
        'alt',
        'illustrationAlt',
      ].includes(k)
    ) {
      n[k] = fix(v);
    } else if (v && typeof v === 'object') walk(v);
  }
}

walk(c);
fs.writeFileSync(p, JSON.stringify(c, null, 2) + '\n');
const t = c.scenes.find((s) => s.id === 'p1_6_entrainement');
console.log(t.exerciseQueue.exercises.p1_train_3.prompt);
console.log(t.exerciseQueue.exercises.p1_train_4.prompt);
