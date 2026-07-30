/**
 * Applique les corrections visuelles/pédagogiques demandées sur part1/scenes.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, '..', 'client', 'content', 'part1', 'scenes.json');
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
const FALLBACK = '/assets/backgrounds/part1/recif-angles-droits.png';
const maki = (text) => ({ reaction: 'Krii !', text });
const pyth = (open, body) =>
  `${open}\nDonc, d'après le théorème de Pythagore :\n${body}`;

const byId = (id) => data.scenes.find((s) => s.id === id);
const walk = (node, fn) => {
  if (!node || typeof node !== 'object') return;
  fn(node);
  if (Array.isArray(node)) node.forEach((n) => walk(n, fn));
  else Object.values(node).forEach((n) => walk(n, fn));
};
const APPROX =
  "Donne une valeur approchée au dixième à l'aide de la calculatrice. Saisis uniquement le nombre, sans unité.";

// ---------- p1_0 ----------
{
  const s = byId('p1_0_arrivee');
  s.prompt =
    'Explorez la carte tenue par Nérée et l’îlot du dallage avant de poursuivre.';
  s.decor = {
    background: '/assets/backgrounds/part1/p1-entree-recif.png',
    backgroundFallback: FALLBACK,
    objects: [
      {
        image: '/assets/objects/part1/ile-dallage-recif.png',
        alt: 'Îlot rocheux avec plateforme de dallage dans la mer',
        x: 74,
        y: 80,
        w: 32,
        h: 30,
        z: 2,
        grounded: true,
      },
      {
        image: '/assets/objects/part1/neree-carte-recif.png',
        alt: 'Capitaine Nérée tenant la carte du récif',
        x: 18,
        y: 66,
        w: 26,
        h: 40,
        z: 3,
        grounded: true,
      },
    ],
  };
  s.hotspots = [
    {
      id: 'neree_carte',
      label: 'Nérée et sa carte',
      x: 18,
      y: 62,
      w: 24,
      h: 36,
      required: true,
      inDecor: true,
      repeatable: true,
      advancesStory: true,
      lines: [
        {
          speaker: 'Nérée',
          text: 'La Sécante des Vents est bloquée. Ce labyrinthe de rochers ne pardonne aucune approximation.',
        },
        {
          speaker: 'Alizée',
          text: 'Sur la carte, le passage forme un triangle rectangle. Deux côtés longent les falaises… le troisième traverse l’eau libre.',
        },
        {
          speaker: 'Nérée',
          text: 'Justement : ce troisième côté, l’hypoténuse du passage, ne peut pas être mesuré à la chaîne sans risquer la coque.',
        },
        {
          speaker: 'Alizée',
          text: '{{playerName}}, regarde aussi ce dallage sur l’îlot. Il raconte quelque chose.',
        },
      ],
    },
    {
      id: 'ilot_dallage',
      label: 'Îlot du dallage',
      x: 74,
      y: 76,
      w: 26,
      h: 22,
      required: true,
      inDecor: true,
      repeatable: true,
      advancesStory: true,
      lines: [
        {
          speaker: 'Alizée',
          text: 'Un ancien dallage : un triangle, et un carré construit sur chacun de ses côtés. Les cartographes de Thalès laissaient des indices en pierre.',
        },
        {
          speaker: 'Maki',
          text: 'Krii ! (Maki renifle la plateforme. Elle sent le calcaire… et les calculs.)',
        },
      ],
    },
    {
      id: 'opt_epave_p0',
      label: 'Épave à bâbord',
      x: 8,
      y: 82,
      w: 12,
      h: 12,
      optional: true,
      advancesStory: false,
      repeatable: true,
      inDecor: true,
      lines: [
        {
          speaker: 'Maki',
          text: 'Krii… Cette épave a l’air d’avoir oublié d’apprendre Pythagore.',
        },
      ],
    },
  ];
}

// ---------- p1_1 remove dalle object, fix areas ----------
{
  const s = byId('p1_1_decouverte');
  s.prompt = 'Touchez le dallage peint au centre du décor.';
  s.decor = {
    background: '/assets/backgrounds/part1/p1-dallage-pythagore.png',
    backgroundFallback: FALLBACK,
  };
  const hs = s.hotspots.find((h) => h.id === 'start_decouverte' || h.required);
  if (hs) {
    hs.id = 'start_decouverte';
    hs.label = 'Dallage central';
    hs.x = 50;
    hs.y = 58;
    hs.w = 26;
    hs.h = 24;
    hs.inDecor = true;
    hs.repeatable = true;
    hs.advancesStory = true;
    delete hs.image;
  }
  s.decor.objects = undefined;
  delete s.decor.objects;
  walk(s, (n) => {
    if (n && n.figureLabels && typeof n.figureLabels === 'object') {
      const fl = n.figureLabels;
      if (Number(fl.a) === 3 || fl.labelA === '3') {
        fl.areaA = '9';
        fl.areaB = '16';
        fl.areaC = '?';
        fl.labelC = '?';
        fl.hideHypArea = true;
      }
      if (Number(fl.a) === 5 || fl.labelA === '5') {
        fl.areaA = '25';
        fl.areaB = '144';
        fl.areaC = '?';
        fl.labelC = '?';
        fl.hideHypArea = true;
      }
    }
    if (typeof n.math === 'string' && n.math.includes('169')) {
      n.math = '25 + 144 = \\, ?^{2}';
    }
  });
  if (!s.hotspots.some((h) => h.id === 'opt_nuage_p1')) {
    s.hotspots.push({
      id: 'opt_nuage_p1',
      label: 'Nuage au loin',
      x: 82,
      y: 16,
      w: 12,
      h: 10,
      optional: true,
      advancesStory: false,
      repeatable: true,
      inDecor: true,
      lines: [
        {
          speaker: 'Alizée',
          text: 'Ce nuage ressemble à un triangle… rectangle ou non, Maki le mangerait bien.',
        },
      ],
    });
  }
}

// ---------- notebook ----------
{
  const s = byId('p1_2_cours');
  s.decor.background = '/assets/backgrounds/part1/p1-table-carnet.png';
  s.decor.backgroundFallback = FALLBACK;
  s.decor.objects = [
    {
      image: '/assets/objects/part1/carnet-euclide-ouvert.png',
      alt: 'Carnet d’Euclide ouvert',
      x: 50,
      y: 56,
      w: 34,
      h: 32,
      z: 2,
    },
  ];
  const nb = s.hotspots[0].sequence.find((x) => x.type === 'notebook');
  nb.pages = [
    {
      title: 'I — Théorème de Pythagore',
      blocks: [
        {
          type: 'text',
          text: 'I — Théorème de Pythagore',
        },
        {
          type: 'text',
          text: 'Recopie le titre et la figure dans ton cahier.',
        },
      ],
      figure: 'rightTriangleABC',
      figureLabels: {
        ab: 'AB',
        ac: 'AC',
        bc: 'BC',
        rightAngle: 'A',
      },
    },
    {
      title: 'Formulation avec lettres',
      blocks: [
        {
          type: 'text',
          text: 'Soit ABC un triangle rectangle en A. Alors, d’après le théorème de Pythagore :',
        },
        { type: 'math', tex: 'BC^{2} = AB^{2} + AC^{2}' },
      ],
      figure: 'rightTriangleABC',
      figureLabels: { ab: 'AB', ac: 'AC', bc: 'BC', rightAngle: 'A' },
    },
    {
      title: 'Formulation en français',
      blocks: [
        {
          type: 'text',
          text: 'Si un triangle est rectangle, alors, d’après le théorème de Pythagore, le carré de la longueur de l’hypoténuse est égal à la somme des carrés des longueurs des deux autres côtés.',
        },
        {
          type: 'text',
          text: 'Remarque : l’hypoténuse est le côté opposé à l’angle droit. C’est aussi le plus grand côté du triangle rectangle.',
        },
      ],
    },
  ];
}

// ---------- p1_3 ----------
{
  const s = byId('p1_3_verification');
  s.decor.background = '/assets/backgrounds/part1/p1-table-carnet.png';
  s.decor.backgroundFallback = FALLBACK;
  s.decor.objects = [
    {
      image: '/assets/objects/part1/carnet-euclide-ouvert.png',
      alt: 'Carnet d’Euclide pour la vérification',
      x: 50,
      y: 54,
      w: 30,
      h: 28,
      z: 2,
    },
  ];
  if (!s.hotspots.some((h) => h.optional)) {
    s.hotspots.push({
      id: 'opt_encrier_p3',
      label: 'Encrier sur la table',
      x: 78,
      y: 70,
      w: 10,
      h: 10,
      optional: true,
      advancesStory: false,
      repeatable: true,
      inDecor: true,
      lines: [
        {
          speaker: 'Euclide',
          text: 'Cet encrier a déjà corrigé plus de copies que de matelots ont vu d’albatros.',
        },
      ],
    });
  }
}

// ---------- balises: remove objects, hotspots on painted ----------
for (const id of ['p1_4_hypotenuse', 'p1_5_cote', 'p1_6_entrainement']) {
  const s = byId(id);
  s.decor.background = '/assets/backgrounds/part1/p1-balises-entrainement.png';
  s.decor.backgroundFallback = FALLBACK;
  s.decor.objects = [];
  // main hotspot
  const main = s.hotspots.find((h) => h.required) || s.hotspots[0];
  if (id === 'p1_4_hypotenuse') {
    main.x = 32;
    main.y = 55;
    main.w = 12;
    main.h = 28;
    main.label = 'Balise rouge';
    main.inDecor = true;
    main.repeatable = true;
  }
  if (id === 'p1_5_cote') {
    main.x = 68;
    main.y = 55;
    main.w = 12;
    main.h = 28;
    main.label = 'Balise verte';
    main.inDecor = true;
    main.repeatable = true;
  }
  if (id === 'p1_6_entrainement') {
    main.x = 50;
    main.y = 55;
    main.w = 40;
    main.h = 30;
    main.label = 'Balises d’entraînement';
    main.inDecor = true;
    main.repeatable = true;
  }
  delete main.image;
}

// optional for balise scenes
if (!byId('p1_4_hypotenuse').hotspots.some((h) => h.optional)) {
  byId('p1_4_hypotenuse').hotspots.push({
    id: 'opt_corde_p4',
    label: 'Corde enroulée',
    x: 85,
    y: 78,
    w: 10,
    h: 10,
    optional: true,
    advancesStory: false,
    repeatable: true,
    inDecor: true,
    lines: [
      {
        speaker: 'Nérée',
        text: 'Cette corde mesure exactement… assez pour se tromper d’un nœud.',
      },
    ],
  });
}
if (!byId('p1_5_cote').hotspots.some((h) => h.optional)) {
  byId('p1_5_cote').hotspots.push({
    id: 'opt_bouee_p5',
    label: 'Bouée de balisage',
    x: 12,
    y: 70,
    w: 10,
    h: 12,
    optional: true,
    advancesStory: false,
    repeatable: true,
    inDecor: true,
    lines: [
      {
        speaker: 'Maki',
        text: 'Krii ! Une bouée qui flotte, ce n’est pas une hypoténuse… dommage.',
      },
    ],
  });
}
if (!byId('p1_6_entrainement').hotspots.some((h) => h.optional)) {
  byId('p1_6_entrainement').hotspots.push({
    id: 'opt_goeland_p6',
    label: 'Goéland sur le mât',
    x: 50,
    y: 18,
    w: 10,
    h: 10,
    optional: true,
    advancesStory: false,
    repeatable: true,
    inDecor: true,
    lines: [
      {
        speaker: 'Alizée',
        text: 'Ce goéland croit diriger le trafic… sans carte et sans théorème.',
      },
    ],
  });
}

// ---------- approx prompts ----------
walk(data, (n) => {
  if (n.id === 'p1_hyp_etape4') {
    n.prompt = `On a BC² = 58. ${APPROX}`;
    delete n.unitHint;
  }
  if (n.id === 'p1_cote_etape5') {
    n.prompt = `On a AC² = 80. ${APPROX}`;
  }
  if (typeof n.prompt === 'string' && n.prompt.includes('Exemple :')) {
    n.prompt = n.prompt.replace(/\s*Exemple\s*:\s*[\d,.]+\.?/gi, '').trim();
  }
  if (typeof n.correction === 'string' && n.correction.includes('addition à trou')) {
    // ensure final sentence
    if (!n.correction.includes('Donc AC mesure')) {
      n.correction +=
        '\nDonc AC mesure √80 cm, soit environ 8,9 cm.';
    }
  }
});

// ---------- training A/B figures + C/D no figure + corrections ----------
{
  const s = byId('p1_6_entrainement');
  const seq = s.hotspots.find((h) => h.required).sequence;
  for (const step of seq) {
    if (step.id === 'p1_train_1') {
      step.figure = 'namedRightTriangle';
      step.figureLabels = {
        right: 'D',
        up: 'E',
        end: 'F',
        sideRightUp: '9',
        sideRightEnd: '12',
        sideUpEnd: '?',
      };
      step.prompt =
        'DEF est rectangle en D. DE = 9 et DF = 12. Calcule la longueur de l’hypoténuse EF. (Nombre seul, sans unité.)';
      step.correction = pyth(
        'DEF est un triangle rectangle en D.',
        'EF² = DE² + DF²\nEF² = 9² + 12²\nEF² = 81 + 144 = 225\nDonc EF = √225 = 15.',
      );
      step.hints = [
        maki('L’angle droit est en D : l’hypoténuse est le côté opposé, EF.'),
        maki('Écris : EF² = DE² + DF².'),
        maki('Remplace : EF² = 9² + 12². Calcule, puis la racine — sans mon résultat final !'),
      ];
    }
    if (step.id === 'p1_train_2') {
      step.figure = 'namedRightTriangle';
      step.figureLabels = {
        right: 'N',
        up: 'M',
        end: 'P',
        sideRightUp: '5',
        sideRightEnd: '8',
        sideUpEnd: '?',
      };
      step.prompt =
        'MNP est rectangle en N. MN = 5 et NP = 8. Calcule la longueur de l’hypoténuse MP. Arrondis au dixième si besoin. (Nombre seul.)';
      step.correction = pyth(
        'MNP est un triangle rectangle en N.',
        'MP² = MN² + NP²\nMP² = 5² + 8² = 25 + 64 = 89\nDonc MP = √89 ≈ 9,4.',
      );
      step.hints = [
        maki('Rectangle en N : l’hypoténuse est le côté qui ne touche pas N, donc MP.'),
        maki('Écris : MP² = MN² + NP².'),
        maki('MP² = 25 + 64 = 89. Ensuite MP = √89 ≈ … (au dixième). Je m’arrête avant le nombre final !'),
      ];
    }
    if (step.id === 'p1_train_3') {
      // C: no search figure
      delete step.figure;
      delete step.figureLabels;
      step.correctionFigure = 'namedRightTriangle';
      step.correctionFigureLabels = {
        right: 'S',
        up: 'R',
        end: 'T',
        sideRightUp: '8',
        sideRightEnd: '?',
        sideUpEnd: '17',
      };
      step.prompt =
        'RST est rectangle en S. RS = 8 et RT = 17. Calcule la longueur de ST. (Nombre seul, sans unité.)';
      step.correction = pyth(
        'RST est un triangle rectangle en S.',
        'RT² = RS² + ST²\n17² = 8² + ST²\n289 = 64 + ST²\nST² = 225\nDonc ST = 15.',
      );
      step.hints = [
        maki('Trouve d’abord l’angle droit en S : l’hypoténuse est le côté opposé RT.'),
        maki('Écris : RT² = RS² + ST².'),
        maki('Pour ST², soustrais : ST² = 17² − 8². Calcule, puis la racine. Pas le résultat final de ma part !'),
      ];
    }
    if (step.id === 'p1_train_4') {
      delete step.figure;
      delete step.figureLabels;
      step.correctionFigure = 'namedRightTriangle';
      step.correctionFigureLabels = {
        right: 'W',
        up: 'U',
        end: 'V',
        sideRightUp: '?',
        sideRightEnd: '6',
        sideUpEnd: '10',
      };
      // UV=10 hyp, UW=6, VW=?
      step.correctionFigureLabels = {
        right: 'W',
        up: 'U',
        end: 'V',
        sideRightUp: '6',
        sideRightEnd: '?',
        sideUpEnd: '10',
      };
      step.prompt =
        'UVW est rectangle en W. UV = 10 et UW = 6. Calcule la longueur de VW. Arrondis au dixième. (Nombre seul.)';
      step.correction = pyth(
        'UVW est un triangle rectangle en W.',
        'UV² = UW² + VW²\n10² = 6² + VW²\n100 = 36 + VW²\nVW² = 64\nDonc VW = 8.',
      );
      step.hints = [
        maki('Rectangle en W : l’hypoténuse est UV, le côté qui ne touche pas W.'),
        maki('Écris : UV² = UW² + VW².'),
        maki('VW² = 10² − 6². Calcule la différence, puis la racine. Je ne dis pas le nombre final !'),
      ];
    }
  }
}

// ---------- FINALE rewrite ----------
{
  const s = byId('p1_7_finale');
  s.prompt = 'Touchez le passage pour la tâche finale.';
  s.decor = {
    background: '/assets/backgrounds/part1/p1-passage-exterieur.png',
    backgroundFallback: FALLBACK,
    initialStage: 'exterieur',
    stages: {
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
            x: 70,
            y: 68,
            w: 16,
            h: 16,
            z: 2,
          },
        ],
      },
      silas: {
        background: '/assets/backgrounds/part1/p1-trace-silas.png',
        objects: [
          {
            image: '/assets/objects/part1/fragment-carte-1.png',
            alt: 'Premier fragment de la carte de Thalès',
            x: 72,
            y: 72,
            w: 12,
            h: 12,
            z: 2,
          },
          {
            image: '/assets/objects/part1/indice-silas.png',
            alt: 'Trace inquiétante laissée par Silas',
            x: 30,
            y: 65,
            w: 20,
            h: 18,
            z: 2,
          },
        ],
      },
    },
  };
  const main = s.hotspots.find((h) => h.required) || s.hotspots[0];
  main.x = 50;
  main.y = 50;
  main.w = 26;
  main.h = 22;
  main.inDecor = true;
  main.repeatable = true;
  main.advancesStory = true;
  main.sequence = [
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
    {
      type: 'exercise',
      id: 'p1_final_route_a',
      title: 'Route intérieure — question a',
      progressiveHelp: true,
      setVisualStage: 'interieur',
      illustration: '/assets/exercises/part1/exercice-route-interieure.png',
      illustrationAlt: 'Figure de la route intérieure : triangles ABD et BCD',
      accessibleData:
        'Données : AB = 1,5 cm ; AD = 6 cm ; BC = 12 cm.\nLe triangle ABD est rectangle en A.\nLe triangle BCD est rectangle en B.',
      prompt:
        'Calcule la valeur de BD arrondie au millimètre. Donne la réponse en centimètres, au dixième, sans unité.',
      expected: 6.2,
      tolerance: 0.05,
      hints: [
        maki(
          'Regarde le triangle ABD : il est rectangle en A. Quel côté est opposé à l’angle droit ?',
        ),
        maki('Dans ABD, écris d’abord BD² = AB² + AD².'),
        maki(
          'Tu obtiens BD² = 1,5² + 6² = 38,25. Prends ensuite la racine carrée et arrondis au millimètre.',
        ),
      ],
      success: 'BD ≈ 6,2 cm. Passe à la question b.',
      correction: pyth(
        'ABD est un triangle rectangle en A.',
        'BD² = AB² + AD²\nBD² = 1,5² + 6²\nBD² = 2,25 + 36 = 38,25\nBD = √38,25 ≈ 6,184… cm\nArrondie au millimètre, la longueur BD est donc 6,2 cm, soit 62 mm.',
      ),
      completeScene: false,
    },
    {
      type: 'exercise',
      id: 'p1_final_route_b',
      title: 'Route intérieure — question b',
      progressiveHelp: true,
      illustration: '/assets/exercises/part1/exercice-route-interieure.png',
      illustrationAlt: 'Figure de la route intérieure : triangles ABD et BCD',
      accessibleData:
        'On a obtenu BD² = 38,25 à la question a.\nBC = 12 cm.\nBCD est rectangle en B. On cherche DC.',
      prompt:
        'Calcule, en justifiant, la valeur exacte de DC. Donne la réponse en centimètres, sans unité.',
      expected: 13.5,
      tolerance: 0.01,
      hints: [
        maki(
          'Le triangle BCD est rectangle en B. Cette fois, DC est le côté opposé à l’angle droit.',
        ),
        maki(
          'Écris DC² = BC² + BD². Tu peux réutiliser la valeur exacte de BD² trouvée à la question a.',
        ),
        maki(
          'Utilise BD² = 38,25 = 153/4 : DC² = 144 + 153/4 = 729/4. Il reste à prendre la racine carrée positive.',
        ),
      ],
      success: 'DC = 13,5 cm. Route intérieure validée.',
      correction: pyth(
        'BCD est un triangle rectangle en B.',
        'DC² = BC² + BD²\nDC² = 12² + 38,25\nDC² = 144 + 38,25 = 182,25 = 729/4\nDC = √(729/4) = 27/2 = 13,5 cm.\nAinsi, la valeur exacte de DC est 13,5 cm.',
      ),
      completeScene: false,
    },
    {
      type: 'exercise',
      id: 'p1_final_monte_charge',
      title: 'Route extérieure — monte-charge',
      progressiveHelp: true,
      setVisualStage: 'fragment',
      illustration: '/assets/exercises/part1/exercice-monte-charge.png',
      illustrationAlt: 'Mécanisme en losange soulevant un coffre',
      accessibleData:
        'Le mécanisme forme un losange de 21 cm de côté.\nSa diagonale horizontale mesure 32 cm.\nOn cherche la hauteur totale (diagonale verticale).',
      prompt:
        'Le mécanisme forme un losange de 21 cm de côté. Sa diagonale horizontale mesure 32 cm. À quelle hauteur soulève-t-il le coffre ? Donne la réponse en centimètres, arrondie au millimètre, sans unité.',
      expected: 27.2,
      tolerance: 0.05,
      hints: [
        maki(
          'Les diagonales d’un losange sont perpendiculaires et se coupent en leur milieu.',
        ),
        maki(
          'La demi-diagonale horizontale mesure 16 cm. Dans le triangle rectangle formé, le côté du losange, 21 cm, est l’hypoténuse.',
        ),
        maki(
          'Si x est la demi-hauteur, alors x² = 21² − 16² = 185. Calcule x, puis n’oublie pas de doubler pour obtenir la hauteur entière.',
        ),
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
    },
    {
      type: 'dialogue',
      setVisualStage: 'silas',
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
      announce: 'À suivre : Partie 2 — Réciproque du théorème de Pythagore.',
    },
  ];
  if (!s.hotspots.some((h) => h.optional)) {
    s.hotspots.push({
      id: 'opt_empreintes_p7',
      label: 'Empreintes sur le rocher',
      x: 15,
      y: 75,
      w: 12,
      h: 10,
      optional: true,
      advancesStory: false,
      repeatable: true,
      inDecor: true,
      lines: [
        {
          speaker: 'Alizée',
          text: 'Des empreintes trop soignées pour un matelot ordinaire… Silas aime laisser sa signature.',
        },
      ],
    });
  }
}

// Ensure progressiveHelp on all part1 exercises that have correction
walk(data, (n) => {
  if (n.type === 'exercise' && n.correction && n.progressiveHelp === undefined) {
    n.progressiveHelp = true;
  }
});

// optional for p1_2 if missing
{
  const s = byId('p1_2_cours');
  if (!s.hotspots.some((h) => h.optional)) {
    s.hotspots.push({
      id: 'opt_boussole_p2',
      label: 'Boussole sur la table',
      x: 82,
      y: 72,
      w: 10,
      h: 10,
      optional: true,
      advancesStory: false,
      repeatable: true,
      inDecor: true,
      lines: [
        {
          speaker: 'Euclide',
          text: 'Cette boussole pointe le nord… pas l’hypoténuse. Deux outils différents, une même exigence de précision.',
        },
      ],
    });
  }
}

fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
console.log('Patched', p);

// Verify no 25/169 as area labels in search figures for disc
const raw = fs.readFileSync(p, 'utf8');
const bad = [];
if (raw.includes('"areaC": "25"') || raw.includes('"areaC":"25"')) bad.push('areaC 25');
if (raw.includes('"areaC": "169"') || raw.includes('169') && raw.includes('pythagoras') && raw.match(/areaC.: .169/)) bad.push('areaC 169');
console.log('Leak check areaC 25/169:', bad.length ? bad : 'OK');
console.log('Has route a/b:', raw.includes('p1_final_route_a'), raw.includes('p1_final_route_b'));
console.log('Has monte:', raw.includes('p1_final_monte_charge'));
console.log('No old 15-20-25 final:', !raw.includes('p1_final_route"') && !raw.includes('côtés de l’angle droit 15 et 20'));
