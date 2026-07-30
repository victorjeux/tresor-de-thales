/**
 * Correctif p4_4_balises_thales : file pédagogique A→B→C→D
 * (indépendante de l’ordre des clics sur les balises).
 * Ne modifie pas le contenu des exercices (cloze).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const scenesPath = path.join(root, 'client/content/part4/scenes.json');

const content = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
const scene = content.scenes.find((s) => s.id === 'p4_4_balises_thales');
if (!scene) {
  console.error('scène p4_4_balises_thales introuvable');
  process.exit(1);
}

const QUEUE_IDS = ['p4_balise_a', 'p4_balise_b', 'p4_balise_c', 'p4_balise_d'];
const exercises = {};

for (const hs of scene.hotspots || []) {
  const step = hs.sequence?.[0];
  if (step?.id && QUEUE_IDS.includes(step.id)) {
    exercises[step.id] = { ...step };
    // completeScene reste false ; la sortie est gérée par la file
    exercises[step.id].completeScene = false;
  }
}

for (const id of QUEUE_IDS) {
  if (!exercises[id]) {
    console.error('exercice manquant:', id);
    process.exit(1);
  }
}

// Outro = ancien onAllRequired (dialogue de clôture)
const outro = scene.onAllRequired?.lines || [
  {
    speaker: 'Alizée',
    text: 'Les quatre balises sont réglées. Les parallèles donnent bien les longueurs manquantes.',
  },
  {
    speaker: 'Euclide',
    text: 'Il reste une vérification plus concrète : régler le compas marin.',
  },
  {
    speaker: 'Nérée',
    text: 'Cette fois, pas de schéma donné. Il faudra le construire sur le cahier.',
  },
];

scene.prompt =
  'Touchez n’importe quelle balise pour l’exercice suivant (A → B → C → D).';
scene.requireInteraction = true;
scene.next = 'p4_5_finale_compas_marin';

scene.exerciseQueue = {
  ids: QUEUE_IDS,
  introFlag: 'p4_balise_intro_shown',
  outro,
  exercises,
};

// Hotspots : queueMember, plus de sequence ni required
// (la sortie dépend uniquement de la file d’exercices)
const positions = {
  balise_a: { x: 15, y: 55, w: 14, h: 26, label: 'Balise A' },
  balise_b: { x: 38, y: 51, w: 15, h: 28, label: 'Balise B' },
  balise_c: { x: 59, y: 52, w: 15, h: 28, label: 'Balise C' },
  balise_d: { x: 79, y: 53, w: 15, h: 28, label: 'Balise D' },
};

scene.hotspots = ['balise_a', 'balise_b', 'balise_c', 'balise_d'].map((id) => ({
  id,
  label: positions[id].label,
  x: positions[id].x,
  y: positions[id].y,
  w: positions[id].w,
  h: positions[id].h,
  queueMember: true,
  inDecor: true,
  repeatable: true,
  advancesStory: false,
}));

// onAllRequired plus nécessaire : géré par exerciseQueue.outro + next
delete scene.onAllRequired;

fs.writeFileSync(scenesPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');

console.log('p4_4_balises_thales → exerciseQueue');
console.log('ids:', scene.exerciseQueue.ids);
console.log(
  'hotspots queueMember:',
  scene.hotspots.filter((h) => h.queueMember).map((h) => h.id),
);
console.log('exercises:', Object.keys(scene.exerciseQueue.exercises));
console.log('outro lines:', scene.exerciseQueue.outro.length);
