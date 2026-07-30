/**
 * Génère client/content/part1/scenes.json (corrections pédagogiques + visuels).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', 'client', 'content', 'part1', 'scenes.json');

const FALLBACK = '/assets/backgrounds/part1/recif-angles-droits.png';
const BG = {
  arrivee: '/assets/backgrounds/part1/p1-entree-recif.png',
  dallage: '/assets/backgrounds/part1/p1-dallage-pythagore.png',
  table: '/assets/backgrounds/part1/p1-table-carnet.png',
  balises: '/assets/backgrounds/part1/p1-balises-entrainement.png',
  passExt: '/assets/backgrounds/part1/p1-passage-exterieur.png',
  passInt: '/assets/backgrounds/part1/p1-passage-interieur.png',
  sanct: '/assets/backgrounds/part1/p1-sanctuaire-fragment.png',
  silas: '/assets/backgrounds/part1/p1-trace-silas.png',
};

const maki = (text) => ({ reaction: 'Krii !', text });
const pyth = (open, body) =>
  `${open}\nDonc, d'après le théorème de Pythagore :\n${body}`;

const fig345 = {
  figure: 'pythagorasSquares',
  figureLabels: {
    a: 3,
    b: 4,
    c: 5,
    labelA: '3',
    labelB: '4',
    labelC: '?',
    areaA: '9',
    areaB: '16',
    areaC: '?',
    hideHypArea: true,
    showAreas: true,
  },
};
const fig512 = {
  figure: 'pythagorasSquares',
  figureLabels: {
    a: 5,
    b: 12,
    c: 13,
    labelA: '5',
    labelB: '12',
    labelC: '?',
    areaA: '25',
    areaB: '144',
    areaC: '?',
    hideHypArea: true,
    showAreas: true,
    unit: 12,
  },
};

const APPROX =
  "Donne une valeur approchée au dixième à l'aide de la calculatrice. Saisis uniquement le nombre, sans unité.";

const data = {
  meta: {
    partId: 'part1',
    title: 'Partie 1 — Le récif des Angles droits',
    startSceneId: 'p1_0_arrivee',
    sceneOrder: [
      'p1_0_arrivee',
      'p1_1_decouverte',
      'p1_2_cours',
      'p1_3_verification',
      'p1_4_hypotenuse',
      'p1_5_cote',
      'p1_6_entrainement',
      'p1_7_finale',
    ],
    endMessage:
      'Premier fragment récupéré. La Sécante des Vents peut poursuivre sa route.',
    announceNext: 'Partie 2 — Réciproque du théorème de Pythagore.',
  },
  scenes: [
    {
      id: 'p1_0_arrivee',
      title: "L'entrée du récif",
      requireInteraction: true,
      prompt:
        'Explorez la carte tenue par Nérée et l’îlot du dallage avant de poursuivre.',
      next: 'p1_1_decouverte',
      decor: {
        background: BG.arrivee,
        backgroundFallback: FALLBACK,
        objects: [
          {
            image: '/assets/objects/part1/ile-dallage-recif.png',
            alt: 'Îlot rocheux avec plateforme de dallage dans la mer',
            x: 74,
            y: 78,
            w: 30,
            h: 28,
            z: 2,
            grounded: true,
          },
          {
            image: '/assets/objects/part1/neree-carte-recif.png',
            alt: 'Capitaine Nérée tenant la carte du récif',
            x: 20,
            y: 64,
            w: 24,
            h: 38,
            z: 3,
            grounded: true,
          },
        ],
      },
      hotspots: [
        {
          id: 'neree_carte',
          label: 'Nérée et sa carte',
          x: 20,
          y: 60,
          w: 22,
          h: 34,
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
          y: 74,
          w: 24,
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
          x: 10,
          y: 80,
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
      ],
    },
    // scenes 1-7 continue in part 2 of file generation
  ],
};

// --- discovery scene ---
data.scenes.push({
  id: 'p1_1_decouverte',
  title: 'Les trois carrés du cartographe',
  requireInteraction: true,
  prompt: 'Touchez le dallage peint au centre du décor.',
  next: 'p1_2_cours',
  decor: { background: BG.dallage, backgroundFallback: FALLBACK },
  hotspots: [
    {
      id: 'start_decouverte',
      label: 'Dallage central',
      x: 50,
      y: 58,
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
              speaker: 'Alizée',
              text: 'Ne cherchons pas encore de formule. Observons seulement les aires.',
            },
            {
              speaker: 'Alizée',
              text: 'Voici un triangle rectangle. Sur chaque côté, un carré a été construit. Les côtés de l’angle droit mesurent 3 et 4… le troisième côté est encore un mystère.',
            },
          ],
        },
        {
          type: 'exercise',
          id: 'p1_disc_aire3',
          progressiveHelp: true,
          title: 'Observation 1',
          prompt:
            'Quelle est l’aire du carré construit sur le côté de longueur 3 ?',
          ...fig345,
          expected: 9,
          tolerance: 0,
          hints: [
            maki('Compte les carreaux d’un côté : 3…'),
            maki('L’aire d’un carré de côté n vaut n × n.'),
            maki('Calcule 3 × 3 sans que je te donne le total !'),
          ],
          success: 'Oui : l’aire vaut 9.',
          correction: pyth(
            'On considère le carré construit sur le côté de longueur 3.',
            'Aire = 3² = 9.',
          ),
          completeScene: false,
        },
        {
          type: 'exercise',
          id: 'p1_disc_aire4',
          progressiveHelp: true,
          title: 'Observation 2',
          prompt:
            'Quelle est l’aire du carré construit sur le côté de longueur 4 ?',
          ...fig345,
          expected: 16,
          tolerance: 0,
          hints: [
            maki('Même idée que pour le côté 3.'),
            maki('Aire = côté × côté.'),
            maki('4 × 4… à toi !'),
          ],
          success: 'Exact : 16.',
          correction: pyth('Carré de côté 4.', 'Aire = 4² = 16.'),
          completeScene: false,
        },
        {
          type: 'exercise',
          id: 'p1_disc_somme',
          progressiveHelp: true,
          title: 'Observation 3',
          prompt: 'Calcule la somme des deux aires trouvées : 9 + 16.',
          ...fig345,
          math: '9 + 16 = \\, ?',
          expected: 25,
          tolerance: 0,
          hints: [
            maki('Additionne les deux aires déjà trouvées.'),
            maki('9 + 16, sans ruse.'),
            maki('Le total est un carré parfait… je m’arrête là !'),
          ],
          success: 'Bien. Cette somme sera utile.',
          correction: pyth(
            'On additionne les deux aires connues.',
            '9 + 16 = 25.',
          ),
          completeScene: false,
        },
        {
          type: 'exercise',
          id: 'p1_disc_cote',
          progressiveHelp: true,
          title: 'Observation 4',
          prompt:
            'Si le grand carré a pour aire la somme trouvée à l’étape précédente, quelle est la longueur du troisième côté du triangle ?',
          ...fig345,
          expected: 5,
          tolerance: 0,
          hints: [
            maki('Tu cherches le côté d’un carré dont tu connais l’aire.'),
            maki('Quel nombre positif multiplié par lui-même donne cette aire ?'),
            maki('Essaie quelques entiers autour de 5…'),
          ],
          success:
            'Le troisième côté mesure 5. C’est le célèbre triangle 3-4-5 !',
          correction: pyth(
            'L’aire du grand carré est 25.',
            'Le côté mesure 5, car 5² = 25.',
          ),
          completeScene: false,
        },
        {
          type: 'dialogue',
          lines: [
            {
              speaker: 'Alizée',
              text: 'Un seul dessin ne suffit jamais. Vérifions sur une autre configuration du dallage.',
            },
            {
              speaker: 'Alizée',
              text: 'Ici, les côtés de l’angle droit mesurent 5 et 12. Les aires des petits carrés sont 25 et 144.',
            },
          ],
        },
        {
          type: 'exercise',
          id: 'p1_disc_512',
          progressiveHelp: true,
          title: 'Seconde observation',
          prompt:
            'Si l’aire du grand carré est la somme 25 + 144, quelle longueur a le troisième côté ?',
          ...fig512,
          math: '25 + 144 = \\, ?^{2}',
          expected: 13,
          tolerance: 0,
          hints: [
            maki('D’abord calcule 25 + 144.'),
            maki('Puis quel nombre multiplié par lui-même donne ce total ?'),
            maki('13 × 13… regarde bien, sans que je confirme !'),
          ],
          success:
            '13. Encore une fois, le grand côté « colle » avec la somme des aires.',
          correction: pyth(
            '25 + 144 = 169.',
            'Le côté mesure 13, car 13² = 169.',
          ),
          completeScene: false,
        },
        {
          type: 'quiz',
          id: 'p1_disc_conjecture',
          question: 'D’après ces observations, que peut-on conjecturer ?',
          figure: 'pythagorasSquares',
          figureLabels: {
            a: 3,
            b: 4,
            c: 5,
            labelA: '3',
            labelB: '4',
            labelC: '?',
            areaA: '9',
            areaB: '16',
            areaC: '?',
            hideHypArea: true,
          },
          options: [
            {
              text: 'L’aire du grand carré est la somme des aires des deux autres carrés.',
              correct: true,
            },
            {
              text: 'Les trois aires sont toujours égales.',
              correct: false,
              explanation: 'Relis les deux exemples et réessaie.',
            },
            {
              text: 'On additionne les longueurs des côtés, pas les aires.',
              correct: false,
              explanation: 'Relis les deux exemples et réessaie.',
            },
          ],
          success:
            'Oui : l’aire du carré construit sur le plus long côté semble être la somme des deux autres.',
          completeScene: false,
        },
        {
          type: 'dialogue',
          lines: [
            {
              speaker: 'Alizée',
              text: 'Autrement dit : l’aire du carré construit sur l’hypoténuse est égale à la somme des aires des carrés construits sur les deux côtés de l’angle droit.',
            },
            {
              speaker: 'Euclide',
              text: 'Cette propriété porte un nom, {{playerName}} : le théorème de Pythagore.',
            },
            {
              speaker: 'Euclide',
              text: 'Ouvre mon carnet. Tu vas le recopier proprement avant de l’utiliser pour le récif.',
            },
          ],
          nextSceneId: 'p1_2_cours',
        },
      ],
    },
    {
      id: 'opt_nuage_p1',
      label: 'Nuage au loin',
      x: 80,
      y: 18,
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
    },
  ],
});

// Continue file - write intermediate and append remaining scenes via second write
fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log('Wrote base scenes', data.scenes.length, 'to', out);
console.log('Run build-part1-content-rest.mjs next');
