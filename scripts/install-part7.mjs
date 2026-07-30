/**
 * Installe la Partie 7 depuis le pack final :
 * - copie backgrounds + diagrams
 * - normalise scenes.json pour le moteur (fields objet, free chat, endPart)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const packRoot = path.join(root, '_pack_part7', 'part7-final-tresor-pack');
const packScenes = path.join(packRoot, 'content', 'part7', 'scenes.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function looksNumeric(expectedList) {
  if (!expectedList.length) return false;
  const first = String(expectedList[0]).trim();
  // pure number or number + unit
  if (/^-?\d+([.,]\d+)?(\s*[a-zA-Z°²³]+)?$/.test(first)) return true;
  if (/^-?\d+\/\d+$/.test(first)) return true;
  return false;
}

function parsePrimaryNumber(raw) {
  const s = String(raw).trim().replace(',', '.');
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function convertField(f) {
  const expList = Array.isArray(f.expected)
    ? f.expected
    : f.expected != null
      ? [f.expected]
      : [];
  const size = f.size || 'short';
  const isNum =
    f.kind === 'number' ||
    f.kind === 'numeric' ||
    (size === 'num' && looksNumeric(expList));

  if (isNum) {
    const primary = parsePrimaryNumber(expList[0]);
    const out = {
      kind: 'number',
      expected: primary != null ? primary : expList[0],
      accept: expList.map(String),
      size: 'num',
      label: f.label || f.id,
    };
    if (typeof f.tolerance === 'number') out.tolerance = f.tolerance;
    return out;
  }

  return {
    kind: f.kind === 'select' ? 'select' : 'text',
    expected: expList.length === 1 ? expList[0] : expList,
    accept: expList.map(String),
    size: size === 'num' ? 'short' : size,
    label: f.label || f.id,
    options: f.options,
  };
}

function convertClozeStep(step) {
  const out = { ...step };
  if (Array.isArray(step.fields)) {
    const map = {};
    const coherentPairs = {};
    for (const f of step.fields) {
      if (!f?.id) continue;
      map[f.id] = convertField(f);
      if (f.coherentGroup) {
        if (!coherentPairs[f.coherentGroup]) coherentPairs[f.coherentGroup] = [];
        coherentPairs[f.coherentGroup].push(f.id);
      }
    }
    out.fields = map;

    // coherentNumericGroups si plusieurs champs numériques partagent un groupe
    const groups = [];
    for (const [gName, ids] of Object.entries(coherentPairs)) {
      if (ids.length < 2) continue;
      const centers = [];
      for (const id of ids) {
        const exp = map[id]?.expected;
        if (typeof exp === 'number' && Number.isFinite(exp)) {
          if (!centers.some((c) => Math.abs(c - exp) < 1e-9)) centers.push(exp);
        }
      }
      if (centers.length) {
        groups.push({
          fields: ids,
          groups: centers.map((c) => ({
            center: c,
            tolerance: map[ids[0]]?.tolerance ?? 0.02,
          })),
          mixedReason:
            'Les deux rapports doivent être pris dans le même sens (pas un « à l’endroit » et l’autre « à l’envers »).',
        });
      }
    }
    if (groups.length === 1) out.coherentNumericGroups = groups[0];
    else if (groups.length > 1) out.coherentNumericGroupsList = groups;
  }

  if (Array.isArray(step.correction)) {
    out.correction = step.correction; // le moteur jointe à l’affichage
  }
  if (Array.isArray(step.hints) && step.hints.length && out.progressiveHelp == null) {
    out.progressiveHelp = true;
  }
  // completeScene false déjà présent pour les clozes question-par-question
  if (step.type === 'cloze' && out.completeScene == null) {
    out.completeScene = false;
  }
  return out;
}

/** Boutons principaux des scènes d’exercices (pas le hotspot …) */
const START_BUTTONS = {
  p7_1_pont_recif_silas: {
    label: 'Affronter Silas',
    stepId: 'p7_ex1_intro',
  },
  p7_2_lentille_gobelet_silas: {
    label: 'Continuer l’affrontement',
    stepId: 'p7_ex2_intro',
  },
  p7_3_charpente_quai_silas: {
    label: 'Déjouer le plan de Silas',
    stepId: 'p7_ex3_intro',
  },
  p7_4_sanctuaire_figure_complexe: {
    label: 'Dernier duel contre Silas',
    stepId: 'p7_ex4_intro',
  },
  p7_5_serrure_tresor: {
    label: 'Ouvrir la serrure',
    stepId: 'p7_ex5_intro',
  },
};

function freeChatHotspot(sceneId, dialogueButtons = {}) {
  const text =
    dialogueButtons[sceneId] ||
    'Maki : Krii… on avance preuve par preuve.';
  // strip optional "Speaker : " prefix for a clean line
  const lineText = text.includes(' : ')
    ? text.slice(text.indexOf(' : ') + 3)
    : text;
  const speakerMatch = text.match(/^([^:]+)\s*:/);
  const speaker = speakerMatch ? speakerMatch[1].trim() : 'Maki';
  return {
    id: 'ambiance_chat',
    label: '…',
    x: 8,
    y: 88,
    w: 8,
    h: 8,
    optional: true,
    required: false,
    inDecor: true,
    repeatable: true,
    advancesStory: false,
    lines: [{ speaker, text: lineText }],
  };
}

function ensureHotspotFreeChat(scene, dialogueButtons) {
  const hotspots = Array.isArray(scene.hotspots) ? [...scene.hotspots] : [];
  if (!hotspots.some((h) => h.id === 'ambiance_chat')) {
    hotspots.unshift(freeChatHotspot(scene.id, dialogueButtons));
  }
  return { ...scene, hotspots };
}

function buildScenes(pack) {
  const dialogueButtons = pack.dialogueButtons || {};
  const scenes = pack.scenes.map((scene) => {
    let s = { ...scene };

    if (Array.isArray(s.steps)) {
      s.steps = s.steps.map((step) => {
        if (step.type === 'cloze') return convertClozeStep(step);
        return { ...step };
      });
    }

    // Scènes à hotspots : free chat + conclusion endPart
    if (s.id === 'p7_6_conclusion_tresor') {
      s = ensureHotspotFreeChat(s, dialogueButtons);
      // Pas de free chat qui bloque la fin : garder optional
      // Forcer endPart + flags sur le dialogue du coffre
      s.hotspots = s.hotspots.map((h) => {
        if (h.id !== 'coffre_tresor') return h;
        const seq = (h.sequence || []).map((step, idx, arr) => {
          if (idx !== arr.length - 1) return step;
          return {
            ...step,
            endPart: true,
            message:
              'Le trésor de Thalès est découvert. L’odyssée géométrique est terminée.',
            setFlags: {
              ...(step.setFlags || {}),
              part7Completed: true,
              gameCompleted: true,
            },
          };
        });
        return { ...h, sequence: seq };
      });
      return s;
    }

    if (s.hotspots?.length) {
      s = ensureHotspotFreeChat(s, dialogueButtons);
    } else if (s.steps?.length) {
      // Exercices purement steps : free chat optionnel + bouton principal
      s = ensureHotspotFreeChat(s, dialogueButtons);
    }

    if (START_BUTTONS[s.id]) {
      s.startButton = START_BUTTONS[s.id];
    }

    // Schéma d’exercice : hérité par toutes les sous-questions cloze
    const EXERCISE_DIAGRAMS = {
      p7_1_pont_recif_silas:
        '/assets/diagrams/part7/p7-exercice-1-aquathlon-schema.png',
      p7_2_lentille_gobelet_silas:
        '/assets/diagrams/part7/p7-exercice-2-gobelet-schema.png',
      p7_3_charpente_quai_silas:
        '/assets/diagrams/part7/p7-exercice-3-charpente-schema.png',
      p7_4_sanctuaire_figure_complexe:
        '/assets/diagrams/part7/p7-exercice-4-sanctuaire-schema.png',
      p7_5_serrure_tresor:
        '/assets/diagrams/part7/p7-exercice-5-serrure-schema.png',
    };
    if (EXERCISE_DIAGRAMS[s.id]) {
      s.exerciseDiagram = EXERCISE_DIAGRAMS[s.id];
      if (Array.isArray(s.steps)) {
        s.steps = s.steps.map((step) => {
          if (step.type !== 'cloze') return step;
          return {
            ...step,
            illustrations: [EXERCISE_DIAGRAMS[s.id]],
          };
        });
      }
    }

    // Ex. 1 : pas de trigonométrie (supprimer 3b angle + 3c validation)
    if (s.id === 'p7_1_pont_recif_silas' && Array.isArray(s.steps)) {
      s.steps = s.steps.filter(
        (st) => st.id !== 'p7_ex1_q4_angle' && st.id !== 'p7_ex1_q5_valid',
      );
      const q3 = s.steps.find((st) => st.id === 'p7_ex1_q3_parallel');
      if (q3) {
        q3.title = 'Exercice 1/5 - Question 3';
        q3.nextStepId = 'p7_ex1_transition';
        q3.setFlags = { p7Exercise1Completed: true };
        q3.success = "Silas recule d'un pas. Premier plan brisé.";
        q3.prompt =
          'Silas affirme que les segments (CD) et (BE) ne sont pas parallèles. Les droites (CD) et (BE) sont-elles parallèles ?';
        if (q3.coherentNumericGroups) {
          const ids = Object.keys(q3.fields || {});
          if (!ids.includes('r1') || !ids.includes('r2')) {
            delete q3.coherentNumericGroups;
          }
        }
      }
    }

    return s;
  });

  return {
    meta: {
      ...pack.meta,
      title: pack.meta.title || 'Partie 7 — Le dernier cap : le trésor de Thalès',
      endMessage:
        pack.meta.endMessage ||
        'Le trésor de Thalès est découvert. L’odyssée géométrique est terminée.',
      // Fin du jeu : pas de partie suivante
      nextPartId: null,
      announceNext: '',
    },
    dialogueButtons,
    assets: pack.assets,
    exerciseSources: pack.exerciseSources || [],
    scenes,
  };
}

// --- run ---
if (!fs.existsSync(packScenes)) {
  console.error('Pack scenes.json introuvable:', packScenes);
  process.exit(1);
}

const pack = JSON.parse(fs.readFileSync(packScenes, 'utf8'));

const bgSrc = path.join(packRoot, 'backgrounds');
const diagSrc = path.join(packRoot, 'diagrams');
const bgDest = path.join(root, 'client', 'assets', 'backgrounds', 'part7');
const diagDest = path.join(root, 'client', 'assets', 'diagrams', 'part7');
const contentDest = path.join(root, 'client', 'content', 'part7');

copyDir(bgSrc, bgDest);
copyDir(diagSrc, diagDest);
ensureDir(contentDest);

const built = buildScenes(pack);
const outPath = path.join(contentDest, 'scenes.json');
fs.writeFileSync(outPath, JSON.stringify(built, null, 2), 'utf8');

// pack-data backup for reference
fs.writeFileSync(
  path.join(contentDest, 'pack-data.json'),
  JSON.stringify(pack, null, 2),
  'utf8',
);

console.log('Part7 install OK');
console.log('  backgrounds:', fs.readdirSync(bgDest).length);
console.log('  diagrams:', fs.readdirSync(diagDest).length);
console.log('  scenes:', built.scenes.map((s) => s.id).join(' → '));
console.log('  clozes:', built.scenes.reduce((n, s) => n + (s.steps || []).filter((t) => t.type === 'cloze').length, 0));
