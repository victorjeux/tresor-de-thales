import fs from 'fs';

const path = 'client/content/part1/scenes.json';
const content = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = (id) => content.scenes.find((s) => s.id === id);

// —— p1_0 objects + hotspots ——
const p0 = byId('p1_0_arrivee');
p0.decor.objects = [
  {
    image: '/assets/objects/part1/ile-dallage-recif.png',
    alt: 'Îlot rocheux avec plateforme de dallage dans la mer',
    x: 72,
    y: 58,
    w: 15,
    h: 16,
    z: 2,
    grounded: true,
    anchor: 'bottom',
  },
  {
    image: '/assets/objects/part1/neree-carte-recif.png',
    alt: 'Capitaine Nérée tenant la carte du récif, debout sur le pont',
    x: 24,
    y: 90,
    w: 28,
    h: 58,
    z: 4,
    grounded: true,
    anchor: 'bottom',
  },
];
const nereeHs = p0.hotspots.find((h) => h.id === 'neree_carte');
Object.assign(nereeHs, { x: 24, y: 68, w: 22, h: 42 });
const ilotHs = p0.hotspots.find((h) => h.id === 'ilot_dallage');
Object.assign(ilotHs, { x: 72, y: 52, w: 14, h: 12 });

// —— p1_4 balise rouge (grande à droite) ——
const p4 = byId('p1_4_hypotenuse');
const hyp = p4.hotspots.find((h) => h.id === 'ex_hyp');
Object.assign(hyp, {
  label: 'Balise rouge',
  x: 88,
  y: 46,
  w: 10,
  h: 34,
});

// —— p1_5 balise verte + ponton ——
const p5 = byId('p1_5_cote');
const cote = p5.hotspots.find((h) => h.required);
Object.assign(cote, {
  id: 'ex_cote',
  label: 'Balise verte',
  x: 68,
  y: 42,
  w: 9,
  h: 28,
});
const optIdx5 = p5.hotspots.findIndex((h) => h.optional);
p5.hotspots[optIdx5] = {
  id: 'opt_ponton_p5',
  label: 'Ponton branlant',
  x: 14,
  y: 52,
  w: 14,
  h: 28,
  optional: true,
  advancesStory: false,
  repeatable: true,
  inDecor: true,
  lines: [
    {
      speaker: 'Maki',
      text: 'Krii ! Nérée appelle ça un ponton. Moi, j’appelle ça une décision courageuse prise avec le bateau de quelqu’un d’autre.',
    },
  ],
};

// —— p1_6 four balises ——
const p6 = byId('p1_6_entrainement');
const oldSeq = p6.hotspots.find((h) => h.required).sequence;
const exA = oldSeq.find((s) => s.id === 'p1_train_1');
const exB = oldSeq.find((s) => s.id === 'p1_train_2');
const exC = oldSeq.find((s) => s.id === 'p1_train_3');
const exD = oldSeq.find((s) => s.id === 'p1_train_4');
exC.correction =
  "RST est un triangle rectangle en S.\nDonc, d'après le théorème de Pythagore :\nRT² = RS² + ST²\n17² = 8² + ST²\n289 = 64 + ST²\nST² = 289 − 64\nST² = 225\nDonc ST = √225 = 15.";
exC.correctionMath = 'ST = \\sqrt{225} = 15';

p6.hotspots = [
  {
    id: 'balise_a',
    label: 'Balise A (rouge, premier plan)',
    x: 88,
    y: 46,
    w: 10,
    h: 34,
    required: true,
    inDecor: true,
    repeatable: true,
    sequence: [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Alizée',
            text: 'Quatre balises. Les deux dernières ne disent pas quel côté calculer : c’est à toi de reconnaître l’hypoténuse.',
          },
        ],
      },
      exA,
    ],
  },
  {
    id: 'balise_b',
    label: 'Balise B (verte, rocher central)',
    x: 68,
    y: 42,
    w: 9,
    h: 28,
    required: true,
    inDecor: true,
    repeatable: true,
    sequence: [exB],
  },
  {
    id: 'balise_c',
    label: 'Balise C (verte, à gauche)',
    x: 38,
    y: 48,
    w: 8,
    h: 24,
    required: true,
    inDecor: true,
    repeatable: true,
    sequence: [exC],
  },
  {
    id: 'balise_d',
    label: 'Balise D (rouge, horizon)',
    x: 55,
    y: 36,
    w: 7,
    h: 18,
    required: true,
    inDecor: true,
    repeatable: true,
    sequence: [
      exD,
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Nérée',
            text: 'Assez de balises. Le vrai passage du récif nous attend.',
          },
        ],
        nextSceneId: 'p1_7_finale',
      },
    ],
  },
  {
    id: 'opt_balise_cartographes_p6',
    label: 'Ancienne balise des cartographes',
    x: 18,
    y: 34,
    w: 8,
    h: 18,
    optional: true,
    advancesStory: false,
    repeatable: true,
    inDecor: true,
    lines: [
      {
        speaker: 'Alizée',
        text: 'Ces balises ont été dressées par les premiers cartographes de Thalès. Chaque couleur signalait un courant différent ; les confondre était une erreur que les marins ne commettaient généralement qu’une fois.',
      },
    ],
  },
];

// —— p1_7 finale ——
const p7 = byId('p1_7_finale');
p7.prompt = 'Touchez le passage du récif pour les mesures de navigation.';
p7.decor.stages = {
  exterieur: {
    background: '/assets/backgrounds/part1/p1-passage-exterieur.png',
    objects: [],
  },
  interieur: {
    background: '/assets/backgrounds/part1/p1-passage-interieur.png',
    objects: [],
  },
  fragment: {
    background: '/assets/backgrounds/part1/p1-sanctuaire-fragment.png',
    objects: [
      {
        image: '/assets/objects/part1/fragment-carte-1.png',
        alt: 'Premier fragment de la carte de Thalès',
        x: 52,
        y: 58,
        w: 18,
        h: 18,
        z: 3,
        grounded: true,
        anchor: 'bottom',
      },
    ],
  },
  silas: {
    background: '/assets/backgrounds/part1/p1-trace-silas.png',
    objects: [
      {
        image: '/assets/objects/part1/indice-silas.png',
        alt: 'Trace inquiétante laissée par Silas',
        x: 30,
        y: 72,
        w: 20,
        h: 18,
        z: 2,
        grounded: true,
        anchor: 'bottom',
      },
    ],
  },
};

const routeA = {
  type: 'exercise',
  id: 'p1_final_route_a',
  title: 'Route intérieure — question a',
  progressiveHelp: true,
  illustrationPrimary: true,
  illustration: '/assets/exercises/part1/exercice-route-interieure.png',
  illustrationAlt:
    'Figure de la route intérieure : triangles ABD et BCD avec données et questions',
  accessibleData:
    'Données : AB = 1,5 cm ; AD = 6 cm ; BC = 12 cm.\nLe triangle ABD est rectangle en A.\nLe triangle BCD est rectangle en B.\nQuestion a : calcule la valeur de BD arrondie au millimètre, en centimètres au dixième, sans unité.',
  prompt:
    'Calcule la valeur de BD arrondie au millimètre. Donne la réponse en centimètres, au dixième, sans unité.',
  answerLabel: 'Votre réponse à la question a',
  expected: 6.2,
  tolerance: 0.05,
  hints: [
    {
      reaction: 'Krii !',
      text: 'Regarde le triangle ABD : il est rectangle en A. Quel côté est opposé à l’angle droit ?',
    },
    {
      reaction: 'Krii !',
      text: 'Dans ABD, écris d’abord BD² = AB² + AD².',
    },
    {
      reaction: 'Krii !',
      text: 'Tu obtiens BD² = 1,5² + 6² = 38,25. Prends ensuite la racine carrée et arrondis au millimètre.',
    },
  ],
  success: 'BD ≈ 6,2 cm. Passe à la question b.',
  correction:
    "ABD est un triangle rectangle en A.\nDonc, d'après le théorème de Pythagore :\nBD² = AB² + AD²\nBD² = 1,5² + 6²\nBD² = 2,25 + 36 = 38,25\nBD = √38,25 ≈ 6,184… cm\nArrondie au millimètre, la longueur BD est donc 6,2 cm, soit 62 mm.",
  completeScene: false,
};

const routeB = {
  type: 'exercise',
  id: 'p1_final_route_b',
  title: 'Route intérieure — question b',
  progressiveHelp: true,
  illustrationPrimary: true,
  setVisualStage: 'interieur',
  illustration: '/assets/exercises/part1/exercice-route-interieure.png',
  illustrationAlt:
    'Figure de la route intérieure : triangles ABD et BCD avec données et questions',
  accessibleData:
    'On a obtenu BD² = 38,25 à la question a.\nBC = 12 cm.\nBCD est rectangle en B.\nDonne la valeur exacte de DC sous la forme d’une racine carrée.',
  prompt: 'Donne la valeur exacte de DC sous la forme d’une racine carrée.',
  answerLabel: 'Votre réponse à la question b',
  answerType: 'radical',
  expectedRadicand: 182.25,
  expected: 182.25,
  tolerance: 0.001,
  hints: [
    {
      reaction: 'Krii !',
      text: 'Le triangle BCD est rectangle en B. Le côté DC est opposé à l’angle droit.',
    },
    {
      reaction: 'Krii !',
      text: 'D’après le théorème de Pythagore, écris DC² = BC² + BD². Réutilise BD² = 38,25, pas la valeur arrondie de BD.',
    },
    {
      reaction: 'Krii !',
      text: 'DC² = 12² + 38,25 = 182,25. Comme on cherche une longueur exacte, écris la racine carrée positive correspondante.',
    },
  ],
  success: 'DC = √182,25 cm. Route intérieure validée.',
  correction:
    'BCD est un triangle rectangle en B.\nDonc, d’après le théorème de Pythagore :\nDC² = BC² + BD²\nDC² = 12² + 38,25\nDC² = 144 + 38,25\nDC² = 182,25\nDonc DC = √182,25 cm.\nAinsi, la valeur exacte de DC est √182,25 cm.',
  correctionMath: 'DC = \\sqrt{182{,}25}\\,\\text{cm}',
  completeScene: false,
};

const monte = {
  type: 'exercise',
  id: 'p1_final_monte_charge',
  title: 'Route extérieure — monte-charge',
  progressiveHelp: true,
  illustrationPrimary: true,
  hideTitle: true,
  setVisualStage: 'fragment',
  illustration: '/assets/exercises/part1/exercice-monte-charge.png',
  illustrationAlt:
    'Mécanisme en losange de 21 cm de côté, diagonale horizontale 32 cm, hauteur du coffre à calculer',
  accessibleData:
    'Le mécanisme forme un losange de 21 cm de côté. Sa diagonale horizontale mesure 32 cm. À quelle hauteur soulève-t-il le coffre ? Donne la réponse en centimètres, arrondie au millimètre, sans unité.',
  prompt:
    'Le mécanisme forme un losange de 21 cm de côté. Sa diagonale horizontale mesure 32 cm. À quelle hauteur soulève-t-il le coffre ? Donne la réponse en centimètres, arrondie au millimètre, sans unité.',
  answerLabel: 'Votre réponse',
  expected: 27.2,
  tolerance: 0.05,
  hints: [
    {
      reaction: 'Krii !',
      text: 'Les diagonales d’un losange sont perpendiculaires et se coupent en leur milieu.',
    },
    {
      reaction: 'Krii !',
      text: 'La demi-diagonale horizontale mesure 16 cm. Dans le triangle rectangle formé, le côté du losange, 21 cm, est l’hypoténuse.',
    },
    {
      reaction: 'Krii !',
      text: 'Si x est la demi-hauteur, alors x² = 21² − 16² = 185. Calcule x, puis n’oublie pas de doubler pour obtenir la hauteur entière.',
    },
  ],
  success: 'Hauteur ≈ 27,2 cm. Trajectoire sûre calculée.',
  correction:
    'Les diagonales d’un losange sont perpendiculaires et se coupent en leur milieu. La demi-diagonale horizontale mesure donc 32 ÷ 2 = 16 cm.\nNotons x la demi-hauteur du mécanisme. Le triangle obtenu est rectangle et son hypoténuse mesure 21 cm.\nDonc, d’après le théorème de Pythagore :\n21² = 16² + x²\nx² = 21² − 16²\nx² = 441 − 256 = 185\nx = √185 cm\nLa hauteur totale vaut 2x = 2√185 ≈ 27,202… cm.\nArrondi au millimètre, le mécanisme soulève donc le coffre à 27,2 cm, soit 272 mm.',
  correctionFigure: 'rhombusLift',
  correctionFigureLabels: {
    sideLabel: '21',
    halfDiagLabel: '16',
    heightLabel: '2x',
  },
  completeScene: false,
};

p7.hotspots = [
  {
    id: 'passage',
    label: 'Passage du récif',
    x: 50,
    y: 52,
    w: 28,
    h: 24,
    required: true,
    inDecor: true,
    stages: ['exterieur'],
    repeatable: true,
    advancesStory: true,
    sequence: [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Nérée',
            text: 'Deux mesures, {{playerName}}. Sans elles, la coque racle le basalt.',
          },
          {
            speaker: 'Alizée',
            text: 'La carte ne dit pas quelle opération faire. Observe les figures et choisis.',
          },
        ],
      },
      routeA,
      routeB,
    ],
  },
  {
    id: 'monte_zone',
    label: 'Monte-charge du passage intérieur',
    x: 48,
    y: 55,
    w: 30,
    h: 28,
    required: true,
    inDecor: true,
    stages: ['interieur'],
    repeatable: true,
    advancesStory: true,
    sequence: [monte],
  },
  {
    id: 'fragment_1',
    label: 'Premier fragment de la carte',
    x: 52,
    y: 55,
    w: 16,
    h: 16,
    required: true,
    inDecor: true,
    stages: ['fragment'],
    repeatable: true,
    advancesStory: true,
    sequence: [
      {
        type: 'fragmentZoom',
        image: '/assets/objects/part1/fragment-carte-1.png',
        alt: 'Zoom du premier fragment de la carte de Thalès',
      },
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Alizée',
            text: 'Regarde, {{playerName}} : les lignes s’emboîtent parfaitement. C’est bien le premier fragment de la carte de Thalès.',
          },
        ],
      },
      {
        type: 'fragmentBoard',
        placeFragment: 1,
        total: 7,
      },
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Alizée',
            text: 'Je le place ici. Il nous manque encore six fragments avant de pouvoir lire la route complète.',
          },
        ],
        setVisualStage: 'silas',
      },
    ],
  },
  {
    id: 'opt_empreintes_p7',
    label: 'Empreintes sur le rocher',
    x: 28,
    y: 70,
    w: 14,
    h: 12,
    optional: true,
    advancesStory: false,
    repeatable: true,
    inDecor: true,
    stages: ['silas'],
    lines: [
      {
        speaker: 'Alizée',
        text: 'Des empreintes trop soignées pour un matelot ordinaire… Silas aime laisser sa signature.',
      },
    ],
  },
  {
    id: 'silas_conclude',
    label: 'Traces de Silas',
    x: 55,
    y: 50,
    w: 24,
    h: 22,
    required: true,
    inDecor: true,
    stages: ['silas'],
    repeatable: true,
    advancesStory: true,
    sequence: [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Nérée',
            text: 'Trajectoire sûre calculée. Gouvernail… nous franchissons le récif.',
          },
          {
            speaker: 'Alizée',
            text: 'Au pied du phare : le premier fragment de la carte de Thalès !',
          },
          {
            speaker: 'Maki',
            text: 'Krii ! (Maki tend le fragment… un coin un peu mâchouillé.)',
          },
          {
            speaker: 'Alizée',
            text: 'Ces traces dans la roche… fraîches. Quelqu’un est passé juste avant nous.',
          },
          {
            speaker: 'Nérée',
            text: 'Silas. Il ne laisse jamais un fragment sans ombre. Restez vigilants.',
          },
          {
            speaker: 'Euclide',
            text: 'Tu maîtrises le théorème direct. La suite exigera sa réciproque.',
          },
        ],
        endPart: true,
        message:
          'Premier fragment récupéré. La Sécante des Vents poursuit sa route au-delà du récif.',
        announce:
          'À suivre : Partie 2 — Réciproque du théorème de Pythagore.',
      },
    ],
  },
];

fs.writeFileSync(path, JSON.stringify(content, null, 2) + '\n');
console.log('OK patched');
console.log(
  'C line',
  exC.correction.includes('ST² = 289 − 64'),
  'radical',
  routeB.answerType,
  'stages',
  p7.hotspots.map((h) => h.id),
);
