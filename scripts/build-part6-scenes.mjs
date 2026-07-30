/**
 * Génère client/content/part6/scenes.json (réciproque de Thalès).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'client/content/part6/scenes.json');

function maki(text) {
  return { reaction: 'Krii !', text };
}

function freeTalk(speaker, text) {
  return {
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
    lines: [{ speaker, text }],
  };
}

function parallelCloze({
  id,
  title,
  prompt,
  illustration,
  r1Expected,
  r2Expected,
  r1Accept,
  r2Accept,
  parallel, // true si parallèles
  hints,
  correction,
  unit = '',
}) {
  const conclusionExpected = parallel ? 'Oui' : 'Non';
  return {
    type: 'cloze',
    id,
    title,
    progressiveHelp: true,
    prompt,
    illustrations: illustration ? [illustration] : undefined,
    fields: {
      r1: {
        kind: 'number',
        expected: r1Expected,
        ...(r1Accept ? { accept: r1Accept } : {}),
        size: 'num',
        label: 'Premier rapport',
        tolerance: 0.02,
      },
      r2: {
        kind: 'number',
        expected: r2Expected,
        ...(r2Accept ? { accept: r2Accept } : {}),
        size: 'num',
        label: 'Second rapport',
        tolerance: 0.02,
      },
      conclusion: {
        kind: 'select',
        options: ['Oui', 'Non'],
        expected: conclusionExpected,
        label: 'Parallèles ?',
      },
    },
    lines: [
      {
        parts: [
          { type: 'text', text: 'Premier rapport = ' },
          { type: 'field', id: 'r1' },
        ],
      },
      {
        parts: [
          { type: 'text', text: 'Second rapport = ' },
          { type: 'field', id: 'r2' },
        ],
      },
      {
        parts: [
          {
            type: 'text',
            text: 'Les droites sont-elles parallèles ? ',
          },
          { type: 'field', id: 'conclusion' },
        ],
      },
    ],
    hints: (hints || []).map(maki),
    success: parallel
      ? 'Exact. Les rapports sont égaux : les droites sont parallèles.'
      : 'Exact. Les rapports sont différents : les droites ne sont pas parallèles.',
    correction,
    setFlags: { [`${id}_done`]: true },
    completeScene: false,
  };
}

const exA = parallelCloze({
  id: 'p6_balise_a',
  title: 'Exercice A — Les haubans du mât',
  prompt:
    'Configuration emboîtée.\nLes points A, B, M et A, C, N sont alignés dans cet ordre.\nOn sait que AB = 3 m, AM = 7,5 m, AC = 4 m et AN = 10 m.\n\nLes droites (BC) et (MN) sont-elles parallèles ?\nCalcule d’abord les deux rapports AM/AB et AN/AC (valeur décimale).',
  illustration: '/assets/diagrams/part6/p6-exercice-a-schema.png',
  r1Expected: 2.5,
  r2Expected: 2.5,
  parallel: true,
  hints: [
    'Compare AM ÷ AB et AN ÷ AC.',
    '7,5 ÷ 3 = 2,5 et 10 ÷ 4 = 2,5.',
    'Si les rapports sont égaux, la réciproque de Thalès prouve le parallélisme.',
  ],
  correction:
    "AM / AB = 7,5 / 3 = 2,5.\nAN / AC = 10 / 4 = 2,5.\nLes rapports sont égaux.\nDonc, d'après la réciproque du théorème de Thalès, les droites (BC) et (MN) sont parallèles.",
});

const exB = parallelCloze({
  id: 'p6_balise_b',
  title: 'Exercice B — Les routes de Silas',
  prompt:
    'Configuration papillon.\nLes points A, O, M et B, O, N sont alignés dans cet ordre.\nOn sait que OA = 6 cm, OM = 10 cm, OB = 8 cm et ON = 15 cm.\n\nLes droites (AB) et (MN) sont-elles parallèles ?\nCalcule OM/OA et ON/OB (valeurs décimales).',
  illustration: '/assets/diagrams/part6/p6-exercice-b-schema.png',
  r1Expected: 10 / 6,
  r2Expected: 15 / 8,
  parallel: false,
  hints: [
    'Compare OM ÷ OA et ON ÷ OB.',
    '10 ÷ 6 ≈ 1,67 et 15 ÷ 8 = 1,875.',
    'Si les rapports ne sont pas égaux, les droites ne sont pas parallèles.',
  ],
  correction:
    'OM / OA = 10 / 6 ≈ 1,67.\nON / OB = 15 / 8 = 1,875.\nLes rapports ne sont pas égaux.\nDonc les droites (AB) et (MN) ne sont pas parallèles.',
});

const exC = parallelCloze({
  id: 'p6_balise_c',
  title: 'Exercice C — La passerelle du récif',
  prompt:
    'Configuration emboîtée.\nLes points A, B, M et A, C, N sont alignés dans cet ordre.\nOn sait que AB = 3,6 m, AM = 6 m, AC = 4,8 m et AN = 7,5 m.\n\nLes droites (BC) et (MN) sont-elles parallèles ?',
  illustration: '/assets/diagrams/part6/p6-exercice-c-schema.png',
  r1Expected: 6 / 3.6,
  r2Expected: 7.5 / 4.8,
  parallel: false,
  hints: [
    'Calcule AM ÷ AB et AN ÷ AC.',
    '6 ÷ 3,6 ≈ 1,67 et 7,5 ÷ 4,8 = 1,5625.',
    'Rapports différents → pas de parallélisme.',
  ],
  correction:
    'AM / AB = 6 / 3,6 ≈ 1,67.\nAN / AC = 7,5 / 4,8 = 1,5625.\nLes rapports ne sont pas égaux.\nDonc les droites (BC) et (MN) ne sont pas parallèles.',
});

const exD = parallelCloze({
  id: 'p6_balise_d',
  title: 'Exercice D — La table à cartes du capitaine',
  prompt:
    'Configuration papillon (supports croisés).\nSur la table à cartes pirate, on mesure 42 cm, 70 cm, 32,4 cm et 54 cm.\n\nLa table à cartes est-elle horizontale ?\nCalcule 42/70 et 32,4/54 (valeurs décimales).',
  illustration: '/assets/diagrams/part6/p6-exercice-d-table-schema.png',
  r1Expected: 0.6,
  r2Expected: 0.6,
  parallel: true,
  hints: [
    'Calcule 42 ÷ 70 et 32,4 ÷ 54.',
    '42 / 70 = 0,6 et 32,4 / 54 = 0,6.',
    'Rapports égaux → d’après la réciproque de Thalès, la table est horizontale.',
  ],
  correction:
    "42 / 70 = 0,6.\n32,4 / 54 = 0,6.\nLes rapports sont égaux.\nDonc, d'après la réciproque du théorème de Thalès, la table à cartes est horizontale.",
});

// Override D lines labels for "horizontale"
exD.lines = [
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
      { type: 'text', text: 'La table est-elle horizontale ? ' },
      { type: 'field', id: 'conclusion' },
    ],
  },
];
exD.fields.conclusion.label = 'Horizontale ?';
exD.success =
  'Exact. 42/70 = 32,4/54 = 0,6 : la table est horizontale par la réciproque de Thalès.';

const content = {
  meta: {
    partId: 'part6',
    title: 'Partie 6 — Réciproque du théorème de Thalès',
    startSceneId: 'p6_0_cabinet_routes',
    sceneOrder: [
      'p6_0_cabinet_routes',
      'p6_1_activite_cordages',
      'p6_2_carnet_reciproque',
      'p6_3_exercice_guide',
      'p6_4_balises_verification',
      'p6_5_fragment_final',
      'p6_6_conclusion',
    ],
    endMessage:
      'La réciproque de Thalès est maîtrisée. Le sixième et dernier fragment est en sécurité.',
    announceNext: 'Partie 7 — Bilan final',
    nextPartId: 'part7',
  },
  scenes: [
    {
      id: 'p6_0_cabinet_routes',
      title: 'Le cabinet des routes',
      requireInteraction: true,
      prompt: 'Explore le cabinet des routes. Les parallèles ne se devinent pas : il faut les prouver.',
      next: 'p6_1_activite_cordages',
      decor: {
        background: '/assets/backgrounds/part6/p6-0-cabinet-routes.png',
        objects: [],
      },
      hotspots: [
        freeTalk('Maki', 'Si la carte ment, je boude la boussole.'),
        {
          id: 'table_navigation',
          label: 'Table de navigation',
          x: 55,
          y: 55,
          w: 24,
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
                  text: "Cette fois, ce n'est plus une distance qu'il faut calculer. Il faut savoir si deux routes sont vraiment parallèles.",
                },
                {
                  speaker: 'Euclide',
                  text: 'Deux traits peuvent sembler parallèles sans l’être vraiment.',
                },
                {
                  speaker: 'Alizée',
                  text: 'Alors on va devoir le prouver, pas seulement le regarder.',
                },
                {
                  speaker: 'Maki',
                  text: 'Je propose qu’on appelle ça une table à doutes.',
                },
              ],
              setFlags: { p6IntroDone: true, part6Unlocked: true },
              nextSceneId: 'p6_1_activite_cordages',
            },
          ],
        },
      ],
    },
    {
      id: 'p6_1_activite_cordages',
      title: 'Les deux cordages',
      requireInteraction: true,
      prompt: 'Observe les deux cordages et compare les rapports.',
      next: 'p6_2_carnet_reciproque',
      decor: {
        background: '/assets/backgrounds/part6/p6-1-activite-cordages.png',
        objects: [],
      },
      hotspots: [
        freeTalk(
          'Alizée',
          'Deux cordages, quatre mesures… ça sent le piège proprement organisé.',
        ),
        {
          id: 'cordages',
          label: 'Cordages',
          x: 48,
          y: 50,
          w: 26,
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
                  speaker: 'Euclide',
                  text: 'Sur le pont, deux cordages partent du même anneau A. Une petite barre est fixée entre B et C, une grande entre M et N.',
                },
              ],
            },
            parallelCloze({
              id: 'p6_activite_cordages',
              title: 'Activité — Les deux cordages',
              prompt:
                'Les points A, B, M et A, C, N sont alignés dans cet ordre.\nOn sait que AB = 4 m, AM = 10 m, AC = 6 m et AN = 15 m.\n\nLes barres (BC) et (MN) sont-elles parallèles ?\nCalcule les deux rapports (grand/petit ou petit/grand, de façon cohérente).',
              illustration:
                '/assets/diagrams/part6/p6-activite-cordages-schema.png',
              r1Expected: 2.5,
              r2Expected: 2.5,
              // Rapport inverse cohérent aussi accepté : 4/10 = 6/15 = 0,4
              r1Accept: [0.4, 0.4, '0.4', '0,4', '0.40', '0,40', 2.5, '2.5', '2,5', '2.50', '2,50'],
              r2Accept: [0.4, 0.4, '0.4', '0,4', '0.40', '0,40', 2.5, '2.5', '2,5', '2.50', '2,50'],
              parallel: true,
              hints: [
                'Tu peux calculer 10 ÷ 4 et 15 ÷ 6, ou bien 4 ÷ 10 et 6 ÷ 15.',
                'Les deux rapports valent 2,5… ou 0,4 si tu compares petit sur grand.',
                'Rapports égaux → parallèles par la réciproque de Thalès.',
              ],
              correction:
                "AM / AB = 10 / 4 = 2,5 et AN / AC = 15 / 6 = 2,5.\n(Ou bien AB / AM = 4 / 10 = 0,4 et AC / AN = 6 / 15 = 0,4.)\nLes rapports sont égaux. Donc, d'après la réciproque du théorème de Thalès, les droites (BC) et (MN) sont parallèles.",
            }),
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Euclide',
                  text: 'Quand les rapports sont égaux, on peut prouver le parallélisme. C’est la réciproque du théorème de Thalès.',
                },
              ],
              nextSceneId: 'p6_2_carnet_reciproque',
            },
          ],
        },
      ],
    },
    {
      id: 'p6_2_carnet_reciproque',
      title: 'Carnet : réciproque de Thalès',
      requireInteraction: true,
      prompt: 'Touche le carnet pour recopier la leçon.',
      next: 'p6_3_exercice_guide',
      decor: {
        background: '/assets/backgrounds/part6/p6-2-carnet-reciproque.png',
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
        freeTalk('Nérée', 'En mer, presque parallèle, ce n’est pas parallèle.'),
        {
          id: 'carnet_reciproque',
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
                  text: 'Sortez votre cahier. La réciproque mérite d’être écrite proprement.',
                },
              ],
            },
            {
              type: 'notebook',
              id: 'p6_cours_reciproque',
              title: 'Réciproque du théorème de Thalès',
              pages: [
                {
                  title: 'VI. Réciproque du théorème de Thalès',
                  figureImage:
                    '/assets/diagrams/part6/p6-lecon-reciproque-emboitee.png',
                  diagramImage:
                    '/assets/diagrams/part6/p6-lecon-reciproque-emboitee.png',
                  figureAlt: 'Configuration emboîtée',
                  blocks: [
                    {
                      type: 'text',
                      text: 'Soient deux droites sécantes en A.',
                    },
                    {
                      type: 'text',
                      text: 'Les points A, B, M sont alignés dans le même ordre.',
                    },
                    {
                      type: 'text',
                      text: 'Les points A, C, N sont alignés dans le même ordre.',
                    },
                    {
                      type: 'text',
                      text: 'Si AM/AB = AN/AC, alors les droites (MN) et (BC) sont parallèles.',
                    },
                  ],
                },
                {
                  title: 'Schéma papillon',
                  figureImage:
                    '/assets/diagrams/part6/p6-lecon-reciproque-papillon.png',
                  diagramImage:
                    '/assets/diagrams/part6/p6-lecon-reciproque-papillon.png',
                  figureAlt: 'Configuration papillon',
                  blocks: [
                    {
                      type: 'text',
                      text: 'La même réciproque s’applique en configuration papillon, dès que les alignements sont respectés.',
                    },
                  ],
                },
                {
                  title: 'Méthode',
                  blocks: [
                    { type: 'text', text: '1. Je vérifie les alignements.' },
                    {
                      type: 'text',
                      text: '2. Je repère les deux rapports à comparer.',
                    },
                    {
                      type: 'text',
                      text: '3. Je calcule les deux rapports séparément.',
                    },
                    {
                      type: 'text',
                      text: '4. Si les rapports sont égaux, les droites sont parallèles.',
                    },
                    {
                      type: 'text',
                      text: '5. Si les rapports ne sont pas égaux, les droites ne sont pas parallèles.',
                    },
                    {
                      type: 'text',
                      text: 'Attention : le théorème de Thalès calcule des longueurs quand les droites sont déjà parallèles. La réciproque prouve que des droites sont parallèles.',
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
                  text: 'Retenez : alignements, deux rapports, conclusion.',
                },
              ],
              setFlags: { p6CourseDone: true },
              nextSceneId: 'p6_3_exercice_guide',
            },
          ],
        },
      ],
    },
    {
      id: 'p6_3_exercice_guide',
      title: 'Exercice guidé — les mâts',
      requireInteraction: true,
      prompt: 'Complète l’exercice guidé sur les mâts.',
      next: 'p6_4_balises_verification',
      decor: {
        background: '/assets/backgrounds/part6/p6-3-exercice-guide-mats.png',
        objects: [],
      },
      hotspots: [
        freeTalk(
          'Maki',
          'Je peux aider, mais je refuse de faire les divisions à ta place.',
        ),
        {
          id: 'mats_guide',
          label: 'Mâts',
          x: 50,
          y: 52,
          w: 24,
          h: 26,
          required: true,
          inDecor: true,
          repeatable: true,
          advancesStory: true,
          sequence: [
            parallelCloze({
              id: 'p6_exercice_guide',
              title: 'Exercice guidé',
              prompt:
                'Configuration emboîtée.\nAB = 5 m, AM = 12 m, AC = 7 m, AN = 16,8 m.\n\nLes droites (BC) et (MN) sont-elles parallèles ?\nRapports à comparer : AM/AB et AN/AC.',
              illustration:
                '/assets/diagrams/part6/p6-exercice-guide-schema.png',
              r1Expected: 2.4,
              r2Expected: 2.4,
              parallel: true,
              hints: [
                'Ne commence pas par l’œil : commence par les rapports.',
                '12 ÷ 5 = 2,4 et 16,8 ÷ 7 = 2,4.',
                'Si les deux nombres sont identiques, Euclide sourit.',
              ],
              correction:
                'AM / AB = 12 / 5 = 2,4.\nAN / AC = 16,8 / 7 = 2,4.\nLes rapports sont égaux, donc (BC) // (MN).',
            }),
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Euclide',
                  text: 'Bien. Quatre balises pour vérifier que la méthode tient dans tous les cas.',
                },
              ],
              setFlags: { p6GuidedDone: true },
              nextSceneId: 'p6_4_balises_verification',
            },
          ],
        },
      ],
    },
    {
      id: 'p6_4_balises_verification',
      title: 'Balises de vérification',
      requireInteraction: true,
      prompt:
        'Touchez n’importe quelle balise pour l’exercice suivant (A → B → C → D).',
      next: 'p6_5_fragment_final',
      decor: {
        background: '/assets/backgrounds/part6/p6-4-haubans-mat.png',
        objects: [],
      },
      hotspots: [
        freeTalk('Nérée', 'Une table penchée, c’est une carte qui ment.'),
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
        ids: ['p6_balise_a', 'p6_balise_b', 'p6_balise_c', 'p6_balise_d'],
        introFlag: 'p6_balise_intro_shown',
        outro: [
          {
            speaker: 'Alizée',
            text: 'Les quatre balises sont réglées. La réciproque a parlé juste.',
          },
          {
            speaker: 'Euclide',
            text: 'Il reste la récompense : le sixième fragment.',
          },
          {
            speaker: 'Nérée',
            text: 'La table cesse de trembler… regardez.',
          },
        ],
        exercises: {
          p6_balise_a: {
            ...exA,
            setFlags: {
              p6_balise_a_done: true,
              p6ExerciseACompleted: true,
            },
          },
          p6_balise_b: {
            ...exB,
            setFlags: {
              p6_balise_b_done: true,
              p6ExerciseBCompleted: true,
            },
          },
          p6_balise_c: {
            ...exC,
            setFlags: {
              p6_balise_c_done: true,
              p6ExerciseCCompleted: true,
            },
          },
          p6_balise_d: {
            ...exD,
            setFlags: {
              p6_balise_d_done: true,
              p6ExerciseDCompleted: true,
            },
          },
        },
      },
    },
    {
      id: 'p6_5_fragment_final',
      title: 'Le sixième fragment',
      requireInteraction: true,
      prompt: 'Récupère le sixième et dernier fragment de carte.',
      next: 'p6_6_conclusion',
      decor: {
        background: '/assets/backgrounds/part6/p6-8-fragment-final.png',
        objects: [
          {
            image: '/assets/objects/part6/fragment-carte-6.png',
            alt: 'Sixième fragment de carte',
            x: 55,
            y: 48,
            w: 14,
            h: 16,
            z: 4,
          },
        ],
      },
      hotspots: [
        freeTalk(
          'Maki',
          'J’ai toujours cru en nous. Surtout après avoir vu la réponse.',
        ),
        {
          id: 'fragment_6',
          label: 'Fragment 6',
          x: 55,
          y: 48,
          w: 14,
          h: 16,
          required: true,
          image: '/assets/objects/part6/fragment-carte-6.png',
          inDecor: true,
          repeatable: true,
          advancesStory: true,
          sequence: [
            {
              type: 'fragmentZoom',
              image: '/assets/objects/part6/fragment-carte-6-large.png',
              alt: 'Zoom du sixième fragment',
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Alizée',
                  text: 'Le sixième fragment… C’est le dernier.',
                },
              ],
              completeScene: false,
            },
            {
              type: 'fragmentBoard',
              placeFragment: 6,
              total: 6,
              completeScene: false,
            },
            {
              type: 'dialogue',
              lines: [
                {
                  speaker: 'Euclide',
                  text: 'Nous avons maintenant toute la carte.',
                },
                {
                  speaker: 'Maki',
                  text: 'Donc la bonne nouvelle, c’est qu’on sait où aller. La mauvaise, c’est que Silas le sait peut-être aussi.',
                },
                {
                  speaker: 'Nérée',
                  text: 'Cap sur l’île finale. Le Trésor de Thalès nous attend.',
                },
              ],
              setFlags: {
                fragment6Collected: true,
                fragment_6: true,
              },
              nextSceneId: 'p6_6_conclusion',
            },
          ],
        },
      ],
    },
    {
      id: 'p6_6_conclusion',
      title: 'Vers le bilan final',
      requireInteraction: false,
      decor: {
        background: '/assets/backgrounds/part6/p6-0-cabinet-routes.png',
      },
      steps: [
        {
          type: 'dialogue',
          id: 'p6_conclusion_dialogue',
          lines: [
            {
              speaker: 'Euclide',
              text: 'Vous savez maintenant prouver le parallélisme avec la réciproque de Thalès.',
            },
            {
              speaker: 'Alizée',
              text: 'Six fragments sur six. La carte est complète.',
            },
            {
              speaker: 'Nérée',
              text: 'Il reste le bilan final… et peut-être une dernière surprise.',
            },
            {
              speaker: 'Maki',
              text: 'Krii !',
            },
          ],
          endPart: true,
          message: 'Partie 6 terminée. Sixième fragment récupéré.',
          announce: 'Partie 7 — Bilan final',
          nextPartId: 'part7',
          nextPartTitle: 'Partie 7 — Bilan final',
        },
      ],
    },
  ],
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
console.log('wrote', out);
console.log(
  'queue',
  content.scenes.find((s) => s.id === 'p6_4_balises_verification').exerciseQueue
    .ids,
);
