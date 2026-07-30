/**
 * Génère client/content/part5/scenes.json (Thalès papillon).
 * Formulation courte professeur + file balises A→B→C→D + citerne p=1,80.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'client/content/part5/scenes.json');

const THALES = "D'après le théorème de Thalès,";
const RATIOS = String.raw`\dfrac{AM}{AB} = \dfrac{AN}{AC} = \dfrac{MN}{BC}`;
const ALIGN =
  'Les points M, A, B et N, A, C sont alignés dans cet ordre, et les droites (MN) et (BC) sont parallèles.';
const THEOREM_TEXT =
  'Si les points M, A, B et N, A, C sont alignés dans cet ordre, et si les droites (MN) et (BC) sont parallèles, alors :';

function maki(text) {
  return { reaction: 'Krii !', text };
}

function thalesExercise({
  id,
  title,
  prompt,
  expected,
  unit = 'm',
  seek,
  illustrations,
  correctionIllustration,
  noSchemaMsg,
  hints,
  extraCorrection,
}) {
  let correction = `${ALIGN}

${THALES}
${RATIOS}

Donc :
${extraCorrection}

La longueur ${seek} est donc égale à ${expected} ${unit}.`;

  return {
    type: 'cloze',
    id,
    title,
    progressiveHelp: true,
    prompt: noSchemaMsg ? `${noSchemaMsg}\n\n${prompt}` : prompt,
    illustrations: illustrations || undefined,
    correctionIllustration: correctionIllustration || undefined,
    fields: {
      answer: {
        kind: 'number',
        expected: Number(expected),
        size: 'num',
        label: `Longueur ${seek}`,
      },
    },
    lines: [
      {
        parts: [
          { type: 'text', text: `${seek} = ` },
          { type: 'field', id: 'answer' },
          { type: 'text', text: ` ${unit}` },
        ],
      },
    ],
    hints: (hints || []).map(maki),
    success: `Exact. ${seek} = ${expected} ${unit}.`,
    correction,
    setFlags: { [`${id}_done`]: true },
    completeScene: false,
  };
}

const baliseA = thalesExercise({
  id: 'p5_balise_a',
  title: 'Balise A — Cordage croisé',
  prompt:
    'Les points M, A, B et N, A, C sont alignés dans cet ordre.\nLes droites (MN) et (BC) sont parallèles.\n\nOn sait que AM = 2 m, AB = 8 m et AN = 3 m.\nCalculer AC.',
  expected: 12,
  seek: 'AC',
  illustrations: ['/assets/diagrams/part5/p5-exercice-a-schema.svg'],
  extraCorrection: String.raw`\dfrac{2}{8} = \dfrac{3}{AC}

AC = \dfrac{8 \times 3}{2}
AC = 12`,
  hints: [
    'Vérifie les alignements M, A, B et N, A, C, puis le parallélisme (MN) // (BC).',
    'Utilise les fractions qui contiennent AC, AM, AB et AN.',
    'Le rapport entre AM et AB vaut 2 sur 8, soit 1/4 ; applique le même coefficient à AN et AC.',
  ],
});

const baliseB = thalesExercise({
  id: 'p5_balise_b',
  title: 'Balise B — Traverses croisées',
  prompt:
    'Les points M, A, B et N, A, C sont alignés dans cet ordre.\nLes droites (MN) et (BC) sont parallèles.\n\nOn sait que AM = 5 m, AB = 15 m et MN = 4 m.\nCalculer BC.',
  expected: 12,
  seek: 'BC',
  illustrations: ['/assets/diagrams/part5/p5-exercice-b-schema.svg'],
  extraCorrection: String.raw`\dfrac{5}{15} = \dfrac{4}{BC}

BC = \dfrac{15 \times 4}{5}
BC = 12`,
  hints: [
    'Ici on cherche le grand segment parallèle BC.',
    'Utilise la fraction avec MN et BC.',
    'Compare 15 et 5, puis applique la même proportion à 4.',
  ],
});

const baliseC = thalesExercise({
  id: 'p5_balise_c',
  title: 'Balise C — Sans schéma',
  noSchemaMsg:
    "Cette fois, le schéma n'est pas affiché. Fais-le sur ton cahier avant de calculer.",
  prompt:
    'Les points M, A, B et N, A, C sont alignés dans cet ordre.\nLes droites (MN) et (BC) sont parallèles.\n\nOn sait que AM = 6 m, AB = 18 m et AC = 15 m.\nCalculer AN.',
  expected: 5,
  seek: 'AN',
  correctionIllustration: '/assets/diagrams/part5/p5-exercice-c-correction.svg',
  extraCorrection: String.raw`\dfrac{6}{18} = \dfrac{AN}{15}

\dfrac{6}{18} = \dfrac{1}{3}, donc \dfrac{AN}{15} = \dfrac{1}{3}.

AN = \dfrac{15}{3}
AN = 5`,
  hints: [
    'Dessine d’abord les deux droites sécantes en A, puis place M, B et N, C.',
    'Le rapport entre AM et AB vaut 1/3.',
    'Si AC est trois fois plus grand que AN, alors AN = 15 ÷ 3.',
  ],
});

const baliseD = thalesExercise({
  id: 'p5_balise_d',
  title: 'Balise D — Sans schéma',
  noSchemaMsg:
    'Dernière balise : construis le schéma papillon sur ton cahier.',
  prompt:
    'Les points M, A, B et N, A, C sont alignés dans cet ordre.\nLes droites (MN) et (BC) sont parallèles.\n\nOn sait que AM = 8 m, AB = 24 m et BC = 18 m.\nCalculer MN.',
  expected: 6,
  seek: 'MN',
  correctionIllustration: '/assets/diagrams/part5/p5-exercice-d-correction.svg',
  extraCorrection: String.raw`\dfrac{8}{24} = \dfrac{MN}{18}

\dfrac{8}{24} = \dfrac{1}{3}, donc \dfrac{MN}{18} = \dfrac{1}{3}.

MN = \dfrac{18}{3}
MN = 6`,
  hints: [
    'Le grand segment parallèle est BC, le petit est MN.',
    'Trouve combien de fois AM rentre dans AB.',
    'MN est trois fois plus petit que BC.',
  ],
});

const content = {
  meta: {
    partId: 'part5',
    title: 'Partie 5 — Théorème de Thalès : triangle papillon',
    startSceneId: 'p5_0_arrivee_crique_vents_croises',
    sceneOrder: [
      'p5_0_arrivee_crique_vents_croises',
      'p5_1_activite_cordages_papillon',
      'p5_2_carnet_thales_papillon',
      'p5_3_verification_cours',
      'p5_4_balises_thales_papillon',
      'p5_5_finale_citerne',
      'p5_6_fragment_papillon',
      'p5_7_conclusion',
    ],
    endMessage:
      'La configuration papillon est maîtrisée. Le cinquième fragment est en sécurité.',
    announceNext: 'Partie 6 — Réciproque du théorème de Thalès',
    nextPartId: 'part6',
  },
  scenes: [
    {
      id: 'p5_0_arrivee_crique_vents_croises',
      title: 'La crique des vents croisés',
      requireInteraction: true,
      prompt:
        'Explore la crique des vents croisés. Les cordages croisés dessinent une nouvelle figure…',
      next: 'p5_1_activite_cordages_papillon',
      decor: {
        background:
          '/assets/backgrounds/part5/p5-arrivee-crique-vents-croises.png',
        objects: [],
      },
      hotspots: [
        {
          id: 'vent_croise',
          label: 'Vents croisés',
          x: 30,
          y: 35,
          w: 20,
          h: 18,
          optional: true,
          inDecor: true,
          repeatable: true,
          advancesStory: false,
          lines: [
            {
              speaker: 'Alizée',
              text: 'Ici les vents se croisent comme des droites sécantes. Une figure se cache dans les cordages.',
            },
          ],
        },
        {
          id: 'rochers',
          label: 'Rochers de la crique',
          x: 72,
          y: 60,
          w: 18,
          h: 20,
          optional: true,
          inDecor: true,
          repeatable: true,
          advancesStory: false,
          lines: [
            {
              speaker: 'Nérée',
              text: 'Les anciens marins tendaient des cordages croisés pour mesurer des profondeurs sans y descendre.',
            },
          ],
        },
        {
          id: 'atelier_cordages',
          label: 'Atelier des cordages',
          x: 52,
          y: 55,
          w: 20,
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
                  speaker: 'Nérée',
                  text: 'Bienvenue dans la crique des vents croisés. Les cordages y forment des figures étranges…',
                },
                {
                  speaker: 'Alizée',
                  text: 'On dirait un papillon de corde : deux droites qui se croisent, et des segments parallèles.',
                },
                {
                  speaker: 'Euclide',
                  text: 'C’est la configuration papillon du théorème de Thalès. Même théorème, autre figure.',
                },
                {
                  speaker: 'Maki',
                  text: 'Krii ?',
                },
                {
                  speaker: 'Nérée',
                  text: 'Commençons par une activité : reconnaître des triangles semblables dans ce papillon.',
                },
              ],
              nextSceneId: 'p5_1_activite_cordages_papillon',
            },
          ],
        },
      ],
    },
    {
      id: 'p5_1_activite_cordages_papillon',
      title: 'Les voiles papillon',
      requireInteraction: true,
      prompt:
        'Observe les deux triangles opposés autour du point A : ils forment une configuration papillon et ils sont semblables.',
      next: 'p5_2_carnet_thales_papillon',
      decor: {
        background:
          '/assets/backgrounds/part5/p5-activite-cordages-papillon.png',
        objects: [],
      },
      hotspots: [
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
                maki(
                  'Commence par comparer deux côtés correspondants : AM et AB.',
                ),
                maki('De 2 m à 6 m, on multiplie par 3.'),
                maki(
                  'Comme les triangles sont semblables, le même coefficient s’applique entre AN et AC.',
                ),
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
      ],
    },
    {
      id: 'p5_2_carnet_thales_papillon',
      title: 'Carnet : Thalès papillon',
      requireInteraction: true,
      prompt: 'Touche le carnet pour recopier la leçon.',
      next: 'p5_3_verification_cours',
      decor: {
        background: '/assets/backgrounds/part5/p5-table-cours-papillon.png',
        objects: [
          {
            image: '/assets/objects/part3/livret-euclide.png',
            alt: "Carnet d'Euclide",
            x: 50,
            y: 56,
            w: 28,
            h: 26,
            z: 2,
          },
        ],
      },
      hotspots: [
        {
          id: 'carnet_papillon',
          label: "Carnet d'Euclide",
          x: 50,
          y: 54,
          w: 26,
          h: 24,
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
                  text: 'Sortez votre cahier et recopiez la leçon. La formulation doit être exacte.',
                },
              ],
            },
            {
              type: 'notebook',
              id: 'p5_cours_thales_papillon',
              title: 'Théorème de Thalès — configuration papillon',
              pages: [
                {
                  title: 'III. Théorème de Thalès : configuration papillon',
                  figureImage:
                    '/assets/diagrams/part5/p5-lecon-thales-papillon.png',
                  diagramImage:
                    '/assets/diagrams/part5/p5-lecon-thales-papillon.png',
                  illustration:
                    '/assets/diagrams/part5/p5-lecon-thales-papillon.png',
                  figureAlt: 'Configuration papillon de Thalès',
                  blocks: [
                    {
                      type: 'text',
                      text: "Dans une configuration papillon, deux droites se coupent en A. Les deux triangles sont placés de part et d'autre du point A.",
                    },
                    {
                      type: 'text',
                      text: 'Les points M, A, B et N, A, C sont alignés dans cet ordre. Les droites (MN) et (BC) sont parallèles.',
                    },
                  ],
                },
                {
                  title: 'Schéma — configuration papillon',
                  figureImage:
                    '/assets/diagrams/part5/p5-lecon-thales-papillon.png',
                  diagramImage:
                    '/assets/diagrams/part5/p5-lecon-thales-papillon.png',
                  illustration:
                    '/assets/diagrams/part5/p5-lecon-thales-papillon.png',
                  figureAlt:
                    'Schéma papillon : M,A,B et N,A,C alignés, (MN) // (BC)',
                  blocks: [
                    {
                      type: 'text',
                      text: 'Deux triangles de part et d’autre de A. Côtés correspondants : AM avec AB, AN avec AC, MN avec BC.',
                    },
                  ],
                },
                {
                  title: 'Théorème à recopier',
                  blocks: [
                    {
                      type: 'text',
                      text: THEOREM_TEXT,
                    },
                    {
                      type: 'math',
                      tex: RATIOS,
                    },
                  ],
                },
                {
                  title: 'Méthode de rédaction',
                  blocks: [
                    {
                      type: 'text',
                      text: 'Pour utiliser le théorème de Thalès :',
                    },
                    {
                      type: 'text',
                      text: '1. Je vérifie les alignements M, A, B et N, A, C.',
                    },
                    {
                      type: 'text',
                      text: '2. Je vérifie que (MN) et (BC) sont parallèles.',
                    },
                    {
                      type: 'text',
                      text: "3. J'écris : D'après le théorème de Thalès,",
                    },
                    {
                      type: 'text',
                      text: "4. J'écris l'égalité des rapports avec des fractions.",
                    },
                    {
                      type: 'text',
                      text: '5. Je choisis les deux fractions utiles et je calcule.',
                    },
                  ],
                },
                {
                  title: 'Exemple rédigé',
                  blocks: [
                    {
                      type: 'text',
                      text: ALIGN,
                    },
                    {
                      type: 'text',
                      text: THALES,
                    },
                    {
                      type: 'math',
                      tex: RATIOS,
                    },
                    {
                      type: 'text',
                      text: 'Donc :',
                    },
                    {
                      type: 'math',
                      tex: String.raw`\dfrac{4}{10} = \dfrac{6}{AC}`,
                    },
                    {
                      type: 'math',
                      tex: String.raw`AC = \dfrac{10 \times 6}{4} = 15`,
                    },
                    {
                      type: 'text',
                      text: 'La longueur AC est donc égale à 15 cm.',
                    },
                  ],
                },
              ],
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Euclide',
                  text: 'Retenez l’ordre : conditions, phrase du théorème, fractions, calcul.',
                },
                {
                  speaker: 'Nérée',
                  text: 'Et jamais de rapports mal écrits en ligne. Un papillon mal lu peut fausser toute une carte.',
                },
              ],
              nextSceneId: 'p5_3_verification_cours',
            },
          ],
        },
      ],
    },
    {
      id: 'p5_3_verification_cours',
      title: 'Vérification du cours',
      requireInteraction: true,
      prompt: 'Complète la rédaction à trous.',
      next: 'p5_4_balises_thales_papillon',
      decor: {
        background: '/assets/backgrounds/part5/p5-table-cours-papillon.png',
        objects: [],
      },
      hotspots: [
        {
          id: 'verif_start',
          label: 'Rédaction guidée',
          x: 50,
          y: 50,
          w: 26,
          h: 24,
          required: true,
          inDecor: true,
          repeatable: true,
          advancesStory: true,
          sequence: [
            {
              type: 'cloze',
              id: 'p5_verif_redaction',
              title: 'Vérification — rédaction Thalès papillon',
              progressiveHelp: true,
              prompt:
                'Les points M, A, B et N, A, C sont alignés dans cet ordre.\nLes droites (MN) et (BC) sont parallèles.\nOn sait que AM = 3 cm, AB = 12 cm et AN = 5 cm.\nCalculer AC.',
              illustrations: [
                '/assets/diagrams/part5/p5-verification-cours-schema.png',
              ],
              fields: {
                d1: {
                  kind: 'text',
                  expected: 'AB',
                  accept: ['AB', 'ab'],
                  size: 'short',
                },
                d2: {
                  kind: 'text',
                  expected: 'AC',
                  accept: ['AC', 'ac'],
                  size: 'short',
                },
                d3: {
                  kind: 'text',
                  expected: 'BC',
                  accept: ['BC', 'bc'],
                  size: 'short',
                },
                n1: { kind: 'number', expected: 3, size: 'num' },
                n2: { kind: 'number', expected: 12, size: 'num' },
                n3: { kind: 'number', expected: 5, size: 'num' },
                num: { kind: 'number', expected: 12, size: 'num' },
                denCross: { kind: 'number', expected: 5, size: 'num' },
                den: { kind: 'number', expected: 3, size: 'num' },
                ac: { kind: 'number', expected: 20, size: 'num' },
                final: { kind: 'number', expected: 20, size: 'num' },
              },
              lines: [
                {
                  type: 'text',
                  text: ALIGN,
                },
                {
                  type: 'text',
                  text: THALES,
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
                    {
                      type: 'fraction',
                      numField: 'n1',
                      denField: 'n2',
                    },
                    { type: 'text', text: '  =  ' },
                    {
                      type: 'fraction',
                      numField: 'n3',
                      denText: 'AC',
                    },
                  ],
                },
                {
                  parts: [
                    { type: 'text', text: 'AC = ' },
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
                    { type: 'text', text: 'AC = ' },
                    { type: 'field', id: 'ac' },
                  ],
                },
                {
                  parts: [
                    {
                      type: 'text',
                      text: 'La longueur AC est donc égale à ',
                    },
                    { type: 'field', id: 'final' },
                    { type: 'text', text: ' cm.' },
                  ],
                },
              ],
              hints: [
                maki(
                  'Dans chaque fraction, le numérateur est déjà donné : AM, AN, MN. Cherche le dénominateur.',
                ),
                maki(
                  'Les trois fractions verticales ont déjà AM, AN et MN en haut. Complète les bas : AB, AC, BC.',
                ),
                maki('Puis calcule AC = (12 × 5) ÷ 3.'),
              ],
              success:
                'Très bien. La phrase du théorème est placée juste avant l’égalité des rapports.',
              correction: `${ALIGN}

${THALES}
${RATIOS}.

Donc :
\\dfrac{3}{12} = \\dfrac{5}{AC}

AC = \\dfrac{12 \\times 5}{3}
AC = 20

La longueur AC est donc égale à 20 cm.`,
              setFlags: { p5_verif_done: true },
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Euclide',
                  text: 'Reprends toujours l’ordre : conditions, phrase du théorème, égalité des fractions, puis calcul.',
                },
              ],
              nextSceneId: 'p5_4_balises_thales_papillon',
            },
          ],
        },
      ],
    },
    {
      id: 'p5_4_balises_thales_papillon',
      title: 'Les quatre balises papillon',
      requireInteraction: true,
      prompt:
        'Touchez n’importe quelle balise pour l’exercice suivant (A → B → C → D).',
      next: 'p5_5_finale_citerne',
      decor: {
        background: '/assets/backgrounds/part5/p5-balises-exercices.png',
        objects: [],
      },
      hotspots: [
        {
          id: 'balise_a',
          label: 'Balise A',
          x: 15,
          y: 55,
          w: 14,
          h: 26,
          queueMember: true,
          inDecor: true,
          repeatable: true,
          advancesStory: false,
        },
        {
          id: 'balise_b',
          label: 'Balise B',
          x: 38,
          y: 51,
          w: 15,
          h: 28,
          queueMember: true,
          inDecor: true,
          repeatable: true,
          advancesStory: false,
        },
        {
          id: 'balise_c',
          label: 'Balise C',
          x: 59,
          y: 52,
          w: 15,
          h: 28,
          queueMember: true,
          inDecor: true,
          repeatable: true,
          advancesStory: false,
        },
        {
          id: 'balise_d',
          label: 'Balise D',
          x: 79,
          y: 53,
          w: 15,
          h: 28,
          queueMember: true,
          inDecor: true,
          repeatable: true,
          advancesStory: false,
        },
      ],
      exerciseQueue: {
        ids: ['p5_balise_a', 'p5_balise_b', 'p5_balise_c', 'p5_balise_d'],
        introFlag: 'p5_balise_intro_shown',
        outro: [
          {
            speaker: 'Alizée',
            text: 'Les quatre balises papillon sont réglées. Les rapports se retrouvent bien.',
          },
          {
            speaker: 'Euclide',
            text: 'Il reste une application concrète : la profondeur de la citerne.',
          },
          {
            speaker: 'Nérée',
            text: 'Cette fois le schéma est donné. Observe-le attentivement.',
          },
        ],
        exercises: {
          p5_balise_a: baliseA,
          p5_balise_b: baliseB,
          p5_balise_c: baliseC,
          p5_balise_d: baliseD,
        },
      },
    },
    {
      id: 'p5_5_finale_citerne',
      title: 'La citerne des vents croisés',
      requireInteraction: true,
      prompt: 'Calcule la profondeur p de la citerne.',
      next: 'p5_6_fragment_papillon',
      decor: {
        background: '/assets/backgrounds/part5/p5-finale-citerne.png',
        objects: [],
      },
      hotspots: [
        {
          id: 'citerne_finale',
          label: 'Citerne',
          x: 50,
          y: 55,
          w: 28,
          h: 30,
          required: true,
          inDecor: true,
          repeatable: true,
          advancesStory: true,
          sequence: [
            {
              type: 'cloze',
              id: 'p5_citerne',
              title: 'Finale — Citerne',
              progressiveHelp: true,
              prompt:
                "Sur l'île des Vents croisés, Alizée et Nérée découvrent une ancienne citerne.\nL'œil d'Alizée est à 1,50 m du sol. Elle se tient à 1,00 m du bord.\nL'ouverture de la citerne mesure 1,20 m.\nDepuis cette position, le bord du puits cache juste la ligne du fond.\n\nObserve le schéma ci-dessous, puis calcule la profondeur p de la citerne.",
              illustrations: ['/assets/diagrams/part5/p5-citerne-enonce.png'],
              fields: {
                p: {
                  kind: 'number',
                  expected: 1.8,
                  size: 'num',
                  label: 'Profondeur p',
                  tolerance: 0.01,
                },
              },
              lines: [
                {
                  parts: [
                    { type: 'text', text: 'p = ' },
                    { type: 'field', id: 'p' },
                    { type: 'text', text: ' m' },
                  ],
                },
              ],
              hints: [
                maki(
                  'Modélise : M, A, B alignés ; N, A, C alignés ; (MN) // (BC).',
                ),
                maki(
                  'AN = 1,20 m, AC = 1,00 m, BC = 1,50 m, et MN = p.',
                ),
                maki(
                  "D'après le théorème de Thalès, utilise les fractions verticales avec AN, AC, MN et BC.",
                ),
                maki('p = (1,20 × 1,50) ÷ 1,00 = 1,80.'),
              ],
              success: 'Exact. La profondeur p vaut 1,80 m.',
              correction: `On modélise la situation :
M, A, B sont alignés dans cet ordre.
N, A, C sont alignés dans cet ordre.
(MN) et (BC) sont parallèles (deux verticales).

AN = 1,20 m
AC = 1,00 m
BC = 1,50 m
MN = p

${THALES}
${RATIOS}.

On utilise :
\\dfrac{AN}{AC} = \\dfrac{MN}{BC}

Donc :
\\dfrac{1,20}{1,00} = \\dfrac{p}{1,50}

p = \\dfrac{1,20 \\times 1,50}{1,00}
p = 1,80

La profondeur de la citerne est donc égale à 1,80 m.`,
              correctionIllustration:
                '/assets/diagrams/part5/p5-citerne-correction.png',
              setFlags: { p5_citerne_done: true },
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Alizée',
                  text: '1,80 m : assez profond pour cacher un fragment… et assez sûr pour ne pas y plonger.',
                },
                {
                  speaker: 'Nérée',
                  text: 'Le papillon de Thalès a encore parlé juste.',
                },
                {
                  speaker: 'Euclide',
                  text: 'Conditions, théorème, fractions, calcul : la rédaction est complète.',
                },
              ],
              nextSceneId: 'p5_6_fragment_papillon',
            },
          ],
        },
      ],
    },
    {
      id: 'p5_6_fragment_papillon',
      title: 'Le cinquième fragment',
      requireInteraction: true,
      prompt: 'Récupère le cinquième fragment de carte.',
      next: 'p5_7_conclusion',
      decor: {
        background: '/assets/backgrounds/part5/p5-fragment-papillon.png',
        objects: [
          {
            image: '/assets/objects/part5/fragment-carte-5.png',
            alt: 'Cinquième fragment de carte',
            x: 55,
            y: 48,
            w: 14,
            h: 16,
            z: 4,
          },
        ],
      },
      hotspots: [
        {
          id: 'fragment_5',
          label: 'Fragment 5',
          x: 55,
          y: 48,
          w: 14,
          h: 16,
          required: true,
          image: '/assets/objects/part5/fragment-carte-5.png',
          inDecor: true,
          repeatable: true,
          advancesStory: true,
          sequence: [
            {
              type: 'fragmentZoom',
              image: '/assets/objects/part5/fragment-carte-5.png',
              alt: 'Zoom du cinquième fragment',
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Alizée',
                  text: 'Le cinquième fragment se place. Il ne reste plus qu’une pièce…',
                },
              ],
              completeScene: false,
            },
            {
              type: 'fragmentBoard',
              placeFragment: 5,
              total: 6,
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Nérée',
                  text: 'Cinq fragments sur six. La cache de Thalès est presque reconstituée.',
                },
                {
                  speaker: 'Euclide',
                  text: 'Vous savez utiliser Thalès en configuration papillon. Il reste la réciproque.',
                },
                {
                  speaker: 'Alizée',
                  text: 'Fragments récupérés : 5 / 6. Cap sur la partie 6.',
                },
              ],
              setFlags: {
                fragment5Collected: true,
                fragment_5: true,
              },
              nextSceneId: 'p5_7_conclusion',
            },
          ],
        },
      ],
    },
    {
      id: 'p5_7_conclusion',
      title: 'Vers la réciproque de Thalès',
      requireInteraction: false,
      decor: {
        background:
          '/assets/backgrounds/part5/p5-arrivee-crique-vents-croises.png',
      },
      steps: [
        {
          type: 'dialogue',
          id: 'p5_conclusion_dialogue',
          lines: [
            {
              speaker: 'Euclide',
              text: 'Vous savez maintenant utiliser le théorème de Thalès en configuration papillon.',
            },
            {
              speaker: 'Nérée',
              text: 'Prochaine étape : la réciproque — reconnaître les parallèles à partir des rapports.',
            },
            {
              speaker: 'Alizée',
              text: 'Alors cap sur la partie 6.',
            },
            {
              speaker: 'Maki',
              text: 'Krii !',
            },
          ],
          endPart: true,
          message: 'Partie 5 terminée. Cinquième fragment récupéré.',
          announce: 'Partie 6 — Réciproque du théorème de Thalès',
          nextPartId: 'part6',
          nextPartTitle: 'Partie 6 — Réciproque du théorème de Thalès',
        },
      ],
    },
  ],
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
console.log('wrote', out);
console.log('scenes', content.scenes.map((s) => s.id).join(', '));
console.log(
  'queue',
  content.scenes.find((s) => s.id === 'p5_4_balises_thales_papillon')
    .exerciseQueue.ids,
);
