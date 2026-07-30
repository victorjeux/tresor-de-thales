/**
 * Corrections Thalès Partie 7 : égalités de produits (sans « rapport »).
 */
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

function findStep(id) {
  for (const s of d.scenes) {
    const st = (s.steps || []).find((t) => t.id === id);
    if (st) return st;
  }
  return null;
}

const updates = {
  p7_ex1_q3_parallel: [
    'AB = AC + CB = 480 + 120 = 600.',
    '\\dfrac{AC}{AB} = \\dfrac{480}{600} = 0,8',
    '\\dfrac{AD}{AE} = \\dfrac{200}{250} = 0,8',
    'Les points A, C, B sont alignés dans cet ordre et les points A, D, E sont alignés dans cet ordre.',
    "Les deux résultats sont égaux, donc d'après la réciproque du théorème de Thalès les droites (CD) et (BE) sont parallèles.",
  ],
  p7_ex2_q3_ob: [
    'On cherche la longueur OB.',
    'Dans la figure :',
    '— les points O, A, B sont alignés ;',
    '— les points O, D, C sont alignés ;',
    '— les droites (AD) et (BC) sont parallèles.',
    'Les triangles OAD et OBC sont donc en configuration de Thalès.',
    "D'après le théorème de Thalès :",
    '\\dfrac{OA}{OB} = \\dfrac{AD}{BC}',
    'On remplace par les longueurs connues :',
    '\\dfrac{8}{OB} = \\dfrac{1,8}{4,5}',
    'Donc :',
    '1,8 \\times OB = 8 \\times 4,5',
    'Ainsi :',
    'OB = \\dfrac{8 \\times 4,5}{1,8} = 20',
    'La longueur OB vaut donc 20 cm.',
  ],
  p7_ex3_q4_ab: [
    'On cherche la longueur AB.',
    'Dans la figure :',
    '— les points E, A, B sont alignés ;',
    '— les points D, A, C sont alignés ;',
    '— les droites (ED) et (BC) sont parallèles.',
    'Les triangles AED et ABC sont donc en configuration de Thalès.',
    "D'après le théorème de Thalès :",
    '\\dfrac{AB}{AE} = \\dfrac{BC}{ED}',
    'On remplace par les longueurs connues :',
    '\\dfrac{AB}{5,5} = \\dfrac{7,2}{4,8}',
    'Donc :',
    '4,8 \\times AB = 5,5 \\times 7,2',
    'Ainsi :',
    'AB = \\dfrac{5,5 \\times 7,2}{4,8} = 8,25',
    'La longueur AB vaut donc 8,25 cm.',
  ],
  p7_ex4_q2_thales: [
    'On cherche les longueurs AE et DE.',
    'Dans la figure :',
    '— les points A, B, D sont alignés ;',
    '— les points A, C, E sont alignés ;',
    '— les droites (BC) et (DE) sont parallèles.',
    'Les triangles ABC et ADE sont donc en configuration de Thalès.',
    "D'après le théorème de Thalès :",
    '\\dfrac{AB}{AD} = \\dfrac{AC}{AE} = \\dfrac{BC}{DE}',
    'On remplace par les longueurs connues :',
    '\\dfrac{6,4}{4,8} = \\dfrac{4,8}{AE} = \\dfrac{8}{DE}',
    'Donc, pour AE :',
    '6,4 \\times AE = 4,8 \\times 4,8',
    'Ainsi :',
    'AE = \\dfrac{4,8 \\times 4,8}{6,4} = 3,6',
    'Et pour DE :',
    '6,4 \\times DE = 4,8 \\times 8',
    'Ainsi :',
    'DE = \\dfrac{4,8 \\times 8}{6,4} = 6',
    'Les longueurs cherchées sont donc :',
    'AE = 3,6 cm et DE = 6 cm.',
  ],
  p7_ex5_q2_an: [
    'On cherche la longueur AN.',
    "D'après le théorème de Thalès :",
    '\\dfrac{AM}{AB} = \\dfrac{AN}{AC}',
    'On remplace par les longueurs connues :',
    '\\dfrac{15}{6} = \\dfrac{AN}{8}',
    'Donc :',
    '6 \\times AN = 15 \\times 8',
    'Ainsi :',
    'AN = \\dfrac{15 \\times 8}{6} = 20',
    'La longueur AN vaut donc 20.',
  ],
  p7_ex5_q5_final: [
    '\\dfrac{AM}{AB} = \\dfrac{15}{6} = 2,5',
    '\\dfrac{AN}{AC} = \\dfrac{20}{8} = 2,5',
    'Les points A, B, M sont alignés dans le même ordre et les points A, C, N sont alignés dans le même ordre.',
    'Les deux résultats sont égaux.',
    "D'après la réciproque du théorème de Thalès, les droites (BC) et (MN) sont parallèles.",
    "La serrure s'ouvre.",
  ],
};

for (const [id, correction] of Object.entries(updates)) {
  const st = findStep(id);
  if (!st) throw new Error(`step missing: ${id}`);
  st.correction = correction;
  console.log('updated', id, 'lines', correction.length);
}

fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
console.log('OK', p);
