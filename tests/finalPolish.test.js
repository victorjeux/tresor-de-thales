import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const p1 = JSON.parse(
  fs.readFileSync(path.join(root, 'client/content/part1/scenes.json'), 'utf8'),
);
const prol = JSON.parse(
  fs.readFileSync(
    path.join(root, 'client/content/prologue/scenes.json'),
    'utf8',
  ),
);
const engineSrc = fs.readFileSync(
  path.join(root, 'client/js/engine/SceneEngine.js'),
  'utf8',
);
const byId = (id) => p1.scenes.find((s) => s.id === id);

function walkQuizzes(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (node.type === 'quiz') acc.push(node);
  if (Array.isArray(node)) node.forEach((n) => walkQuizzes(n, acc));
  else Object.values(node).forEach((n) => walkQuizzes(n, acc));
  return acc;
}

function rectsOverlap(a, b, maxRatio = 0.35) {
  const ax1 = a.x - a.w / 2;
  const ax2 = a.x + a.w / 2;
  const ay1 = a.y - a.h / 2;
  const ay2 = a.y + a.h / 2;
  const bx1 = b.x - b.w / 2;
  const bx2 = b.x + b.w / 2;
  const by1 = b.y - b.h / 2;
  const by2 = b.y + b.h / 2;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const inter = ix * iy;
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const ratio = inter / Math.min(areaA, areaB);
  return ratio > maxRatio;
}

describe('polish — Silas feu de camp', () => {
  const fin = byId('p1_7_finale');
  const silasHs = fin.hotspots.filter((h) => (h.stages || []).includes('silas'));

  it('asset feu de camp présent', () => {
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          'client/assets/objects/part1/ancien-feu-de-camp-indice.png',
        ),
      ),
    );
  });

  it('objet feu de camp dans le décor silas', () => {
    const objs = fin.decor.stages.silas.objects || [];
    assert.ok(objs.some((o) => String(o.image).includes('feu-de-camp')));
  });

  it('hotspot feu de camp aligné bas-droite + dialogue', () => {
    const feu = silasHs.find((h) => h.id === 'silas_traces');
    assert.match(feu.label, /feu de camp/i);
    assert.ok(feu.x >= 75);
    assert.ok(feu.y >= 75);
    assert.match(feu.lines[0].text, /braises|noircies|Silas/i);
    assert.equal(feu.silasDiscovery, true);
  });

  it('pas de fort chevauchement entre les 3 hotspots silas', () => {
    for (let i = 0; i < silasHs.length; i += 1) {
      for (let j = i + 1; j < silasHs.length; j += 1) {
        assert.ok(
          !rectsOverlap(silasHs[i], silasHs[j]),
          `${silasHs[i].id} vs ${silasHs[j].id}`,
        );
      }
    }
  });

  it('trois découvertes silas toujours présentes', () => {
    const ids = silasHs.map((h) => h.id).sort();
    assert.deepEqual(ids.sort(), [
      'opt_empreintes_p7',
      'silas_passage',
      'silas_traces',
    ].sort());
  });
});

describe('polish — notation [AB] côtés', () => {
  it('QCM hypoténuse utilisent des crochets', () => {
    const quizzes = walkQuizzes(p1).filter((q) =>
      /hypoténuse/i.test(q.question || ''),
    );
    assert.ok(quizzes.length >= 2);
    for (const q of quizzes) {
      for (const opt of q.options || []) {
        // options de segment : [BC] ou « Le côté [BC] »
        if (/côté|hypoténuse|^\[?[A-Z]{2}\]?$/.test(opt.text)) {
          assert.match(
            opt.text,
            /\[([A-Z]{2,3})\]/,
            `${q.id}: ${opt.text}`,
          );
        }
      }
    }
  });

  it('mesures AB = et formules AB² non cassées', () => {
    const raw = fs.readFileSync(
      path.join(root, 'client/content/part1/scenes.json'),
      'utf8',
    );
    assert.match(raw, /AB = 7 cm|AB = 1,5/);
    assert.match(raw, /BC\^\{2\} = AB\^\{2\}/);
    assert.ok(!/triangle \[ABC\]/.test(raw));
    assert.ok(!/\[AB\]\^\{2\}/.test(raw));
  });

  it('longueur de l’hypoténuse [EF]', () => {
    const train = byId('p1_6_entrainement');
    const a = train.exerciseQueue.exercises.p1_train_1;
    assert.match(a.prompt, /hypoténuse \[EF\]/);
  });
});

describe('polish — schémas sans crochets, encrier, message racine', () => {
  it('figureLabels de vérification : AB sans crochets', () => {
    const v = byId('p1_3_verification');
    const quizzes = walkQuizzes(v);
    for (const q of quizzes) {
      if (!q.figureLabels) continue;
      for (const [k, val] of Object.entries(q.figureLabels)) {
        if (typeof val === 'string' && /[A-Z]{2}/.test(val)) {
          assert.ok(
            !/\[[A-Z]{2,3}\]/.test(val),
            `figureLabels.${k}=${val}`,
          );
        }
      }
    }
  });

  it('options QCM gardent les crochets [BC]', () => {
    const v = byId('p1_3_verification');
    const q = walkQuizzes(v).find((x) => x.id === 'p1_verif_hyp');
    assert.ok(q.options.some((o) => /\[BC\]/.test(o.text)));
  });

  it('encrier plus haut (près de la plume)', () => {
    const enc = byId('p1_3_verification').hotspots.find(
      (h) => h.id === 'opt_encrier_p3',
    );
    assert.ok(enc.y <= 55, `y=${enc.y} trop bas`);
    assert.ok(enc.x >= 65 && enc.x <= 85);
  });
});

describe('polish — boussole cours', () => {
  it('hotspot boussole présent avec phrase Madagascar / théorème', () => {
    const p2 = byId('p1_2_cours');
    const b = p2.hotspots.find((h) => h.id === 'opt_boussole_p2');
    assert.ok(b);
    assert.equal(b.optional, true);
    assert.equal(b.advancesStory, false);
    assert.ok(b.repeatable !== false);
    assert.match(b.lines[0].text, /Madagascar/);
    assert.match(b.lines[0].text, /théorème|aiguille/i);
    assert.ok(b.x < 35, 'à gauche sur la table');
  });
});

describe('polish — prologue parchemin / dialogues', () => {
  it('cabine : 4 objets required, next p4_lettre', () => {
    const cab = prol.scenes.find((s) => s.id === 'p3_cabine');
    const req = cab.hotspots.filter((h) => h.required);
    assert.equal(req.length, 4);
    assert.equal(cab.next, 'p4_lettre');
  });

  it('lettre multi-phases lue en un seul dialogue (moteur)', () => {
    assert.match(engineSrc, /flatMap\(\(p\) => p\.lines/);
    assert.match(
      engineSrc,
      /runStep[\s\S]{0,80}lines: allLines/,
    );
  });

  it('dialogues lines attendent la fermeture avant tryAdvance', () => {
    // runStep pour les hotspots à lines (pas playDialogue nu)
    assert.match(
      engineSrc,
      /hotspot\.lines && hotspot\.lines\.length[\s\S]{0,400}await this\.runStep/,
    );
  });

  it('lettre p4 a nextSceneId et phases', () => {
    const lettre = prol.scenes.find((s) => s.id === 'p4_lettre');
    const h = lettre.hotspots.find((x) => x.id === 'lettre');
    assert.ok(h.phases.length >= 3);
    assert.equal(h.nextSceneId, 'p5_serment');
  });
});
