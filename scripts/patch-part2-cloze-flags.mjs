/**
 * Patch part2 : drapeaux, fragment séparé, formulation réciproque.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenesPath = path.join(__dirname, '../client/content/part2/scenes.json');
const content = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));

const RECIP = "D'après la réciproque du théorème de Pythagore,";

function ensureCorrection(corr) {
  if (!corr) return corr;
  let c = String(corr);
  c = c.replace(/Donc,\s*d'après la réciproque du théorème de Pythagore,\s*/gi, '');
  c = c.replace(/D'après la réciproque du théorème de Pythagore,\s*/gi, '');
  if (c.includes(RECIP)) return c;

  const lines = c.split('\n');
  const out = [];
  let inserted = false;
  for (let i = 0; i < lines.length; i += 1) {
    out.push(lines[i]);
    if (!inserted && /On compare/i.test(lines[i])) {
      if (i + 1 < lines.length) {
        i += 1;
        out.push(lines[i]);
      }
      out.push(RECIP);
      inserted = true;
    }
  }
  if (!inserted) {
    const idx = out.findIndex((l) => /^Donc\b/i.test(l.trim()));
    if (idx >= 0) out.splice(idx, 0, RECIP);
    else out.push(RECIP);
  }
  return out.join('\n');
}

function injectRecipLine(cloze) {
  if (!cloze) return;
  const lines = cloze.lines || [];
  const newLines = [];
  for (const line of lines) {
    newLines.push(line);
    const isCompare = (line.parts || []).some(
      (p) => p.type === 'field' && p.id === 'comparaison',
    );
    if (isCompare) {
      newLines.push({ type: 'text', text: RECIP });
    }
  }
  const cleaned = [];
  let lastWasRecip = false;
  for (const l of newLines) {
    const isRecip =
      l.type === 'text' &&
      String(l.text || '').includes(
        "D'après la réciproque du théorème de Pythagore",
      );
    if (isRecip && lastWasRecip) continue;
    cleaned.push(l);
    lastWasRecip = isRecip;
  }
  cloze.lines = cleaned;
  cloze.correction = ensureCorrection(cloze.correction);
  cloze.completeScene = false;
}

// Global dialogue fix
for (const scene of content.scenes) {
  for (const h of scene.hotspots || []) {
    for (const step of h.sequence || []) {
      if (step.type === 'dialogue') {
        for (const line of step.lines || []) {
          if (line.text && line.text.includes('faux angle droit')) {
            line.text = line.text.replace(
              'faux angle droit',
              "angle qui ne mesure pas 90°",
            );
          }
        }
      }
    }
  }
}

const byId = Object.fromEntries(content.scenes.map((s) => [s.id, s]));

const p2_3 = byId.p2_3_verification;
p2_3.next = 'p2_4_exercices_application';
const lastDlg = p2_3.hotspots[0].sequence[p2_3.hotspots[0].sequence.length - 1];
if (lastDlg.nextSceneId) lastDlg.nextSceneId = 'p2_4_exercices_application';

const oldRst = byId.p2_4_exercice_rectangle;
const oldKlm = byId.p2_5_exercice_non_rectangle;
const rstCloze = structuredClone(
  oldRst.hotspots[0].sequence.find((s) => s.id === 'p2_4_rst'),
);
const klmCloze = structuredClone(
  oldKlm.hotspots[0].sequence.find((s) => s.id === 'p2_5_klm'),
);
injectRecipLine(rstCloze);
injectRecipLine(klmCloze);

const p2_1 = byId.p2_1_decouverte_corde;
const cordeCloze = p2_1.hotspots[0].sequence.find((s) => s.id === 'p2_1_corde');
injectRecipLine(cordeCloze);

const murOld = byId.p2_6_finale_mur;
const murCloze = structuredClone(
  murOld.hotspots
    .find((h) => h.id === 'mur_final')
    .sequence.find((s) => s.id === 'p2_6_mur'),
);
injectRecipLine(murCloze);

// Notebook
const cours = byId.p2_2_cours;
const nb = cours.hotspots[0].sequence.find((s) => s.type === 'notebook');
for (const page of nb.pages) {
  if (!page.blocks) continue;
  const blocks = [];
  for (const b of page.blocks) {
    if (
      b.type === 'text' &&
      /Donc,\s*d.après la réciproque/i.test(b.text || '')
    ) {
      const rest = String(b.text)
        .replace(/^Donc,\s*d.après la réciproque du théorème de Pythagore,\s*/i, '')
        .trim();
      blocks.push({ type: 'text', text: RECIP });
      blocks.push({
        type: 'text',
        text: rest.startsWith('Donc') ? rest : `Donc ${rest}`,
      });
    } else {
      blocks.push(b);
    }
  }
  page.blocks = blocks;
  const joined = page.blocks.map((b) => b.text || '').join('\n');
  if (
    /Exemple rectangle|Cas non rectangle/i.test(page.title || '') &&
    !joined.includes(RECIP)
  ) {
    const idx = page.blocks.findIndex((b) => /^Donc\b/i.test((b.text || '').trim()));
    if (idx >= 0) page.blocks.splice(idx, 0, { type: 'text', text: RECIP });
  }
}

const appScene = {
  id: 'p2_4_exercices_application',
  title: "Exercices d'application",
  requireInteraction: true,
  prompt:
    "Touche les drapeaux sur la table pour les exercices RST et KLM (dans n'importe quel ordre).",
  next: 'p2_6_finale_mur',
  decor: {
    background: '/assets/backgrounds/part2/p2-atelier-exercices-cordes.png',
    objects: [
      {
        image: '/assets/objects/part1/balise-rouge.png',
        alt: 'Drapeau exercice RST',
        x: 36,
        y: 68,
        w: 9,
        h: 20,
        z: 3,
        grounded: true,
        anchor: 'bottom',
      },
      {
        image: '/assets/objects/part1/balise-verte.png',
        alt: 'Drapeau exercice KLM',
        x: 58,
        y: 68,
        w: 9,
        h: 20,
        z: 3,
        grounded: true,
        anchor: 'bottom',
      },
    ],
  },
  hotspots: [
    {
      id: 'drapeau_rst',
      label: 'Drapeau RST',
      x: 36,
      y: 58,
      w: 10,
      h: 24,
      required: true,
      inDecor: true,
      repeatable: true,
      advancesStory: true,
      sequence: [
        rstCloze,
        {
          type: 'dialogue',
          lines: [
            {
              speaker: 'Euclide',
              text: 'Bien. Le drapeau RST est validé.',
            },
          ],
          completeScene: false,
        },
      ],
    },
    {
      id: 'drapeau_klm',
      label: 'Drapeau KLM',
      x: 58,
      y: 58,
      w: 10,
      h: 24,
      required: true,
      inDecor: true,
      repeatable: true,
      advancesStory: true,
      sequence: [
        klmCloze,
        {
          type: 'dialogue',
          lines: [
            {
              speaker: 'Alizée',
              text: "Donc la méthode sert aussi à repérer un angle qui ne mesure pas 90°.",
            },
            {
              speaker: 'Euclide',
              text: "Oui. La réciproque permet de prouver qu'un triangle est rectangle quand l'égalité est vraie. Si l'égalité est fausse, le triangle n'est pas rectangle.",
            },
            {
              speaker: 'Nérée',
              text: 'Voilà qui évitera de construire une pièce bancale.',
            },
          ],
          completeScene: false,
        },
      ],
    },
    {
      id: 'opt_table_p24',
      label: 'Outils sur la table',
      x: 18,
      y: 72,
      w: 10,
      h: 12,
      optional: true,
      advancesStory: false,
      repeatable: true,
      inDecor: true,
      lines: [
        {
          speaker: 'Maki',
          text: "Krii ! Deux drapeaux, deux triangles… dans n'importe quel ordre !",
        },
      ],
    },
  ],
};

const murScene = {
  id: 'p2_6_finale_mur',
  title: 'Le muret de la jetée',
  requireInteraction: true,
  prompt: 'Vérifie le muret réparé pendant la nuit.',
  next: 'p2_7_fragment_mur',
  decor: {
    background: '/assets/backgrounds/part2/p2-chantier-quai-mur.png',
    objects: [],
  },
  hotspots: [
    {
      id: 'mur_final',
      label: 'Muret à vérifier',
      x: 48,
      y: 55,
      w: 28,
      h: 30,
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
              text: 'Avant de quitter le quai, il faut vérifier ce muret réparé pendant la nuit.',
            },
          ],
        },
        murCloze,
        {
          type: 'dialogue',
          lines: [
            {
              speaker: 'Nérée',
              text: "Mur vérifié. Angle droit confirmé. On peut quitter le quai sans finir dans l'eau.",
            },
            {
              speaker: 'Alizée',
              text: "Comme quoi, une mesure bien rédigée vaut mieux qu'un mur qui a simplement l'air droit.",
            },
            { speaker: 'Maki', text: 'Krii !' },
            {
              speaker: 'Euclide',
              text: "La réciproque vient de nous donner une certitude, pas une impression.",
            },
          ],
          nextSceneId: 'p2_7_fragment_mur',
        },
      ],
    },
  ],
};

const fragScene = {
  id: 'p2_7_fragment_mur',
  title: 'Le deuxième fragment',
  requireInteraction: true,
  prompt: 'Un fragment de carte est apparu. Touche-le pour le récupérer.',
  next: 'p2_8_conclusion',
  decor: {
    background: '/assets/backgrounds/part2/p2-chantier-quai-mur.png',
    objects: [
      {
        image: '/assets/objects/part2/fragment-carte-2.png',
        alt: 'Deuxième fragment de la carte de Thalès',
        x: 68,
        y: 42,
        w: 14,
        h: 16,
        z: 4,
      },
    ],
  },
  hotspots: [
    {
      id: 'fragment_carte_2',
      label: 'Deuxième fragment de carte',
      x: 68,
      y: 42,
      w: 14,
      h: 16,
      required: true,
      image: '/assets/objects/part2/fragment-carte-2.png',
      inDecor: true,
      repeatable: true,
      advancesStory: true,
      sequence: [
        {
          type: 'fragmentZoom',
          image: '/assets/objects/part2/fragment-carte-2.png',
          alt: 'Zoom du deuxième fragment de la carte de Thalès',
          completeScene: false,
        },
        {
          type: 'dialogue',
          lines: [
            { speaker: 'Alizée', text: 'Le deuxième fragment !' },
            {
              speaker: 'Nérée',
              text: "Silas n'est donc pas le seul à savoir lire les routes cachées.",
            },
            {
              speaker: 'Euclide',
              text: 'Et celui-ci indique une nouvelle épreuve : des triangles qui se ressemblent sans être de même taille.',
            },
          ],
          nextSceneId: 'p2_8_conclusion',
        },
      ],
    },
  ],
};

const oldConc = byId.p2_7_conclusion;
const concScene = { ...structuredClone(oldConc), id: 'p2_8_conclusion' };
delete concScene.next;

const keepIds = [
  'p2_0_arrivee_chantier',
  'p2_1_decouverte_corde',
  'p2_2_cours',
  'p2_3_verification',
];
content.scenes = [
  ...keepIds.map((id) => byId[id]),
  appScene,
  murScene,
  fragScene,
  concScene,
];
content.meta.sceneOrder = content.scenes.map((s) => s.id);

fs.writeFileSync(scenesPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');

const s = JSON.stringify(content);
console.log('order:', content.meta.sceneOrder.join(' → '));
console.log('count:', content.scenes.length);
console.log('faux angle:', s.includes('faux angle droit'));
console.log(
  'recip:',
  (s.match(/D'après la réciproque du théorème de Pythagore/g) || []).length,
);
console.log(
  'drapeaux:',
  s.includes('drapeau_rst') && s.includes('drapeau_klm'),
);
console.log('fragment scene:', content.scenes.some((x) => x.id === 'p2_7_fragment_mur'));
