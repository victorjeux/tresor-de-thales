/**
 * Correctif part4 : schéma carnet + vérification en cases à remplir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scenesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../client/content/part4/scenes.json',
);
const c = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));

// 1) Page Schéma du carnet
const carnet = c.scenes.find((s) => s.id === 'p4_2_carnet_thales');
const nb = carnet.hotspots[0].sequence.find((s) => s.type === 'notebook');
const schema = nb.pages.find((pg) => /Sch[eé]ma/i.test(pg.title || ''));
if (schema) {
  schema.figureImage = '/assets/diagrams/part4/p4-lecon-thales-emboites.svg';
  schema.diagramImage = '/assets/diagrams/part4/p4-lecon-thales-emboites.svg';
  schema.figureAlt = 'Configuration de Thalès — triangles emboîtés';
  // PNG de secours si le SVG ne charge pas côté navigateur
  schema.figureImagePng = '/assets/diagrams/part4/p4-lecon-thales-emboites.png';
}

// 2) Vérification : cases texte (pas de boutons AM/AB…)
const verif = c.scenes.find((s) => s.id === 'p4_3_verification_cours');
const cloze = verif.hotspots[0].sequence.find((s) => s.id === 'p4_verif_redaction');

const letterField = (expected) => ({
  kind: 'text',
  expected,
  accept: [expected, expected.toLowerCase(), expected.toUpperCase()],
  size: 'short',
});

cloze.fields = {
  phrase: {
    kind: 'text',
    expected: "D'après",
    accept: ["D'après", "D'apres", "d'après", "d'apres", 'D’après', 'd’après'],
    size: 'short',
    label: 'Début',
  },
  n1: letterField('AM'),
  d1: letterField('AB'),
  n2: letterField('AN'),
  d2: letterField('AC'),
  n3: letterField('MN'),
  d3: letterField('BC'),
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
    parts: [
      { type: 'field', id: 'phrase' },
      { type: 'text', text: ' le théorème de Thalès,' },
    ],
  },
  {
    parts: [
      { type: 'field', id: 'n1' },
      { type: 'text', text: ' sur ' },
      { type: 'field', id: 'd1' },
      { type: 'text', text: '  =  ' },
      { type: 'field', id: 'n2' },
      { type: 'text', text: ' sur ' },
      { type: 'field', id: 'd2' },
      { type: 'text', text: '  =  ' },
      { type: 'field', id: 'n3' },
      { type: 'text', text: ' sur ' },
      { type: 'field', id: 'd3' },
      { type: 'text', text: '.' },
    ],
  },
  {
    type: 'text',
    text: 'Donc :',
  },
  {
    parts: [
      { type: 'text', text: 'AN = (' },
      { type: 'field', id: 'num' },
      { type: 'text', text: ' × ' },
      { type: 'field', id: 'denCross' },
      { type: 'text', text: ') ÷ ' },
      { type: 'field', id: 'den' },
      { type: 'text', text: ' = ' },
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

// S’assurer qu’aucune forme AM/AB n’apparaît
const raw = JSON.stringify(c);
if (/AM\s*\/\s*AB/.test(raw) || /AN\s*\/\s*AC/.test(raw) || /MN\s*\/\s*BC/.test(raw)) {
  throw new Error('Forme linéaire AM/AB détectée dans scenes.json');
}

fs.writeFileSync(scenesPath, `${JSON.stringify(c, null, 2)}\n`, 'utf8');
console.log('OK figureImage:', schema?.figureImage);
console.log('OK n1 kind:', cloze.fields.n1.kind);
console.log('OK phrase kind:', cloze.fields.phrase.kind);
console.log('select count:', (raw.match(/"kind": "select"/g) || []).length);
