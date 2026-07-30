/**
 * Génère client/content/part4/scenes.json à partir du script pédagogique.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'client/content/part4/scenes.json');

const THALES =
  "D'après le théorème de Thalès,";
const RATIOS = String.raw`\dfrac{AM}{AB} = \dfrac{AN}{AC} = \dfrac{MN}{BC}`;
const ALIGN =
  'Les points A, B, M et A, C, N sont alignés dans cet ordre, et les droites (BC) et (MN) sont parallèles.';

function maki(text) {
  return { reaction: 'Krii !', text };
}

function thalesExercise({
  id,
  title,
  prompt,
  expected,
  unit = 'm',
  seek = 'AN',
  illustrations,
  correctionIllustration,
  noSchemaMsg,
  hints,
  extraCorrection = '',
}) {
  const lines = [
    ALIGN,
    '',
    `${THALES}`,
  ];
  // correction as multi-line with latex
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

const content = {
  meta: {
    partId: 'part4',
    title: 'Partie 4 — Théorème de Thalès : triangles emboîtés',
    startSceneId: 'p4_0_arrivee_ile_paralleles',
    sceneOrder: [
      'p4_0_arrivee_ile_paralleles',
      'p4_1_activite_mats_paralleles',
      'p4_2_carnet_thales',
      'p4_3_verification_cours',
      'p4_4_balises_thales',
      'p4_5_finale_compas_marin',
      'p4_6_fragment_paralleles',
      'p4_7_conclusion',
    ],
    endMessage:
      'Les triangles emboîtés sont maîtrisés. Le quatrième fragment est en sécurité.',
    announceNext: 'Partie 5 — Thalès : configuration papillon',
    nextPartId: 'part5',
  },
  scenes: [
    {
      id: 'p4_0_arrivee_ile_paralleles',
      title: "L'île des parallèles",
      requireInteraction: true,
      prompt:
        "Explore l'île des parallèles. Les mâts du vieux quai semblent cacher une nouvelle relation de longueurs.",
      next: 'p4_1_activite_mats_paralleles',
      decor: {
        background: '/assets/backgrounds/part4/p4-arrivee-ile-paralleles.png',
        objects: [],
      },
      hotspots: [
        {
          id: 'cordes_paralleles',
          label: 'Cordes parallèles',
          x: 42,
          y: 48,
          w: 22,
          h: 18,
          optional: true,
          inDecor: true,
          repeatable: true,
          advancesStory: false,
          lines: [
            {
              speaker: 'Alizée',
              text: 'Ces cordes tendues semblent parfaitement parallèles.',
            },
          ],
        },
        {
          id: 'table_cartes',
          label: 'Table de cartes',
          x: 72,
          y: 68,
          w: 16,
          h: 14,
          optional: true,
          inDecor: true,
          repeatable: true,
          advancesStory: false,
          lines: [
            {
              speaker: 'Nérée',
              text: 'Les anciens navigateurs y réglaient leurs instruments avant de reprendre la mer.',
            },
          ],
        },
        {
          id: 'atelier_mats',
          label: 'Atelier des mâts',
          x: 58,
          y: 55,
          w: 18,
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
                  text: "Nous voici devant l'île des Parallèles. Les anciens navigateurs y réglaient leurs instruments avant de reprendre la mer.",
                },
                {
                  speaker: 'Alizée',
                  text: "Les mâts du quai sont attachés par des cordes droites. Certaines ont l'air parfaitement parallèles.",
                },
                {
                  speaker: 'Euclide',
                  text: 'Les parallèles sont de grandes révélatrices de triangles. Elles permettent de relier des longueurs qui, au premier regard, semblent indépendantes.',
                },
                { speaker: 'Maki', text: 'Krii ?' },
                {
                  speaker: 'Nérée',
                  text: 'Autrement dit, si nous savons lire ces cordages, nous pourrons réparer le prochain fragment de la carte.',
                },
                {
                  speaker: 'Alizée',
                  text: 'Les deux cordes horizontales semblent parallèles, mais elles coupent les mêmes mâts obliques.',
                },
                {
                  speaker: 'Euclide',
                  text: "Parfait. C'est exactement le genre de situation où le théorème de Thalès apparaît.",
                },
              ],
              nextSceneId: 'p4_1_activite_mats_paralleles',
            },
          ],
        },
      ],
    },
    {
      id: 'p4_1_activite_mats_paralleles',
      title: 'Les mâts du quai',
      requireInteraction: true,
      prompt: 'Observe les mâts et calcule la longueur manquante.',
      next: 'p4_2_carnet_thales',
      decor: {
        background: '/assets/backgrounds/part4/p4-activite-mats-paralleles.png',
        objects: [],
      },
      hotspots: [
        {
          id: 'start_mats',
          label: 'Configuration des mâts',
          x: 50,
          y: 52,
          w: 28,
          h: 26,
          required: true,
          inDecor: true,
          repeatable: true,
          advancesStory: true,
          sequence: [
            {
              type: 'cloze',
              id: 'p4_activite_an',
              title: 'Activité — mâts parallèles',
              progressiveHelp: true,
              prompt:
                'Sur le quai, deux cordes parallèles relient les mêmes mâts obliques.\nOn modélise la situation par la figure AMN.\n\nLes points A, B, M et A, C, N sont alignés dans cet ordre.\nLes droites (BC) et (MN) sont parallèles.\nOn sait que AB = 2 m, AM = 6 m et AC = 3 m.\n\nQuelle longueur AN peut-on prévoir ?',
              illustrations: [
                '/assets/diagrams/part4/p4-activite-mats-schema.svg',
              ],
              fields: {
                answer: {
                  kind: 'number',
                  expected: 9,
                  size: 'num',
                  label: 'AN',
                },
              },
              lines: [
                {
                  parts: [
                    { type: 'text', text: 'AN = ' },
                    { type: 'field', id: 'answer' },
                    { type: 'text', text: ' m' },
                  ],
                },
              ],
              hints: [
                maki("Regarde d'abord le passage de AB à AM."),
                maki('De 2 m à 6 m, on multiplie par 3.'),
                maki("La même proportion s'applique sur l'autre mât : AC devient AN."),
              ],
              success: 'Exact. AN = 9 m.',
              correction: `${ALIGN}

${THALES}
${RATIOS}

Donc :
\\dfrac{6}{2} = \\dfrac{AN}{3}

\\dfrac{6}{2} = 3, donc AN = 3 \\times 3 = 9.

La longueur AN est donc égale à 9 m.`,
              setFlags: { p4_activite_done: true },
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Alizée',
                  text: 'Les deux mâts grandissent donc dans la même proportion.',
                },
                {
                  speaker: 'Euclide',
                  text: "Oui. Maintenant, il faut écrire cette idée proprement dans le cahier.",
                },
                {
                  speaker: 'Nérée',
                  text: "Sortez votre cahier, on passe au carnet d'Euclide.",
                },
              ],
              nextSceneId: 'p4_2_carnet_thales',
            },
          ],
        },
      ],
    },
    {
      id: 'p4_2_carnet_thales',
      title: 'Carnet : théorème de Thalès',
      requireInteraction: true,
      prompt: 'Touche le carnet pour recopier la leçon.',
      next: 'p4_3_verification_cours',
      decor: {
        background: '/assets/backgrounds/part4/p4-table-cours-thales.png',
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
          id: 'carnet_thales',
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
                  text: 'Sortez votre cahier et recopiez la leçon. Dans cette partie, la rédaction est aussi importante que le calcul.',
                },
              ],
            },
            {
              type: 'notebook',
              id: 'p4_notebook_thales',
              title: 'Théorème de Thalès — triangles emboîtés',
              pages: [
                {
                  title: 'Configuration',
                  blocks: [
                    {
                      type: 'text',
                      text: 'On considère deux triangles emboîtés : le petit triangle ABC et le grand triangle AMN.',
                    },
                    {
                      type: 'text',
                      text: 'Les points A, B, M et A, C, N sont alignés dans cet ordre.',
                    },
                    {
                      type: 'text',
                      text: 'Les droites (BC) et (MN) sont parallèles.',
                    },
                  ],
                  figure: null,
                },
                {
                  title: 'Théorème',
                  blocks: [
                    {
                      type: 'text',
                      text: 'Si les points A, B, M et A, C, N sont alignés dans cet ordre, et si les droites (BC) et (MN) sont parallèles, alors :',
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
                    { type: 'text', text: '1. Je vérifie les alignements.' },
                    {
                      type: 'text',
                      text: '2. Je vérifie que les deux droites sont parallèles.',
                    },
                    {
                      type: 'text',
                      text: `3. J'écris : ${THALES}`,
                    },
                    {
                      type: 'text',
                      text: "4. J'écris l'égalité des rapports avec des fractions.",
                    },
                    {
                      type: 'text',
                      text: '5. Je choisis les deux fractions utiles et je calcule la longueur cherchée.',
                    },
                  ],
                },
                {
                  title: 'Exemple rédigé',
                  blocks: [
                    {
                      type: 'text',
                      text: 'Les points A, B, M et A, C, N sont alignés dans cet ordre. Les droites (BC) et (MN) sont parallèles. AB = 4 cm, AM = 10 cm, AC = 6 cm. Calculer AN.',
                    },
                    { type: 'text', text: ALIGN },
                    { type: 'text', text: THALES },
                    { type: 'math', tex: RATIOS },
                    { type: 'text', text: 'Donc :' },
                    {
                      type: 'math',
                      tex: String.raw`\dfrac{10}{4} = \dfrac{AN}{6}`,
                    },
                    {
                      type: 'math',
                      tex: String.raw`AN = \dfrac{10 \times 6}{4} = 15`,
                    },
                    {
                      type: 'text',
                      text: 'La longueur AN est donc égale à 15 cm.',
                    },
                  ],
                },
              ],
              // figure on page 1 via blocks only - add diagram page
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Euclide',
                  text: "Retenez surtout l'ordre : conditions, phrase du théorème, égalité des fractions, puis calcul.",
                },
                {
                  speaker: 'Nérée',
                  text: 'Et pas de raccourci avec des rapports mal écrits. Une carte mal lue peut envoyer un navire sur les rochers.',
                },
              ],
              nextSceneId: 'p4_3_verification_cours',
            },
          ],
        },
      ],
    },
    {
      id: 'p4_3_verification_cours',
      title: 'Vérification du cours',
      requireInteraction: true,
      prompt: 'Complète la rédaction à trous.',
      next: 'p4_4_balises_thales',
      decor: {
        background: '/assets/backgrounds/part4/p4-table-cours-thales.png',
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
              id: 'p4_verif_redaction',
              title: 'Vérification — rédaction Thalès',
              progressiveHelp: true,
              prompt:
                'Les points A, B, M et A, C, N sont alignés dans cet ordre.\nLes droites (BC) et (MN) sont parallèles.\nOn sait que AB = 3 cm, AM = 12 cm et AC = 5 cm.\nCalculer AN.',
              illustrations: [
                '/assets/diagrams/part4/p4-verification-cours-schema.svg',
              ],
              fields: {
                phrase: {
                  kind: 'select',
                  options: ["D'après", 'Donc', 'Car'],
                  expected: "D'après",
                },
                n1: {
                  kind: 'select',
                  options: ['AM', 'AB', 'AN', 'AC', 'MN', 'BC'],
                  expected: 'AM',
                },
                d1: {
                  kind: 'select',
                  options: ['AM', 'AB', 'AN', 'AC', 'MN', 'BC'],
                  expected: 'AB',
                },
                n2: {
                  kind: 'select',
                  options: ['AM', 'AB', 'AN', 'AC', 'MN', 'BC'],
                  expected: 'AN',
                },
                d2: {
                  kind: 'select',
                  options: ['AM', 'AB', 'AN', 'AC', 'MN', 'BC'],
                  expected: 'AC',
                },
                n3: {
                  kind: 'select',
                  options: ['AM', 'AB', 'AN', 'AC', 'MN', 'BC'],
                  expected: 'MN',
                },
                d3: {
                  kind: 'select',
                  options: ['AM', 'AB', 'AN', 'AC', 'MN', 'BC'],
                  expected: 'BC',
                },
                num: { kind: 'number', expected: 12, size: 'num' },
                denCross: { kind: 'number', expected: 5, size: 'num' },
                den: { kind: 'number', expected: 3, size: 'num' },
                an: { kind: 'number', expected: 20, size: 'num' },
                final: { kind: 'number', expected: 20, size: 'num' },
              },
              lines: [
                { type: 'text', text: ALIGN },
                {
                  parts: [
                    { type: 'field', id: 'phrase' },
                    { type: 'text', text: ' le théorème de Thalès,' },
                  ],
                },
                {
                  parts: [
                    { type: 'text', text: 'numérateur 1 : ' },
                    { type: 'field', id: 'n1' },
                    { type: 'text', text: '  dénominateur 1 : ' },
                    { type: 'field', id: 'd1' },
                  ],
                },
                {
                  parts: [
                    { type: 'text', text: 'numérateur 2 : ' },
                    { type: 'field', id: 'n2' },
                    { type: 'text', text: '  dénominateur 2 : ' },
                    { type: 'field', id: 'd2' },
                  ],
                },
                {
                  parts: [
                    { type: 'text', text: 'numérateur 3 : ' },
                    { type: 'field', id: 'n3' },
                    { type: 'text', text: '  dénominateur 3 : ' },
                    { type: 'field', id: 'd3' },
                  ],
                },
                {
                  parts: [
                    { type: 'text', text: 'AN = (' },
                    { type: 'field', id: 'num' },
                    { type: 'text', text: ' × ' },
                    { type: 'field', id: 'denCross' },
                    { type: 'text', text: ') / ' },
                    { type: 'field', id: 'den' },
                    { type: 'text', text: ' = ' },
                    { type: 'field', id: 'an' },
                  ],
                },
                {
                  parts: [
                    { type: 'text', text: 'AN = ' },
                    { type: 'field', id: 'final' },
                    { type: 'text', text: ' cm' },
                  ],
                },
              ],
              hints: [
                maki('Écris d’abord : D’après le théorème de Thalès,'),
                maki('Les trois fractions : AM sur AB, AN sur AC, MN sur BC (en lettres).'),
                maki('Puis calcule AN = (12 × 5) divisé par 3.'),
              ],
              success:
                'Très bien. La phrase du théorème arrive au bon moment, juste avant l’égalité des rapports.',
              correction: `${ALIGN}

${THALES}
${RATIOS}

Donc :
\\dfrac{12}{3} = \\dfrac{AN}{5}

AN = \\dfrac{12 \\times 5}{3}
AN = 20

La longueur AN est donc égale à 20 cm.`,
              setFlags: { p4_verif_done: true },
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
              nextSceneId: 'p4_4_balises_thales',
            },
          ],
        },
      ],
    },
    {
      id: 'p4_4_balises_thales',
      title: 'Les quatre balises de Thalès',
      requireInteraction: true,
      // File pédagogique fixe A→B→C→D (indépendante de la balise cliquée)
      prompt:
        'Touchez n’importe quelle balise pour l’exercice suivant (A → B → C → D).',
      next: 'p4_5_finale_compas_marin',
      decor: {
        background: '/assets/backgrounds/part4/p4-balises-exercices.png',
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
        ids: ['p4_balise_a', 'p4_balise_b', 'p4_balise_c', 'p4_balise_d'],
        introFlag: 'p4_balise_intro_shown',
        outro: [
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
            text: "Cette fois, pas de schéma donné. Il faudra le construire sur le cahier.",
          },
        ],
        exercises: {
          p4_balise_a: thalesExercise({
            id: 'p4_balise_a',
            title: 'Balise A — Traverse de pont',
            prompt:
              'Sur le pont, une petite traverse est parallèle à une grande traverse.\nLes points A, B, M et A, C, N sont alignés dans cet ordre.\nLes droites (BC) et (MN) sont parallèles.\n\nOn sait que AB = 2 m, AM = 8 m et AC = 3 m.\nCalculer AN.',
            expected: 12,
            seek: 'AN',
            illustrations: ['/assets/diagrams/part4/p4-exercice-a-schema.svg'],
            extraCorrection: String.raw`\dfrac{8}{2} = \dfrac{AN}{3}

AN = \dfrac{8 \times 3}{2}
AN = 12`,
            hints: [
              'Commence par vérifier les deux alignements et les parallèles.',
              'Choisis les fractions qui contiennent AN, AB, AM et AC.',
              'Utilise le produit en croix avec les nombres 8, 2 et 3.',
            ],
          }),
          p4_balise_b: thalesExercise({
            id: 'p4_balise_b',
            title: 'Balise B — Petite voile',
            prompt:
              'Une petite voile triangulaire sert de modèle pour une grande voile.\nLes points A, B, M et A, C, N sont alignés dans cet ordre.\nLes droites (BC) et (MN) sont parallèles.\n\nOn sait que AB = 5 m, AM = 15 m et BC = 4 m.\nCalculer MN.',
            expected: 12,
            seek: 'MN',
            illustrations: ['/assets/diagrams/part4/p4-exercice-b-schema.svg'],
            extraCorrection: String.raw`\dfrac{15}{5} = \dfrac{MN}{4}

MN = \dfrac{15 \times 4}{5}
MN = 12`,
            hints: [
              'Ici, on cherche la grande traverse MN.',
              'Utilise la fraction avec MN et BC.',
              'Compare 15 et 5, puis applique la même proportion à 4.',
            ],
          }),
          p4_balise_c: thalesExercise({
            id: 'p4_balise_c',
            title: 'Balise C — Route de la crique',
            noSchemaMsg:
              "Cette fois, le schéma n'est pas affiché. Fais-le sur ton cahier avant de calculer.",
            prompt:
              'Sur une carte, deux chemins partent du point A.\nLes points A, B, M et A, C, N sont alignés dans cet ordre.\nLes droites (BC) et (MN) sont parallèles.\n\nOn sait que AB = 6 m, AM = 18 m et AN = 15 m.\nCalculer AC.',
            expected: 5,
            seek: 'AC',
            correctionIllustration:
              '/assets/diagrams/part4/p4-exercice-c-correction.svg',
            extraCorrection: String.raw`\dfrac{18}{6} = \dfrac{15}{AC}

\dfrac{18}{6} = 3, donc \dfrac{15}{AC} = 3.

AC = \dfrac{15}{3}
AC = 5`,
            hints: [
              'Dessine d’abord le grand triangle AMN, puis place B sur [AM] et C sur [AN].',
              'Le rapport entre AM et AB vaut 3.',
              'Si AN est trois fois plus grand que AC, alors AC est trois fois plus petit que AN.',
            ],
          }),
          p4_balise_d: thalesExercise({
            id: 'p4_balise_d',
            title: 'Balise D — Balise du large',
            noSchemaMsg:
              'Dernière balise : à toi de construire le schéma sur ton cahier.',
            prompt:
              'Pour aligner une balise du large, Alizée trace deux triangles emboîtés.\nLes points A, B, M et A, C, N sont alignés dans cet ordre.\nLes droites (BC) et (MN) sont parallèles.\n\nOn sait que AB = 8 m, AM = 24 m et MN = 18 m.\nCalculer BC.',
            expected: 6,
            seek: 'BC',
            correctionIllustration:
              '/assets/diagrams/part4/p4-exercice-d-correction.svg',
            extraCorrection: String.raw`\dfrac{24}{8} = \dfrac{18}{BC}

\dfrac{24}{8} = 3, donc \dfrac{18}{BC} = 3.

BC = \dfrac{18}{3}
BC = 6`,
            hints: [
              'Le grand segment parallèle est MN, le petit est BC.',
              'Trouve combien de fois AB rentre dans AM.',
              'MN est trois fois plus grand que BC.',
            ],
          }),
        },
      },
    },
    {
      id: 'p4_5_finale_compas_marin',
      title: 'Compas marin à traverse',
      requireInteraction: true,
      prompt: 'Règle le compas marin.',
      next: 'p4_6_fragment_paralleles',
      decor: {
        background: '/assets/backgrounds/part4/p4-finale-compas.png',
        objects: [],
      },
      hotspots: [
        {
          id: 'compas_final',
          label: 'Compas marin',
          x: 50,
          y: 55,
          w: 24,
          h: 28,
          required: true,
          inDecor: true,
          repeatable: true,
          advancesStory: true,
          sequence: [
            {
              type: 'cloze',
              id: 'p4_compas_marin',
              title: 'Finale — Compas marin',
              progressiveHelp: true,
              prompt:
                "Sur la carte du trésor, Alizée utilise un vieux compas marin dont les deux branches mesurent 12 cm.\nLa tige de laiton, parallèle à l'écartement des pointes, est réglable : sa longueur est notée x.\n\nLa tige est placée à 4 cm du pivot du compas, donc à 8 cm des pointes.\nAlizée veut tracer un cercle de 12 cm de diamètre autour d'une balise.\n\nObserve le schéma ci-dessous, puis réponds aux questions.\n\n1) Le cercle demandé a un diamètre de 12 cm. Quelle doit être l'ouverture du compas ?\n2) Quelle doit être la longueur de la tige x ?",
              illustrations: ['/assets/diagrams/part4/p4-compas-enonce.png'],
              fields: {
                ouverture: {
                  kind: 'number',
                  expected: 6,
                  size: 'num',
                  label: 'Ouverture (rayon)',
                },
                x: {
                  kind: 'number',
                  expected: 2,
                  size: 'num',
                  label: 'Longueur x',
                },
              },
              lines: [
                {
                  parts: [
                    { type: 'text', text: 'Ouverture du compas = ' },
                    { type: 'field', id: 'ouverture' },
                    { type: 'text', text: ' cm' },
                  ],
                },
                {
                  parts: [
                    { type: 'text', text: 'Longueur de la tige x = ' },
                    { type: 'field', id: 'x' },
                    { type: 'text', text: ' cm' },
                  ],
                },
              ],
              hints: [
                maki('Attention : le compas trace un rayon, pas un diamètre.'),
                maki(
                  'Si le diamètre vaut 12 cm, l’ouverture du compas vaut 6 cm.',
                ),
                maki(
                  'Fais un triangle avec le pivot en A, les deux pointes en M et N, et la tige parallèle aux pointes.',
                ),
                maki('Utilise les fractions avec 12, 4, 6 et x.'),
              ],
              success: 'La tige est réglée à 2 cm.',
              correction: `Le cercle demandé a un diamètre de 12 cm.
L'ouverture du compas correspond au rayon du cercle.

Donc l'ouverture du compas doit être de 6 cm.

On modélise le compas par un grand triangle AMN.
La tige de laiton est le segment [BC].
${ALIGN}

On a :
AM = 12 cm
AB = 4 cm
MN = 6 cm
BC = x

${THALES}
${RATIOS}

Donc :
\\dfrac{12}{4} = \\dfrac{6}{x}

\\dfrac{12}{4} = 3, donc \\dfrac{6}{x} = 3.

x = \\dfrac{6}{3}
x = 2

La tige doit mesurer 2 cm.`,
              correctionIllustration:
                '/assets/diagrams/part4/p4-compas-correction.svg',
              setFlags: { p4_compas_done: true },
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Alizée',
                  text: 'La tige est réglée à 2 cm. Le cercle entoure exactement la balise.',
                },
                {
                  speaker: 'Nérée',
                  text: 'Voilà un compas qui sait enfin obéir aux parallèles.',
                },
                {
                  speaker: 'Euclide',
                  text: 'Et surtout une rédaction complète : conditions, théorème, fractions, calcul.',
                },
              ],
              nextSceneId: 'p4_6_fragment_paralleles',
            },
          ],
        },
      ],
    },
    {
      id: 'p4_6_fragment_paralleles',
      title: 'Le quatrième fragment',
      requireInteraction: true,
      prompt: 'Récupère le quatrième fragment de carte.',
      next: 'p4_7_conclusion',
      decor: {
        background: '/assets/backgrounds/part4/p4-fragment-paralleles.png',
        objects: [
          {
            image: '/assets/objects/part4/fragment-carte-4.png',
            alt: 'Quatrième fragment de carte',
            x: 62,
            y: 48,
            w: 14,
            h: 16,
            z: 4,
          },
        ],
      },
      hotspots: [
        {
          id: 'fragment_4',
          label: 'Fragment 4',
          x: 62,
          y: 48,
          w: 14,
          h: 16,
          required: true,
          image: '/assets/objects/part4/fragment-carte-4.png',
          inDecor: true,
          repeatable: true,
          advancesStory: true,
          sequence: [
            {
              type: 'fragmentZoom',
              image: '/assets/objects/part4/fragment-carte-4.png',
              alt: 'Zoom du quatrième fragment',
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Alizée',
                  text: 'Le quatrième fragment se place sur la carte. Les routes commencent à converger.',
                },
              ],
              completeScene: false,
            },
            {
              type: 'fragmentBoard',
              placeFragment: 4,
              total: 6,
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Nérée',
                  text: 'Quatre fragments sur six. La cache de Thalès se rapproche.',
                },
                {
                  speaker: 'Euclide',
                  text: 'Les triangles emboîtés sont maîtrisés. Mais il existe une autre configuration de Thalès.',
                },
                {
                  speaker: 'Alizée',
                  text: 'Fragments récupérés : 4 / 6. La prochaine étape nous attend : le triangle papillon.',
                },
              ],
              setFlags: {
                fragment4Collected: true,
                fragment_4: true,
              },
              nextSceneId: 'p4_7_conclusion',
            },
          ],
        },
      ],
    },
    {
      id: 'p4_7_conclusion',
      title: 'Vers le triangle papillon',
      requireInteraction: false,
      decor: {
        background: '/assets/backgrounds/part4/p4-arrivee-ile-paralleles.png',
      },
      steps: [
        {
          type: 'dialogue',
          id: 'p4_conclusion_dialogue',
          lines: [
            {
              speaker: 'Euclide',
              text: 'Vous savez maintenant utiliser le théorème de Thalès avec des triangles emboîtés.',
            },
            {
              speaker: 'Nérée',
              text: 'Il reste une autre figure, plus retorse : le papillon.',
            },
            {
              speaker: 'Alizée',
              text: 'Alors cap sur la partie 5.',
            },
            { speaker: 'Maki', text: 'Krii !' },
          ],
          endPart: true,
          message: 'Partie 4 terminée. Quatrième fragment récupéré.',
          announce: 'Partie 5 — Thalès : configuration papillon',
          nextPartId: 'part5',
          nextPartTitle: 'Partie 5 — Thalès : configuration papillon',
        },
      ],
    },
  ],
};

// Add lesson diagram on notebook page 1 via illustrations in a text note
const carnet = content.scenes.find((s) => s.id === 'p4_2_carnet_thales');
const nb = carnet.hotspots[0].sequence.find((s) => s.type === 'notebook');
nb.pages[0].blocks.push({
  type: 'text',
  text: 'Schéma de la configuration : voir le carnet (triangles emboîtés).',
});
// Store schema path in meta for tests
nb.pages.splice(1, 0, {
  title: 'Schéma',
  blocks: [
    {
      type: 'text',
      text: 'Figure de la configuration de Thalès (triangles emboîtés).',
    },
  ],
  // custom field used by engine if supported - also embed as string for tests
  figureImage: '/assets/diagrams/part4/p4-lecon-thales-emboites.svg',
});

// Ensure raw strings for tests
const rawCheck = JSON.stringify(content);
if (!rawCheck.includes("D'après le théorème de Thalès")) {
  throw new Error('missing thales phrase');
}
if (/AM\s*\/\s*AB/.test(rawCheck) || /AN\s*\/\s*AC/.test(rawCheck) || /MN\s*\/\s*BC/.test(rawCheck)) {
  throw new Error('linear fractions found');
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
console.log('Wrote', out);
console.log('scenes', content.meta.sceneOrder.length);
console.log(
  'thales count',
  (rawCheck.match(/D'après le théorème de Thalès/g) || []).length,
);
