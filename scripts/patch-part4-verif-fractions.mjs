/**
 * p4_3 : phrase fixe + fractions verticales (numérateurs placés, dénominateurs à trous).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scenesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../client/content/part4/scenes.json',
);
const c = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
const verif = c.scenes.find((s) => s.id === 'p4_3_verification_cours');
const cloze = verif.hotspots[0].sequence.find((s) => s.id === 'p4_verif_redaction');

const letter = (expected) => ({
  kind: 'text',
  expected,
  accept: [expected, expected.toLowerCase(), expected.toUpperCase()],
  size: 'short',
});

cloze.fields = {
  d1: letter('AB'),
  d2: letter('AC'),
  d3: letter('BC'),
  num: { kind: 'number', expected: 12, size: 'num' },
  denCross: { kind: 'number', expected: 5, size: 'num' },
  den: { kind: 'number', expected: 3, size: 'num' },
  an: { kind: 'number', expected: 20, size: 'num' },
  final: { kind: 'number', expected: 20, size: 'num' },
};

cloze.lines = [
  {
    type: 'text',
    text: 'Les points A, B, M et A, C, N sont alignés dans cet ordre, et les droites (BC) et (MN) sont parallèles.',
  },
  {
    type: 'text',
    text: "D'après le théorème de Thalès,",
  },
  {
    parts: [
      { type: 'fraction', numText: 'AM', denField: 'd1' },
      { type: 'text', text: '  =  ' },
      { type: 'fraction', numText: 'AN', denField: 'd2' },
      { type: 'text', text: '  =  ' },
      { type: 'fraction', numText: 'MN', denField: 'd3' },
      { type: 'text', text: '.' },
    ],
  },
  {
    type: 'text',
    text: 'Donc :',
  },
  {
    parts: [
      { type: 'fraction', numText: '12', denText: '3' },
      { type: 'text', text: '  =  ' },
      { type: 'fraction', numText: 'AN', denText: '5' },
    ],
  },
  {
    parts: [
      { type: 'text', text: 'AN = ' },
      {
        type: 'fraction',
        numParts: [
          { type: 'field', id: 'num' },
          { type: 'text', text: ' × ' },
          { type: 'field', id: 'denCross' },
        ],
        denField: 'den',
      },
    ],
  },
  {
    parts: [
      { type: 'text', text: 'AN = ' },
      { type: 'field', id: 'an' },
    ],
  },
  {
    parts: [
      { type: 'text', text: 'La longueur AN est donc égale à ' },
      { type: 'field', id: 'final' },
      { type: 'text', text: ' cm.' },
    ],
  },
];

cloze.success =
  'Très bien. La phrase du théorème est placée juste avant l’égalité des rapports.';

cloze.hints = [
  {
    reaction: 'Krii !',
    text: 'Dans chaque fraction, le numérateur est déjà donné : AM, AN, MN. Cherche le dénominateur.',
  },
  {
    reaction: 'Krii !',
    text: 'Les trois fractions verticales ont déjà AM, AN et MN en haut. Complète les bas : AB, AC, BC.',
  },
  {
    reaction: 'Krii !',
    text: 'Puis calcule AN = (12 × 5) ÷ 3.',
  },
];

cloze.correction = `Les points A, B, M et A, C, N sont alignés dans cet ordre, et les droites (BC) et (MN) sont parallèles.

D'après le théorème de Thalès,
\\dfrac{AM}{AB} = \\dfrac{AN}{AC} = \\dfrac{MN}{BC}.

Donc :
\\dfrac{12}{3} = \\dfrac{AN}{5}

AN = \\dfrac{12 \\times 5}{3}
AN = 20

La longueur AN est donc égale à 20 cm.`;

const linesJson = JSON.stringify(cloze.lines);
if (/\bsur\b/.test(linesJson)) {
  throw new Error('mot « sur » encore présent dans les lignes de rapports');
}
if (cloze.fields.phrase) {
  throw new Error('champ phrase encore présent');
}

fs.writeFileSync(scenesPath, `${JSON.stringify(c, null, 2)}\n`, 'utf8');
console.log('OK fields:', Object.keys(cloze.fields).join(', '));
console.log(
  'phrase fixe:',
  linesJson.includes("D'après le théorème de Thalès,"),
);
console.log('fractions:', linesJson.includes('"type":"fraction"') || linesJson.includes('"type": "fraction"'));
