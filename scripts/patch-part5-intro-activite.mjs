/**
 * Correctif ciblé p5_1 : activité d'introduction triangles semblables
 * en configuration papillon (contenu pack corrigé).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const scenesPath = path.join(root, 'client/content/part5/scenes.json');
const content = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
const scene = content.scenes.find((s) => s.id === 'p5_1_activite_cordages_papillon');
if (!scene) {
  console.error('scène p5_1_activite_cordages_papillon introuvable');
  process.exit(1);
}

scene.title = 'Les voiles papillon';
scene.prompt =
  'Observe les deux triangles opposés autour du point A : ils forment une configuration papillon et ils sont semblables.';
scene.next = 'p5_2_carnet_thales_papillon';
scene.requireInteraction = true;
scene.decor = {
  background: '/assets/backgrounds/part5/p5-activite-cordages-papillon.png',
  objects: [],
};

scene.hotspots = [
  {
    id: 'schema_voiles_papillon',
    label: 'Schéma papillon',
    x: 50,
    y: 53,
    w: 22,
    h: 22,
    required: true,
    inDecor: true,
    repeatable: true,
    advancesStory: true,
    sequence: [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Euclide',
            text: 'Les voiles opposées forment deux triangles semblables, placés en configuration papillon autour du point A.',
          },
        ],
      },
      {
        type: 'cloze',
        id: 'p5_intro_triangles_semblables',
        title: "Activité d'introduction — Triangles papillon semblables",
        progressiveHelp: true,
        prompt:
          'Les voiles opposées forment deux triangles semblables : le triangle AMN et le triangle ABC. Ils sont placés en configuration papillon autour du point A. Les côtés correspondants sont AM et AB, puis AN et AC.\n\nOn sait que AM = 2 m, AB = 6 m et AN = 3 m.\nEn utilisant seulement les triangles semblables, quelle longueur AC peut-on prévoir ?',
        illustrations: [
          '/assets/diagrams/part5/p5-activite-papillon-triangles-semblables-schema.png',
        ],
        fields: {
          coef: {
            kind: 'number',
            expected: 3,
            size: 'num',
            label: 'Coefficient',
          },
          ac: {
            kind: 'number',
            expected: 9,
            size: 'num',
            label: 'AC',
          },
        },
        lines: [
          {
            type: 'text',
            text: 'Les triangles AMN et ABC sont semblables.',
          },
          {
            parts: [
              {
                type: 'text',
                text: 'Les côtés correspondants AM et AB donnent le coefficient ',
              },
              { type: 'field', id: 'coef' },
              { type: 'text', text: '.' },
            ],
          },
          {
            type: 'text',
            text: 'Dans des triangles semblables, on applique le même coefficient au côté correspondant AN = 3 m.',
          },
          {
            parts: [
              { type: 'text', text: 'AC = 3 × ' },
              { type: 'field', id: 'coef' },
              { type: 'text', text: ' = ' },
              { type: 'field', id: 'ac' },
              { type: 'text', text: ' m.' },
            ],
          },
        ],
        hints: [
          {
            reaction: 'Krii !',
            text: 'Commence par comparer deux côtés correspondants : AM et AB.',
          },
          {
            reaction: 'Krii !',
            text: 'De 2 m à 6 m, on multiplie par 3.',
          },
          {
            reaction: 'Krii !',
            text: 'Comme les triangles sont semblables, le même coefficient s’applique entre AN et AC.',
          },
        ],
        success:
          'Exact. AC vaut 9 m : les deux triangles semblables gardent la même forme.',
        correction:
          'Les triangles AMN et ABC sont semblables.\nLes côtés correspondants AM = 2 m et AB = 6 m donnent le coefficient 3.\nDans des triangles semblables, les côtés correspondants sont proportionnels.\nOn applique donc le même coefficient à AN = 3 m.\nAC = 3 × 3 = 9.\n\nLa longueur AC vaut donc 9 m.',
        setFlags: { p5_intro_triangles_semblables_done: true },
        completeScene: false,
      },
      {
        type: 'dialogue',
        id: 'p5_intro_transition',
        lines: [
          {
            speaker: 'Alizée',
            text: 'Là, on voit vraiment deux triangles opposés par A : même forme, tailles différentes.',
          },
          {
            speaker: 'Euclide',
            text: "C'est l'idée des triangles semblables. Le théorème de Thalès va l'utiliser dans la configuration papillon.",
          },
          {
            speaker: 'Nérée',
            text: 'Carnet ouvert : cette rédaction-là servira pour toute la crique.',
          },
        ],
        nextSceneId: 'p5_2_carnet_thales_papillon',
      },
    ],
  },
];

fs.writeFileSync(scenesPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
const act = scene.hotspots[0].sequence.find((s) => s.type === 'cloze');
console.log('p5_1 corrigé');
console.log('cloze:', act.id);
console.log('schema:', act.illustrations[0]);
console.log('AC=', act.fields.ac.expected, 'coef=', act.fields.coef.expected);
