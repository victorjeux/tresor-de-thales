/**
 * Supprime les questions de trigonométrie (3b, 3c) de l'exercice 1 part7.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = path.join(root, 'client', 'content', 'part7', 'scenes.json');
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const scene = d.scenes.find((s) => s.id === 'p7_1_pont_recif_silas');
if (!scene) throw new Error('p7_1_pont_recif_silas manquante');

scene.steps = (scene.steps || []).filter(
  (st) => st.id !== 'p7_ex1_q4_angle' && st.id !== 'p7_ex1_q5_valid',
);

const q3 = scene.steps.find((st) => st.id === 'p7_ex1_q3_parallel');
if (!q3) throw new Error('p7_ex1_q3_parallel manquante');

q3.title = 'Exercice 1/5 - Question 3';
q3.nextStepId = 'p7_ex1_transition';
q3.setFlags = { p7Exercise1Completed: true };
q3.success = "Silas recule d'un pas. Premier plan brisé.";

// Nettoyer coherentNumericGroups orphelin si r1/r2 absents
if (q3.coherentNumericGroups) {
  const ids = Object.keys(q3.fields || {});
  if (!ids.includes('r1') || !ids.includes('r2')) {
    delete q3.coherentNumericGroups;
  }
}

fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');

const clozes = d.scenes.reduce(
  (n, s) => n + (s.steps || []).filter((t) => t.type === 'cloze').length,
  0,
);
console.log(
  scene.steps
    .map(
      (s) =>
        `${s.id} -> ${s.nextStepId || s.nextSceneId || '-'}${
          s.setFlags ? ' ' + JSON.stringify(s.setFlags) : ''
        }`,
    )
    .join('\n'),
);
console.log('clozes total:', clozes);
