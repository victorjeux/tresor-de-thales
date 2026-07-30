import fs from 'fs';

const path = 'client/content/part1/scenes.json';
const content = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = (id) => content.scenes.find((s) => s.id === id);

// —— 1. Nérée plus bas, pieds sur le plancher ——
const p0 = byId('p1_0_arrivee');
const neree = p0.decor.objects.find((o) => o.image.includes('neree'));
Object.assign(neree, {
  x: 22,
  y: 97,
  w: 26,
  h: 52,
  z: 4,
  grounded: true,
  anchor: 'bottom',
});
const nereeHs = p0.hotspots.find((h) => h.id === 'neree_carte');
// Hotspot centre du corps (ancrage bas y=97, h≈52 → centre ~71)
Object.assign(nereeHs, { x: 22, y: 72, w: 20, h: 40 });

// —— 2. Boussole gauche de la table ——
const p2 = byId('p1_2_cours');
const boussole = p2.hotspots.find((h) => h.id === 'opt_boussole_p2');
Object.assign(boussole, {
  id: 'opt_boussole_p2',
  label: 'Boussole de Nérée',
  x: 20,
  y: 62,
  w: 11,
  h: 14,
  optional: true,
  advancesStory: false,
  repeatable: true,
  inDecor: true,
  lines: [
    {
      speaker: 'Alizée',
      text: 'C’est la boussole préférée du capitaine Nérée. Il l’a rapportée de son voyage à Madagascar ; depuis, il prétend qu’elle indique aussi les ennuis.',
    },
  ],
});

// —— 3. Balise verte p1_5 recentrée ——
const p5 = byId('p1_5_cote');
const cote = p5.hotspots.find((h) => h.required);
Object.assign(cote, {
  label: 'Balise verte',
  x: 66,
  y: 38,
  w: 9,
  h: 30,
});

// —— 4+5. Entraînement : positions + file A→B→C→D ——
const p6 = byId('p1_6_entrainement');
const oldHotspots = p6.hotspots;
const findEx = (id) => {
  for (const h of oldHotspots) {
    for (const s of h.sequence || []) {
      if (s.id === id) return s;
    }
  }
  return null;
};
const ex1 = findEx('p1_train_1');
const ex2 = findEx('p1_train_2');
const ex3 = findEx('p1_train_3');
const ex4 = findEx('p1_train_4');

// Nettoyer titres (le préfixe Exercice k/4 est ajouté par le moteur)
const strip = (ex) => {
  const { type, ...rest } = ex;
  return rest;
};

p6.exerciseQueue = {
  ids: ['p1_train_1', 'p1_train_2', 'p1_train_3', 'p1_train_4'],
  intro: [
    {
      speaker: 'Alizée',
      text: 'Quatre balises. Les deux dernières ne disent pas quel côté calculer : c’est à toi de reconnaître l’hypoténuse.',
    },
  ],
  outro: [
    {
      speaker: 'Nérée',
      text: 'Assez de balises. Le vrai passage du récif nous attend.',
    },
  ],
  exercises: {
    p1_train_1: strip(ex1),
    p1_train_2: strip(ex2),
    p1_train_3: strip(ex3),
    p1_train_4: strip(ex4),
  },
};

// Positions observées sur le décor (centres des balises)
// A : grande rouge 1er plan droite — sommet ~20%, base ~56%, x~90%
// B : grande verte rocher central — x~67%, y~38%
// C : verte gauche eau — x~37%, y~44%
// D : petite rouge horizon centre — x~54%, y~32%
// Opt cartographes : rouge lointaine gauche — x~16%, y~30%
p6.hotspots = [
  {
    id: 'balise_a',
    label: 'Balise A (rouge, premier plan)',
    x: 90,
    y: 38,
    w: 9,
    h: 34,
    queueMember: true,
    inDecor: true,
    repeatable: true,
    advancesStory: false,
  },
  {
    id: 'balise_b',
    label: 'Balise B (verte, rocher central)',
    x: 67,
    y: 38,
    w: 8,
    h: 28,
    queueMember: true,
    inDecor: true,
    repeatable: true,
    advancesStory: false,
  },
  {
    id: 'balise_c',
    label: 'Balise C (verte, à gauche)',
    x: 37,
    y: 44,
    w: 7,
    h: 22,
    queueMember: true,
    inDecor: true,
    repeatable: true,
    advancesStory: false,
  },
  {
    id: 'balise_d',
    label: 'Balise D (rouge, horizon)',
    x: 54,
    y: 32,
    w: 6,
    h: 16,
    queueMember: true,
    inDecor: true,
    repeatable: true,
    advancesStory: false,
  },
  {
    id: 'opt_balise_cartographes_p6',
    label: 'Ancienne balise des cartographes',
    x: 16,
    y: 30,
    w: 7,
    h: 16,
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
p6.requireInteraction = true;
p6.prompt =
  'Touchez n’importe quelle balise pour l’exercice suivant de l’entraînement (A → B → C → D).';

// —— 7. Dialogue Silas sans redécouverte ——
const p7 = byId('p1_7_finale');
const silas = p7.hotspots.find((h) => h.id === 'silas_conclude');
const dlg = silas.sequence.find((s) => s.type === 'dialogue');
dlg.lines = [
  {
    speaker: 'Nérée',
    text: 'Trajectoire sûre calculée. Gouvernail… nous franchissons le récif.',
  },
  {
    speaker: 'Alizée',
    text: 'Le premier fragment est en sécurité. Mais ces traces sont fraîches… Silas est passé par ici.',
  },
  {
    speaker: 'Maki',
    text: 'Krii ! (Maki renifle les empreintes et recule d’un bond.)',
  },
  {
    speaker: 'Nérée',
    text: 'Silas. Il ne laisse jamais un fragment sans ombre. Restez vigilants.',
  },
  {
    speaker: 'Euclide',
    text: 'Tu maîtrises le théorème direct. La suite exigera sa réciproque.',
  },
];
// endPart reste ; le bouton Continuer vers part2 est géré par le moteur
dlg.endPart = true;
dlg.message =
  'Premier fragment récupéré. La Sécante des Vents poursuit sa route au-delà du récif.';
dlg.announce =
  'À suivre : Partie 2 — La réciproque du théorème de Pythagore.';

fs.writeFileSync(path, JSON.stringify(content, null, 2) + '\n');
console.log('OK');
console.log('neree', neree.y, neree.anchor);
console.log('boussole', boussole.x, boussole.label);
console.log('queue', p6.exerciseQueue.ids);
console.log('silas', dlg.lines[1].text.slice(0, 50));
