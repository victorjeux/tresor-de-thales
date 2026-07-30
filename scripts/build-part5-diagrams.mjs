/**
 * Diagrammes déterministes Partie 5 (configuration papillon + citerne).
 * SVG + PNG via Edge headless si disponible.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'client/assets/diagrams/part5');
fs.mkdirSync(outDir, { recursive: true });

const BG = '#fff8e5';
const INK = '#5b381c';
const TEAL = '#108098';
const LABEL = '#2b261f';
const TITLE = '#7a461c';
const BUBBLE = '#fff9e9';
const BORDER = '#d8b56f';
const DOT = '#cb711c';

function bubble(x, y, text, w = 120) {
  const h = 34;
  return `
  <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="8" fill="${BUBBLE}" stroke="${BORDER}"/>
  <text x="${x}" y="${y + 7}" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="22" fill="${LABEL}">${text}</text>`;
}

function point(x, y, name, dx = 0, dy = -22) {
  return `
  <circle cx="${x}" cy="${y}" r="10" fill="${DOT}" stroke="#412613" stroke-width="2"/>
  <text x="${x + dx}" y="${y + dy}" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="30" font-weight="700" fill="${LABEL}">${name}</text>`;
}

/** Configuration papillon : M-A-B et N-A-C, MN || BC */
function butterflySvg({
  title,
  labels = {},
  w = 1080,
  h = 700,
}) {
  // Coords: A centre ; M haut-gauche, N haut-droite ; B bas-gauche, C bas-droite
  const A = { x: 540, y: 350 };
  const M = { x: 280, y: 120 };
  const N = { x: 800, y: 120 };
  const B = { x: 220, y: 580 };
  const C = { x: 860, y: 580 };

  const segs = `
  <line x1="${M.x}" y1="${M.y}" x2="${B.x}" y2="${B.y}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <line x1="${N.x}" y1="${N.y}" x2="${C.x}" y2="${C.y}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <line x1="${M.x}" y1="${M.y}" x2="${N.x}" y2="${N.y}" stroke="${TEAL}" stroke-width="8" stroke-linecap="round"/>
  <line x1="${B.x}" y1="${B.y}" x2="${C.x}" y2="${C.y}" stroke="${TEAL}" stroke-width="8" stroke-linecap="round"/>`;

  // marques de parallélisme
  const midMN = { x: (M.x + N.x) / 2, y: (M.y + N.y) / 2 };
  const midBC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
  const marks = `
  <line x1="${midMN.x - 12}" y1="${midMN.y - 18}" x2="${midMN.x + 12}" y2="${midMN.y - 18}" stroke="${TEAL}" stroke-width="4"/>
  <line x1="${midBC.x - 12}" y1="${midBC.y + 18}" x2="${midBC.x + 12}" y2="${midBC.y + 18}" stroke="${TEAL}" stroke-width="4"/>`;

  const pts =
    point(A.x, A.y, 'A', 0, 40) +
    point(M.x, M.y, 'M', -28, -8) +
    point(N.x, N.y, 'N', 28, -8) +
    point(B.x, B.y, 'B', -28, 28) +
    point(C.x, C.y, 'C', 28, 28);

  let labelsHtml = '';
  // positions par défaut des cotes
  const pos = {
    AM: { x: 380, y: 220 },
    AB: { x: 340, y: 470 },
    AN: { x: 700, y: 220 },
    AC: { x: 740, y: 470 },
    MN: { x: 540, y: 95 },
    BC: { x: 540, y: 625 },
  };
  for (const [key, text] of Object.entries(labels)) {
    if (!text) continue;
    const p = pos[key] || { x: 540, y: 40 };
    labelsHtml += bubble(p.x, p.y, text, Math.max(110, text.length * 12));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <text x="540" y="48" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="32" font-weight="700" fill="${TITLE}">${title}</text>
  ${segs}
  ${marks}
  ${pts}
  ${labelsHtml}
</svg>`;
}

/** Citerne : vue de profil type papillon (sol / ouverture / œil) */
function citerneSvg({ title, showAnswer = false }) {
  // Schéma pédagogique simplifié du papillon pour la citerne
  // A = œil, C = pied, B haut du sol côté élève, N bord lointain ouverture, M fond
  const svg = butterflySvg({
    title,
    labels: {
      AN: 'AN = 1,20 m',
      AC: 'AC = 1,00 m',
      BC: 'BC = 1,50 m',
      MN: showAnswer ? 'p = 1,80 m' : 'p = ?',
    },
  });
  return svg;
}

const diagrams = {
  // Leçon carnet : vrai papillon (X) — généré à part dans p5-lecon-thales-papillon.svg
  // (ne pas utiliser butterflySvg « emboîté » ici)
  'p5-activite-cordages-schema.svg': butterflySvg({
    title: 'Activité — cordages papillon',
    labels: {
      AM: 'AM = 2 m',
      AB: 'AB = 6 m',
      AN: 'AN = 3 m',
      AC: 'AC = ?',
    },
  }),
  'p5-modele-schema.svg': butterflySvg({
    title: 'Exercice modèle',
    labels: {
      AM: 'AM = 4 cm',
      AB: 'AB = 10 cm',
      AN: 'AN = 6 cm',
      AC: 'AC = ?',
    },
  }),
  'p5-verification-cours-schema.svg': butterflySvg({
    title: 'Vérification du cours',
    labels: {
      AM: 'AM = 3 cm',
      AB: 'AB = 12 cm',
      AN: 'AN = 5 cm',
      AC: 'AC = ?',
    },
  }),
  'p5-exercice-a-schema.svg': butterflySvg({
    title: 'Exercice A',
    labels: {
      AM: 'AM = 2 m',
      AB: 'AB = 8 m',
      AN: 'AN = 3 m',
      AC: 'AC = ?',
    },
  }),
  'p5-exercice-b-schema.svg': butterflySvg({
    title: 'Exercice B',
    labels: {
      AM: 'AM = 5 m',
      AB: 'AB = 15 m',
      MN: 'MN = 4 m',
      BC: 'BC = ?',
    },
  }),
  'p5-exercice-c-correction.svg': butterflySvg({
    title: 'Correction — exercice C',
    labels: {
      AM: 'AM = 6 m',
      AB: 'AB = 18 m',
      AC: 'AC = 15 m',
      AN: 'AN = 5 m',
    },
  }),
  'p5-exercice-d-correction.svg': butterflySvg({
    title: 'Correction — exercice D',
    labels: {
      AM: 'AM = 8 m',
      AB: 'AB = 24 m',
      BC: 'BC = 18 m',
      MN: 'MN = 6 m',
    },
  }),
  'p5-citerne-enonce.svg': citerneSvg({
    title: 'Citerne — schéma d’énoncé',
    showAnswer: false,
  }),
  'p5-citerne-correction.svg': citerneSvg({
    title: 'Citerne — correction',
    showAnswer: true,
  }),
};

for (const [name, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(outDir, name), `${svg}\n`, 'utf8');
  console.log('wrote', name);
}

// PNG via Edge headless
const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const edge = edgeCandidates.find((p) => fs.existsSync(p));
if (edge) {
  for (const name of Object.keys(diagrams)) {
    const svgPath = path.join(outDir, name);
    const pngName = name.replace(/\.svg$/, '.png');
    const pngPath = path.join(outDir, pngName);
    const htmlPath = path.join(process.env.TEMP || '/tmp', `p5-render-${pngName}.html`);
    const fileUrl = `file:///${svgPath.replace(/\\/g, '/')}`;
    fs.writeFileSync(
      htmlPath,
      `<!DOCTYPE html><html><body style="margin:0;background:${BG};width:1080px;height:700px;overflow:hidden"><img src="${fileUrl}" width="1080" height="700"/></body></html>`,
      'utf8',
    );
    const r = spawnSync(
      edge,
      [
        '--headless=new',
        '--disable-gpu',
        '--window-size=1080,700',
        `--screenshot=${pngPath}`,
        `file:///${htmlPath.replace(/\\/g, '/')}`,
      ],
      { timeout: 30000 },
    );
    if (fs.existsSync(pngPath)) {
      console.log('png', pngName, fs.statSync(pngPath).size);
    } else {
      console.warn('png fail', pngName, r.stderr?.toString?.() || '');
    }
  }
} else {
  console.warn('Edge/Chrome non trouvé — PNG non générés (SVG seuls)');
}

console.log('diagrams part5 OK →', outDir);
