/**
 * Correctifs part3 : fonds, 3 mini-moulins, exercice C, finale non guidée.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const scenesPath = path.join(root, 'client/content/part3/scenes.json');
const content = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));

function byId(id) {
  return content.scenes.find((s) => s.id === id);
}

// Fix any broken accented paths from earlier polish
function fixPaths(obj) {
  const s = JSON.stringify(obj)
    .replaceAll('grande-pièce-triangle.png', 'grande-piece-triangle.png')
    .replaceAll('grande_pièce', 'grande_piece')
    .replaceAll('pièce_finale', 'piece_finale')
    .replaceAll('\"id\": \"pièce_', '"id": "piece_');
  return JSON.parse(s);
}

// —— p3_1 découverte ——
const p1 = byId('p3_1_decouverte_gabarits');
p1.title = 'Les deux gabarits';
p1.prompt =
  "Observe les deux triangles de bois. Ils n'ont ni la même taille, ni la même orientation : peuvent-ils quand même avoir la même forme ?";
p1.decor = {
  background: '/assets/backgrounds/part3/p3-atelier-gabarits.png',
  objects: [],
};
p1.hotspots = [
  {
    id: 'petit_gabarit',
    label: 'Petit gabarit',
    x: 29,
    y: 61,
    w: 26,
    h: 24,
    required: true,
    inDecor: true,
    repeatable: true,
    advancesStory: true,
    lines: [
      {
        speaker: 'Alizée',
        text: "Le deuxième triangle est plus petit et il n'est pas tourné dans le même sens.",
      },
      {
        speaker: 'Nérée',
        text: 'Pourtant, le charpentier semble vouloir s’en servir comme modèle.',
      },
      {
        speaker: 'Euclide',
        text: 'Avant de donner un nom à cette situation, cherchons ce qui peut rester identique quand on agrandit ou quand on réduit un triangle.',
      },
    ],
  },
  {
    id: 'grande_piece',
    label: 'Grande pièce',
    x: 48,
    y: 63,
    w: 15,
    h: 20,
    required: true,
    inDecor: true,
    repeatable: true,
    advancesStory: true,
    lines: [
      {
        speaker: 'Alizée',
        text: 'Ce second triangle change de taille… et d’orientation.',
      },
      {
        speaker: 'Euclide',
        text: 'Pourtant, quelque chose peut rester le même : la forme.',
      },
    ],
  },
];
p1.onAllRequired = {
  type: 'quiz',
  id: 'p3_decouverte_qcm',
  question:
    'Pour savoir si deux triangles ont la même forme, qu’est-ce qu’il faut surtout comparer ?',
  options: [
    {
      text: 'Leurs angles de même mesure.',
      correct: true,
      success:
        'Exact. Deux triangles peuvent changer de taille ou d’orientation, mais garder les mêmes angles.',
    },
    {
      text: 'Leur position sur la table.',
      explanation:
        'Pas tout à fait. La position, le sens ou le matériau ne définissent pas la forme mathématique. Ce sont les angles qui nous intéressent.',
    },
    {
      text: 'Leur couleur ou le bois utilisé.',
      explanation:
        'Pas tout à fait. La position, le sens ou le matériau ne définissent pas la forme mathématique. Ce sont les angles qui nous intéressent.',
    },
  ],
  completeScene: false,
};
// After QCM, dialogue institutionalizing then next scene - via sequence on a third required?
// Simpler: put nextSceneId on quiz after institutionalization dialogue in onAllRequired
// Engine only supports one onAllRequired step. Chain: quiz nextSceneId to carnet,
// and put institutionalization as first dialogue of carnet steps.

// Add intro dialogue after quiz via nextSceneId only - institutionalization on carnet entry.

// —— p3_2 carnet : dialogue + livret avant notebook ——
const p2 = byId('p3_2_carnet_euclide');
p2.requireInteraction = true;
p2.prompt = 'Touche le livret d’Euclide pour la pause cahier.';
p2.decor = {
  background: '/assets/backgrounds/part3/p3-atelier-gabarits.png',
  objects: [
    {
      image: '/assets/objects/part3/livret-euclide.png',
      alt: 'Livret d’Euclide ouvert',
      x: 50,
      y: 58,
      w: 28,
      h: 26,
      z: 2,
    },
  ],
};
const notebook = (p2.steps || []).find((s) => s.type === 'notebook');
p2.hotspots = [
  {
    id: 'livret_euclide',
    label: 'Livret d’Euclide',
    x: 50,
    y: 56,
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
            text: 'Quand deux triangles ont leurs angles deux à deux de même mesure, on dit qu’ils sont semblables.',
          },
          {
            speaker: 'Euclide',
            text: 'Sortez votre cahier. Ce livret résume ce qu’il faut noter sur les triangles semblables.',
          },
        ],
      },
      {
        ...notebook,
        nextSceneId: 'p3_3_exercices_application',
      },
    ],
  },
];
delete p2.steps;

// —— p3_3 trois mini-moulins ——
const appA = {
  type: 'cloze',
  id: 'p3_app_a',
  title: 'Exercice A — Petite pale et grande pale',
  progressiveHelp: true,
  prompt:
    'Les triangles sont semblables. Petit triangle : 3, 4, 5. Grand triangle : 6, 8, ?. Trouve la longueur manquante.',
  fields: [
    { id: 'coef', label: 'Coefficient', expected: ['2'], size: 'num' },
    { id: 'missing', label: 'Longueur manquante', expected: ['10'], size: 'num' },
  ],
  lines: [
    'Les triangles sont semblables, donc les longueurs des côtés correspondants (côtés qui jouent le même rôle) sont proportionnelles.',
    'On passe de 3 à 6 en multipliant par {{coef}}.',
    'On vérifie aussi : 4 × {{coef}} = 8.',
    'La longueur manquante vaut 5 × {{coef}} = {{missing}}.',
  ],
  hints: [
    { reaction: 'Krii !', text: 'Regarde comment passer de 3 à 6.' },
    {
      reaction: 'Krii !',
      text: 'Vérifie que le même coefficient permet de passer de 4 à 8.',
    },
    { reaction: 'Krii !', text: 'Applique ce coefficient au côté 5.' },
  ],
  success: 'Exact. Le coefficient est 2 et la longueur manquante vaut 10.',
  correction: [
    'Les triangles sont semblables, donc les longueurs des côtés correspondants (côtés qui jouent le même rôle) sont proportionnelles.',
    'On passe de 3 à 6 en multipliant par 2.',
    'On vérifie aussi : 4 × 2 = 8.',
    'La longueur manquante vaut 5 × 2 = 10.',
  ],
  setFlags: { p3_app_a_done: true },
  completeScene: false,
};

const appB = {
  type: 'cloze',
  id: 'p3_app_b',
  title: 'Exercice B — Gabarit et pièce de roue',
  progressiveHelp: true,
  prompt:
    'Le petit gabarit a pour longueurs 4, 6 et 7. La grande pièce semblable a pour longueurs 12, 18 et ?. Trouve la longueur manquante.',
  fields: [
    { id: 'coef', label: 'Coefficient', expected: ['3'], size: 'num' },
    { id: 'missing', label: 'Longueur manquante', expected: ['21'], size: 'num' },
  ],
  lines: [
    'Les triangles sont semblables, donc les longueurs des côtés correspondants (côtés qui jouent le même rôle) sont proportionnelles.',
    'On passe de 4 à 12 en multipliant par {{coef}}.',
    'On vérifie aussi : 6 × {{coef}} = 18.',
    'La longueur manquante vaut 7 × {{coef}} = {{missing}}.',
  ],
  hints: [
    { reaction: 'Krii !', text: 'Cherche le coefficient entre 4 et 12.' },
    { reaction: 'Krii !', text: 'Contrôle ce coefficient avec 6 et 18.' },
    { reaction: 'Krii !', text: 'Utilise-le sur la longueur 7.' },
  ],
  success: 'Exact. Le coefficient est 3 et la longueur manquante vaut 21.',
  correction: [
    'Les triangles sont semblables, donc les longueurs des côtés correspondants (côtés qui jouent le même rôle) sont proportionnelles.',
    'On passe de 4 à 12 en multipliant par 3.',
    'On vérifie aussi : 6 × 3 = 18.',
    'La longueur manquante vaut 7 × 3 = 21.',
  ],
  setFlags: { p3_app_b_done: true },
  completeScene: false,
};

const appC = {
  type: 'cloze',
  id: 'p3_app_c',
  title: 'Exercice C — Sont-ils semblables ?',
  progressiveHelp: true,
  prompt:
    'On compare deux triangles.\nTriangle 1 : 3, 4, 5.\nTriangle 2 : 6, 8, 12.\nCes deux triangles sont-ils semblables ?',
  illustrations: [
    '/assets/diagrams/part3/p3-exercice-c-non-semblables.png',
  ],
  fields: {
    conclusion: {
      kind: 'select',
      options: ['Oui', 'Non'],
      expected: 'Non',
      label: 'Semblables ?',
    },
  },
  lines: [
    {
      parts: [
        { type: 'text', text: 'Ces deux triangles sont-ils semblables ? ' },
        { type: 'field', id: 'conclusion' },
      ],
    },
  ],
  hints: [
    {
      reaction: 'Krii !',
      text: 'Compare les rapports des côtés qui se correspondent.',
    },
    {
      reaction: 'Krii !',
      text: 'Calcule 6 ÷ 3, 8 ÷ 4 et 12 ÷ 5.',
    },
    {
      reaction: 'Krii !',
      text: 'Si les trois rapports ne sont pas égaux, les triangles ne sont pas semblables.',
    },
  ],
  success: 'Non : les rapports ne sont pas tous égaux.',
  correction:
    "On compare les longueurs des côtés correspondants (côtés qui jouent le même rôle dans les deux triangles).\n6 / 3 = 2\n8 / 4 = 2\n12 / 5 = 2,4\nLes trois rapports ne sont pas égaux.\nDonc les longueurs ne sont pas proportionnelles.\nLes deux triangles ne sont pas semblables.",
  setFlags: { p3_app_c_done: true },
  completeScene: false,
};

const p3 = byId('p3_3_exercices_application');
p3.title = 'Les trois mini-moulins';
p3.prompt =
  "Choisis les mini-moulins dans l'ordre que tu veux. Chaque mini-moulin ouvre un exercice.";
p3.next = 'p3_4_finale_roue_a_aube';
p3.decor = {
  background: '/assets/backgrounds/part3/p3-table-exercices.png',
  objects: [],
};
p3.hotspots = [
  {
    id: 'mini_moulin_a',
    label: 'Mini-moulin A',
    x: 8,
    y: 23,
    w: 20,
    h: 24,
    required: true,
    inDecor: true,
    repeatable: true,
    advancesStory: true,
    sequence: [appA],
  },
  {
    id: 'mini_moulin_b',
    label: 'Mini-moulin B',
    x: 65,
    y: 21,
    w: 20,
    h: 24,
    required: true,
    inDecor: true,
    repeatable: true,
    advancesStory: true,
    sequence: [appB],
  },
  {
    id: 'mini_moulin_c',
    label: 'Mini-moulin C',
    x: 42,
    y: 41,
    w: 18,
    h: 27,
    required: true,
    inDecor: true,
    repeatable: true,
    advancesStory: true,
    sequence: [appC],
  },
];
p3.onAllRequired = {
  type: 'dialogue',
  lines: [
    {
      speaker: 'Alizée',
      text: 'Les trois modèles sont validés. On a vu des cas semblables… et un cas qui ne l’est pas.',
    },
    {
      speaker: 'Euclide',
      text: 'Il ne reste qu’à reconstruire la pièce de la roue.',
    },
  ],
  nextSceneId: 'p3_4_finale_roue_a_aube',
};

// —— finale non guidée ——
const p4 = byId('p3_4_finale_roue_a_aube');
p4.prompt =
  'Clique sur la pièce triangulaire pour réparer la roue à aube.';
p4.decor = {
  background: '/assets/backgrounds/part3/p3-roue-finale.png',
  objects: [],
};
p4.hotspots = [
  {
    id: 'piece_finale',
    label: 'Pièce triangulaire',
    x: 78,
    y: 74,
    w: 20,
    h: 18,
    required: true,
    inDecor: true,
    repeatable: true,
    advancesStory: true,
    sequence: [
      {
        type: 'cloze',
        id: 'p3_finale_roue',
        title: 'Défi final — La pièce de la roue',
        progressiveHelp: false,
        prompt:
          'La petite pièce triangulaire a pour longueurs 2, 3 et 4.\nLa grande pièce est semblable à la petite pièce.\nLe côté correspondant au côté de longueur 2 mesure 8.\n\nCalcule les deux longueurs manquantes de la grande pièce.',
        illustrations: [
          '/assets/diagrams/part3/p3-finale-petite-piece.png',
          '/assets/diagrams/part3/p3-finale-grande-piece-a-trouver.png',
        ],
        fields: {
          longueur_1: {
            kind: 'number',
            expected: 12,
            size: 'num',
            label: 'Longueur manquante 1',
          },
          longueur_2: {
            kind: 'number',
            expected: 16,
            size: 'num',
            label: 'Longueur manquante 2',
          },
        },
        unorderedNumericFields: ['longueur_1', 'longueur_2'],
        unorderedNumericExpected: [12, 16],
        lines: [
          {
            parts: [
              { type: 'text', text: 'Longueur manquante 1 : ' },
              { type: 'field', id: 'longueur_1' },
            ],
          },
          {
            parts: [
              { type: 'text', text: 'Longueur manquante 2 : ' },
              { type: 'field', id: 'longueur_2' },
            ],
          },
        ],
        hints: [],
        success: 'La pièce est à la bonne échelle.',
        correction:
          'On passe de 2 à 8 en multipliant par 4.\nLe coefficient d’agrandissement est donc 4.\nLes autres longueurs sont :\n3 × 4 = 12\n4 × 4 = 16\nLes deux longueurs manquantes sont 12 et 16.',
        setFlags: { p3_finale_done: true },
        completeScene: false,
      },
      {
        type: 'dialogue',
        id: 'p3_roue_reussite',
        lines: [
          { speaker: 'Nérée', text: 'La pièce s’emboîte parfaitement.' },
          { speaker: 'Alizée', text: 'La roue reprend son mouvement !' },
          {
            speaker: 'Euclide',
            text: 'Les triangles semblables nous ont donné la bonne échelle.',
          },
        ],
        nextSceneId: 'p3_5_fragment_moulin',
      },
    ],
  },
];

// Fix paths globally
const fixed = fixPaths(content);
fs.writeFileSync(scenesPath, `${JSON.stringify(fixed, null, 2)}\n`, 'utf8');

const s = JSON.stringify(fixed);
console.log('p3_1 objects', byId('p3_1_decouverte_gabarits').decor.objects?.length);
console.log(
  'moulins',
  byId('p3_3_exercices_application').hotspots.map((h) => h.id).join(','),
);
console.log('has app_c', s.includes('p3_app_c'));
console.log('no mini-moulin image in hotspots', !s.includes('"image": "/assets/objects/part3/mini-moulin'));
console.log('finale no hints progressive', !JSON.stringify(byId('p3_4_finale_roue_a_aube')).includes('"progressiveHelp": true'));
console.log('livret', s.includes('livret-euclide'));
console.log('diagrams', s.includes('p3-exercice-c-non-semblables') && s.includes('p3-finale-petite-piece'));
