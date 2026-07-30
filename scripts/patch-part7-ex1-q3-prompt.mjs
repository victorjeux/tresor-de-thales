import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const p = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'client',
  'content',
  'part7',
  'scenes.json',
);
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const q = d.scenes
  .find((s) => s.id === 'p7_1_pont_recif_silas')
  .steps.find((t) => t.id === 'p7_ex1_q3_parallel');

// Aligné sur la réponse attendue « oui » (= parallèles)
q.prompt =
  'Silas affirme que les segments (CD) et (BE) ne sont pas parallèles. Les droites (CD) et (BE) sont-elles parallèles ?';

// Aussi accepter non pour « a-t-il raison » n’est pas l’objectif :
// la question porte sur le parallélisme (réciproque de Thalès).
fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
console.log(q.prompt);
