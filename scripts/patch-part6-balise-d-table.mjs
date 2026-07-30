/**
 * Correctif Partie 6 :
 * - balise D = exercice classique papillon (sans schéma d’énoncé)
 * - nouvelle scène p6_5_table_capitaine
 * - fragment final → p6_6_fragment_final
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const scenesPath = path.join(root, 'client/content/part6/scenes.json');
const content = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));

const ratioAccept16 = [
  1.6, 1.6, '1.6', '1,6', '1.60', '1,60',
  0.625, '0.625', '0,625', 0.63, '0.63', '0,63',
];
const ratioAccept06 = [0.6, '0.6', '0,6', '0.60', '0,60', 0.6];

const baliseD = {
  type: 'cloze',
  id: 'p6_balise_d',
  title: 'Exercice 4 sur 4 — Balise D — Les drisses croisées',
  progressiveHelp: true,
  prompt:
    'Deux drisses se croisent au point A.\nLes points B, A, M sont alignés.\nLes points C, A, N sont alignés.\n\nOn mesure :\nAB = 5 m\nAM = 8 m\nAC = 7,5 m\nAN = 12 m\n\nLes traverses (BC) et (MN) sont-elles parallèles ?\nCalcule AM / AB et AN / AC, puis conclus.',
  // Pas d’illustrations dans l’énoncé
  fields: {
    r1: {
      kind: 'number',
      expected: 1.6,
      accept: ratioAccept16,
      size: 'num',
      label: 'AM / AB',
      tolerance: 0.02,
    },
    r2: {
      kind: 'number',
      expected: 1.6,
      accept: ratioAccept16,
      size: 'num',
      label: 'AN / AC',
      tolerance: 0.02,
    },
    conclusion: {
      kind: 'select',
      options: ['Oui', 'Non'],
      expected: 'Oui',
      label: 'Parallèles ?',
    },
  },
  lines: [
    {
      parts: [
        { type: 'text', text: 'AM / AB = ' },
        { type: 'field', id: 'r1' },
      ],
    },
    {
      parts: [
        { type: 'text', text: 'AN / AC = ' },
        { type: 'field', id: 'r2' },
      ],
    },
    {
      parts: [
        {
          type: 'text',
          text: 'Les traverses (BC) et (MN) sont-elles parallèles ? ',
        },
        { type: 'field', id: 'conclusion' },
      ],
    },
  ],
  hints: [
    {
      reaction: 'Krii !',
      text: 'Calcule 8 ÷ 5 et 12 ÷ 7,5 (ou les rapports inverses cohérents).',
    },
    {
      reaction: 'Krii !',
      text: '8 / 5 = 1,6 et 12 / 7,5 = 1,6.',
    },
    {
      reaction: 'Krii !',
      text: 'Rapports égaux → parallèles par la réciproque de Thalès.',
    },
  ],
  success:
    'Exact. Les rapports sont égaux : les droites (BC) et (MN) sont parallèles.',
  correction:
    "AM / AB = 8 / 5 = 1,6\nAN / AC = 12 / 7,5 = 1,6\n\nLes rapports sont égaux.\nDonc, d'après la réciproque du théorème de Thalès, les droites (BC) et (MN) sont parallèles.",
  correctionIllustration:
    '/assets/diagrams/part6/p6-exercice-d-classique-schema.png',
  setFlags: {
    p6_balise_d_done: true,
    p6ExerciseDCompleted: true,
  },
  completeScene: false,
};

const tableCaptainScene = {
  id: 'p6_5_table_capitaine',
  title: 'La table du capitaine',
  requireInteraction: true,
  prompt:
    'Les quatre balises sont enfin validées. Au fond de la cabine, la table à cartes du capitaine tremble doucement.',
  next: 'p6_6_fragment_final',
  decor: {
    background: '/assets/backgrounds/part6/p6-5-table-capitaine.png',
    objects: [],
  },
  hotspots: [
    {
      id: 'ambiance_chat',
      label: '…',
      x: 8,
      y: 88,
      w: 8,
      h: 8,
      optional: true,
      inDecor: true,
      repeatable: true,
      advancesStory: false,
      lines: [
        {
          speaker: 'Nérée',
          text: 'Une table penchée, c’est une carte qui ment.',
        },
      ],
    },
    {
      id: 'table_capitaine',
      label: 'Table à cartes',
      x: 50,
      y: 52,
      w: 28,
      h: 28,
      required: true,
      inDecor: true,
      repeatable: true,
      advancesStory: true,
      sequence: [
        {
          type: 'dialogue',
          lines: [
            {
              speaker: 'Nérée',
              text: 'Si cette table est vraiment horizontale, le dernier mécanisme s’ouvrira.',
            },
            {
              speaker: 'Euclide',
              text: 'Alors il faut le prouver, pas seulement le supposer.',
            },
            {
              speaker: 'Maki',
              text: 'Une table penchée, c’est une carte qui raconte n’importe quoi.',
            },
          ],
        },
        {
          type: 'cloze',
          id: 'p6_table_capitaine',
          title: 'Finale — Table à cartes du capitaine',
          progressiveHelp: true,
          prompt:
            'Les pieds de la table à cartes forment une configuration de type papillon.\n\nOn mesure :\n42 cm\n70 cm\n32,4 cm\n54 cm\n\nLa table à cartes du capitaine est-elle horizontale ?\nCalcule 42 / 70 et 32,4 / 54, puis conclus avec la réciproque du théorème de Thalès.',
          illustrations: [
            '/assets/diagrams/part6/p6-exercice-d-table-carte-pirate-complet.png',
          ],
          fields: {
            r1: {
              kind: 'number',
              expected: 0.6,
              accept: ratioAccept06,
              size: 'num',
              label: '42 / 70',
              tolerance: 0.02,
            },
            r2: {
              kind: 'number',
              expected: 0.6,
              accept: ratioAccept06,
              size: 'num',
              label: '32,4 / 54',
              tolerance: 0.02,
            },
            conclusion: {
              kind: 'select',
              options: ['Oui', 'Non'],
              expected: 'Oui',
              label: 'Horizontale ?',
            },
          },
          lines: [
            {
              parts: [
                { type: 'text', text: '42 / 70 = ' },
                { type: 'field', id: 'r1' },
              ],
            },
            {
              parts: [
                { type: 'text', text: '32,4 / 54 = ' },
                { type: 'field', id: 'r2' },
              ],
            },
            {
              parts: [
                {
                  type: 'text',
                  text: 'La table à cartes du capitaine est-elle horizontale ? ',
                },
                { type: 'field', id: 'conclusion' },
              ],
            },
          ],
          hints: [
            {
              reaction: 'Krii !',
              text: 'Calcule 42 ÷ 70 et 32,4 ÷ 54.',
            },
            {
              reaction: 'Krii !',
              text: '42 / 70 = 0,6 et 32,4 / 54 = 0,6.',
            },
            {
              reaction: 'Krii !',
              text: 'Rapports égaux → bords parallèles → table horizontale.',
            },
          ],
          success:
            'Exact. Les rapports sont égaux : la table du capitaine est horizontale.',
          correction:
            "42 / 70 = 0,6\n32,4 / 54 = 0,6\n\nLes rapports sont égaux.\nDonc, d'après la réciproque du théorème de Thalès, les deux bords de la table sont parallèles.\nLa table à cartes du capitaine est horizontale.",
          setFlags: {
            p6_table_capitaine_done: true,
            p6TableCaptainCompleted: true,
          },
          completeScene: false,
        },
        {
          type: 'dialogue',
          lines: [
            {
              speaker: 'Alizée',
              text: 'La table est horizontale. Le mécanisme peut s’ouvrir…',
            },
            {
              speaker: 'Nérée',
              text: 'Continue vers le sixième fragment.',
            },
          ],
          nextSceneId: 'p6_6_fragment_final',
        },
      ],
    },
  ],
};

// Meta order
content.meta.sceneOrder = [
  'p6_0_cabinet_routes',
  'p6_1_activite_cordages',
  'p6_2_carnet_reciproque',
  'p6_3_exercice_guide',
  'p6_4_balises_verification',
  'p6_5_table_capitaine',
  'p6_6_fragment_final',
  'p6_7_conclusion',
];

// Balises scene
const balises = content.scenes.find((s) => s.id === 'p6_4_balises_verification');
if (!balises) throw new Error('p6_4 missing');
balises.next = 'p6_5_table_capitaine';
balises.exerciseQueue.exercises.p6_balise_d = baliseD;
// Outro points to table
balises.exerciseQueue.outro = [
  {
    speaker: 'Alizée',
    text: 'Les quatre balises sont enfin validées.',
  },
  {
    speaker: 'Nérée',
    text: 'Au fond de la cabine, la table à cartes du capitaine tremble doucement…',
  },
  {
    speaker: 'Euclide',
    text: 'Il reste à prouver qu’elle est bien horizontale.',
  },
];

// Fragment scene: rename id + next
const frag = content.scenes.find(
  (s) => s.id === 'p6_5_fragment_final' || s.id === 'p6_6_fragment_final',
);
if (!frag) throw new Error('fragment scene missing');
frag.id = 'p6_6_fragment_final';
frag.next = 'p6_7_conclusion';

// Conclusion scene rename if needed
const concl = content.scenes.find(
  (s) => s.id === 'p6_6_conclusion' || s.id === 'p6_7_conclusion',
);
if (concl) {
  concl.id = 'p6_7_conclusion';
}

// Insert table scene before fragment
const withoutTable = content.scenes.filter(
  (s) => s.id !== 'p6_5_table_capitaine',
);
const fragIdx = withoutTable.findIndex((s) => s.id === 'p6_6_fragment_final');
if (fragIdx < 0) throw new Error('fragment index');
withoutTable.splice(fragIdx, 0, tableCaptainScene);
content.scenes = withoutTable;

// Ensure no fragment flags on balise D
delete baliseD.setFlags.fragment6Collected;
delete baliseD.setFlags.fragment_6;

fs.writeFileSync(scenesPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
console.log('OK part6 balise D + table capitaine');
console.log('order', content.meta.sceneOrder.join(' → '));
console.log(
  'D illustrations',
  content.scenes.find((s) => s.id === 'p6_4_balises_verification')
    .exerciseQueue.exercises.p6_balise_d.illustrations,
);
console.log(
  'D correctionIllustration',
  content.scenes.find((s) => s.id === 'p6_4_balises_verification')
    .exerciseQueue.exercises.p6_balise_d.correctionIllustration,
);
console.log(
  'table bg',
  content.scenes.find((s) => s.id === 'p6_5_table_capitaine').decor.background,
);
