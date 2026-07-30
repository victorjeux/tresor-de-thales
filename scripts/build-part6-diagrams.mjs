/**
 * Schémas déterministes Partie 6 (réciproque de Thalès).
 * Emboîtée + papillon. SVG uniquement (pas d’images AI).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'client/assets/diagrams/part6');
fs.mkdirSync(outDir, { recursive: true });

const BG = '#fff8e5';
const INK = '#5f401e';
const TEAL = '#0f829b';
const LABEL = '#2b261f';
const TITLE = '#7a461c';
const BUBBLE = '#fff9e9';
const BORDER = '#d8b56f';
const DOT = '#cb711c';

function bubble(x, y, text, w = 140) {
  return `
  <rect x="${x - w / 2}" y="${y - 17}" width="${w}" height="34" rx="8" fill="${BUBBLE}" stroke="${BORDER}"/>
  <text x="${x}" y="${y + 7}" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="20" fill="${LABEL}">${text}</text>`;
}

function pt(x, y, name, dx = 0, dy = -20) {
  return `
  <circle cx="${x}" cy="${y}" r="10" fill="${DOT}" stroke="#412613" stroke-width="2"/>
  <text x="${x + dx}" y="${y + dy}" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="30" font-weight="700" fill="${LABEL}">${name}</text>`;
}

/** Configuration emboîtée A-B-M / A-C-N, BC et MN */
function nestedSvg(title, labels = {}) {
  const A = { x: 160, y: 360 };
  const B = { x: 420, y: 240 };
  const C = { x: 430, y: 480 };
  const M = { x: 820, y: 120 };
  const N = { x: 850, y: 580 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="700" viewBox="0 0 1080 700">
  <rect width="1080" height="700" fill="${BG}"/>
  <text x="540" y="48" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="32" font-weight="700" fill="${TITLE}">${title}</text>
  <polyline points="${A.x},${A.y} ${M.x},${M.y} ${N.x},${N.y} ${A.x},${A.y}" fill="none" stroke="${INK}" stroke-width="7"/>
  <line x1="${B.x}" y1="${B.y}" x2="${C.x}" y2="${C.y}" stroke="${TEAL}" stroke-width="7"/>
  <line x1="${M.x}" y1="${M.y}" x2="${N.x}" y2="${N.y}" stroke="${TEAL}" stroke-width="7"/>
  ${pt(A.x, A.y, 'A', -28, 8)}
  ${pt(B.x, B.y, 'B', 0, -24)}
  ${pt(C.x, C.y, 'C', 0, 36)}
  ${pt(M.x, M.y, 'M', 28, -8)}
  ${pt(N.x, N.y, 'N', 28, 28)}
  ${labels.AB ? bubble(280, 280, labels.AB) : ''}
  ${labels.AM ? bubble(480, 200, labels.AM) : ''}
  ${labels.AC ? bubble(290, 430, labels.AC) : ''}
  ${labels.AN ? bubble(500, 500, labels.AN) : ''}
  ${labels.BC ? bubble(430, 360, labels.BC || 'BC', 100) : bubble(430, 360, 'BC', 80)}
  ${labels.MN ? bubble(860, 360, labels.MN || 'MN', 100) : bubble(860, 360, 'MN', 80)}
</svg>`;
}

/** Configuration papillon / croisée autour de O ou A */
function butterflySvg(title, labels = {}, names = { O: 'O', A: 'A', B: 'B', M: 'M', N: 'N' }) {
  // Use O as center if labels use OA/OM style
  const center = names.O === 'O' ? 'O' : 'A';
  const C = { x: 540, y: 350 };
  const M = { x: 260, y: 140 };
  const N = { x: 820, y: 140 };
  const A = { x: 240, y: 560 };
  const B = { x: 840, y: 560 };
  // For OA OM OB ON style: M-O-A and N-O-B crossing
  // Map: center O, left-top M, right-top N, left-bot A, right-bot B for nested-like
  // Papillon: M-A-B and N-A-C with A center - for exercise B: OA, OM, OB, ON
  // O center, A left, M further left-top? Script: OA=6, OM=10, OB=8, ON=15
  // Points A,O,M colinear; B,O,N colinear; compare (AB)//(MN)?
  // Actually: O,A,M aligned and O,B,N aligned - papillon with O center
  const O = C;
  const Pa = { x: 300, y: 200 }; // A
  const Pm = { x: 200, y: 120 }; // M beyond A
  const Pb = { x: 780, y: 200 }; // B
  const Pn = { x: 880, y: 120 }; // N beyond B
  // Better classic X: A left, B right on one line through O; M left, N right on other
  // O center; A left-middle, M farther left-up; B right-middle, N farther right-down?
  // Standard papillon reciprocal: A-O-M and B-O-N
  const pts = {
    O: { x: 540, y: 350 },
    A: { x: 320, y: 280 },
    M: { x: 180, y: 220 },
    B: { x: 760, y: 280 },
    N: { x: 900, y: 220 },
  };
  // For nested-style names A,B,C,M,N use butterfly with A center
  if (center === 'A') {
    pts.A = { x: 540, y: 350 };
    pts.M = { x: 280, y: 140 };
    pts.N = { x: 800, y: 140 };
    pts.B = { x: 240, y: 560 };
    pts.C = { x: 840, y: 560 };
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="700" viewBox="0 0 1080 700">
  <rect width="1080" height="700" fill="${BG}"/>
  <text x="540" y="48" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="32" font-weight="700" fill="${TITLE}">${title}</text>
  <polygon points="${pts.M.x},${pts.M.y} ${pts.A.x},${pts.A.y} ${pts.N.x},${pts.N.y}" fill="#e8be76" fill-opacity="0.45"/>
  <polygon points="${pts.B.x},${pts.B.y} ${pts.A.x},${pts.A.y} ${pts.C.x},${pts.C.y}" fill="#82b9c3" fill-opacity="0.4"/>
  <line x1="${pts.M.x}" y1="${pts.M.y}" x2="${pts.B.x}" y2="${pts.B.y}" stroke="${INK}" stroke-width="7"/>
  <line x1="${pts.N.x}" y1="${pts.N.y}" x2="${pts.C.x}" y2="${pts.C.y}" stroke="${INK}" stroke-width="7"/>
  <line x1="${pts.M.x}" y1="${pts.M.y}" x2="${pts.N.x}" y2="${pts.N.y}" stroke="${TEAL}" stroke-width="7"/>
  <line x1="${pts.B.x}" y1="${pts.B.y}" x2="${pts.C.x}" y2="${pts.C.y}" stroke="${TEAL}" stroke-width="7"/>
  ${pt(pts.A.x, pts.A.y, 'A', 0, 40)}
  ${pt(pts.M.x, pts.M.y, 'M', -24, -8)}
  ${pt(pts.N.x, pts.N.y, 'N', 24, -8)}
  ${pt(pts.B.x, pts.B.y, 'B', -24, 28)}
  ${pt(pts.C.x, pts.C.y, 'C', 24, 28)}
  ${Object.entries(labels)
    .map(([k, v], i) => bubble(200 + (i % 3) * 280, 620 + Math.floor(i / 3) * 0, v, 150))
    .join('')}
</svg>`;
  }
  // O-centered: A-O-M and B-O-N colinear
  const o = { x: 540, y: 360 };
  const a = { x: 360, y: 300 };
  const m = { x: 220, y: 250 };
  const b = { x: 720, y: 300 };
  const n = { x: 860, y: 250 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="700" viewBox="0 0 1080 700">
  <rect width="1080" height="700" fill="${BG}"/>
  <text x="540" y="48" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="32" font-weight="700" fill="${TITLE}">${title}</text>
  <line x1="${m.x}" y1="${m.y}" x2="${a.x}" y2="${a.y}" stroke="${INK}" stroke-width="7"/>
  <line x1="${a.x}" y1="${a.y}" x2="${o.x}" y2="${o.y}" stroke="${INK}" stroke-width="7"/>
  <line x1="${o.x}" y1="${o.y}" x2="${b.x}" y2="${b.y}" stroke="${INK}" stroke-width="7"/>
  <line x1="${b.x}" y1="${b.y}" x2="${n.x}" y2="${n.y}" stroke="${INK}" stroke-width="7"/>
  <!-- other ray: actually A-O extended and B-O - for papillon AB and MN -->
  <line x1="${m.x}" y1="${m.y}" x2="${n.x}" y2="${n.y}" stroke="${TEAL}" stroke-width="7"/>
  <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${TEAL}" stroke-width="7"/>
  ${pt(o.x, o.y, 'O', 0, 40)}
  ${pt(a.x, a.y, 'A', 0, -24)}
  ${pt(m.x, m.y, 'M', -24, -8)}
  ${pt(b.x, b.y, 'B', 0, -24)}
  ${pt(n.x, n.y, 'N', 24, -8)}
  ${labels.OA ? bubble(420, 310, labels.OA) : ''}
  ${labels.OM ? bubble(280, 220, labels.OM) : ''}
  ${labels.OB ? bubble(660, 310, labels.OB) : ''}
  ${labels.ON ? bubble(800, 220, labels.ON) : ''}
</svg>`;
}

/** Table pirate : supports croisés (papillon simplifié) */
function tableSvg(title, labels, showEqual = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="700" viewBox="0 0 1080 700">
  <rect width="1080" height="700" fill="${BG}"/>
  <text x="540" y="48" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="30" font-weight="700" fill="${TITLE}">${title}</text>
  <!-- plateau table -->
  <rect x="280" y="200" width="520" height="40" rx="6" fill="#c4a484" stroke="${INK}" stroke-width="4"/>
  <!-- pieds croisés -->
  <line x1="340" y1="240" x2="700" y2="520" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  <line x1="740" y1="240" x2="380" y2="520" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  <line x1="340" y1="520" x2="740" y2="520" stroke="#5b381c" stroke-width="8"/>
  ${bubble(400, 160, labels.topL || '42 cm', 120)}
  ${bubble(680, 160, labels.topR || '70 cm', 120)}
  ${bubble(400, 560, labels.botL || '32,4 cm', 130)}
  ${bubble(700, 560, labels.botR || '54 cm', 120)}
  ${
    showEqual
      ? `<text x="540" y="640" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="24" font-weight="700" fill="${TEAL}">42/70 = 32,4/54 = 0,6 → table horizontale</text>`
      : `<text x="540" y="640" text-anchor="middle" font-family="DejaVu Sans, Arial" font-size="22" fill="${LABEL}">La table est-elle horizontale ?</text>`
  }
</svg>`;
}

const diagrams = {
  'p6-activite-cordages-schema.svg': nestedSvg('Activité — deux cordages', {
    AB: 'AB = 4 m',
    AM: 'AM = 10 m',
    AC: 'AC = 6 m',
    AN: 'AN = 15 m',
  }),
  'p6-lecon-reciproque-emboitee.svg': nestedSvg('Leçon — configuration emboîtée', {
    AB: 'AB',
    AM: 'AM',
    AC: 'AC',
    AN: 'AN',
  }),
  'p6-lecon-reciproque-papillon.svg': butterflySvg(
    'Leçon — configuration papillon',
    {},
    { O: 'A' },
  ),
  'p6-exercice-guide-schema.svg': nestedSvg('Exercice guidé', {
    AB: 'AB = 5 m',
    AM: 'AM = 12 m',
    AC: 'AC = 7 m',
    AN: 'AN = 16,8 m',
  }),
  'p6-exercice-a-schema.svg': nestedSvg('Exercice A — haubans', {
    AB: 'AB = 3 m',
    AM: 'AM = 7,5 m',
    AC: 'AC = 4 m',
    AN: 'AN = 10 m',
  }),
  'p6-exercice-b-schema.svg': butterflySvg('Exercice B — routes de Silas', {
    OA: 'OA = 6 cm',
    OM: 'OM = 10 cm',
    OB: 'OB = 8 cm',
    ON: 'ON = 15 cm',
  }),
  'p6-exercice-c-schema.svg': nestedSvg('Exercice C — passerelle', {
    AB: 'AB = 3,6 m',
    AM: 'AM = 6 m',
    AC: 'AC = 4,8 m',
    AN: 'AN = 7,5 m',
  }),
  'p6-exercice-d-table-schema.svg': tableSvg('Exercice D — table à cartes', {}, false),
  'p6-exercice-d-table-carte-pirate-complet.svg': tableSvg(
    'Table à cartes du capitaine',
    {},
    true,
  ),
};

for (const [name, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(outDir, name), `${svg}\n`, 'utf8');
  console.log('wrote', name);
}

// PNG via Edge
const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const edge = edgeCandidates.find((p) => fs.existsSync(p));
if (edge) {
  for (const name of Object.keys(diagrams)) {
    const svgPath = path.join(outDir, name);
    const pngPath = path.join(outDir, name.replace(/\.svg$/, '.png'));
    const htmlPath = path.join(process.env.TEMP || '/tmp', `p6-${name}.html`);
    const fileUrl = `file:///${svgPath.replace(/\\/g, '/')}`;
    fs.writeFileSync(
      htmlPath,
      `<!DOCTYPE html><html><body style="margin:0;background:${BG}"><img src="${fileUrl}" width="1080" height="700"/></body></html>`,
      'utf8',
    );
    spawnSync(
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
    if (fs.existsSync(pngPath)) console.log('png', path.basename(pngPath));
  }
}

console.log('diagrams part6 →', outDir);
