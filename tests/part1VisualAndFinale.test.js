import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { figureSvg } from '../client/js/math/render.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const scenesPath = path.join(root, 'client', 'content', 'part1', 'scenes.json');
const content = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
const raw = fs.readFileSync(scenesPath, 'utf8');

const byId = (id) => content.scenes.find((s) => s.id === id);

describe('part1 — découverte sans fuite 25/169', () => {
  it('les schémas de recherche n’affichent pas 25 ni 169 comme aires cherchées', () => {
    const disc = byId('p1_1_decouverte');
    const exercises = [];
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (n.type === 'exercise') exercises.push(n);
      if (Array.isArray(n)) n.forEach(walk);
      else Object.values(n).forEach(walk);
    };
    walk(disc);
    for (const ex of exercises) {
      if (!ex.figureLabels) continue;
      const labels = ex.figureLabels;
      // L’aire cherchée (hypoténuse) ne doit pas être 25 ni 169 avant validation
      assert.equal(labels.areaC, '?', `${ex.id} areaC`);
      assert.ok(labels.areaC !== '25' && labels.areaC !== '169', ex.id);
      const svg = figureSvg(ex.figure || 'pythagorasSquares', labels);
      // Ne pas confondre l’aire connue 5²=25 (areaA) avec l’aire cherchée
      assert.ok(!/>169</.test(svg), `${ex.id} ne doit pas afficher 169`);
      // areaC rendu comme ? (pas 25/169 sur le grand carré)
      assert.match(svg, />\?</, `${ex.id} doit afficher ? sur l’aire cherchée`);
      // Pas de 169 dans aria/title
      assert.ok(!/169/.test(svg), `${ex.id} aria/svg sans 169`);
    }
    // Schéma 3-4-5 : 25 peut être areaA (3 n’est pas 5) mais pas areaC
    const disc512 = exercises.find((e) => e.id === 'p1_disc_512');
    if (disc512) {
      assert.equal(disc512.figureLabels.areaA, '25');
      assert.equal(disc512.figureLabels.areaC, '?');
    }
  });
});

describe('part1 — leçon', () => {
  it('titre I — Théorème et formulations exactes', () => {
    assert.match(raw, /I — Théorème de Pythagore/);
    assert.match(
      raw,
      /Alors, d’après le théorème de Pythagore|Alors, d'après le théorème de Pythagore/,
    );
    assert.match(
      raw,
      /Si un triangle est rectangle, alors, d’après le théorème de Pythagore, le carré de la longueur de l’hypoténuse/,
    );
  });
});

describe('part1 — figures entraînement A/B et C/D', () => {
  const train = byId('p1_6_entrainement');
  const exercises = (train.exerciseQueue?.ids || []).map(
    (id) => train.exerciseQueue.exercises[id],
  );

  it('A et B : schémas nommés cohérents avec l’énoncé', () => {
    const a = exercises.find((e) => e.id === 'p1_train_1') || exercises[0];
    const b = exercises.find((e) => e.id === 'p1_train_2') || exercises[1];
    // ids peuvent être dans la clé plutôt que dans l’objet
    const aa = train.exerciseQueue.exercises.p1_train_1;
    const bb = train.exerciseQueue.exercises.p1_train_2;
    assert.equal(aa.figure, 'namedRightTriangle');
    assert.equal(aa.figureLabels.right, 'D');
    assert.equal(aa.figureLabels.up, 'E');
    assert.equal(aa.figureLabels.end, 'F');
    assert.equal(aa.figureLabels.sideRightUp, '9');
    assert.equal(aa.figureLabels.sideRightEnd, '12');
    assert.equal(aa.figureLabels.sideUpEnd, '?');
    const svgA = figureSvg(aa.figure, aa.figureLabels);
    assert.match(svgA, />D</);
    assert.match(svgA, />E</);
    assert.match(svgA, />F</);
    assert.match(svgA, />9</);
    assert.match(svgA, />12</);

    assert.equal(bb.figureLabels.right, 'N');
    const svgB = figureSvg(bb.figure, bb.figureLabels);
    assert.match(svgB, />N</);
    assert.match(svgB, />M</);
    assert.match(svgB, />P</);
  });

  it('C et D : pas de figure de recherche, figure en correction', () => {
    const c = train.exerciseQueue.exercises.p1_train_3;
    const d = train.exerciseQueue.exercises.p1_train_4;
    assert.ok(!c.figure);
    assert.ok(!d.figure);
    assert.equal(c.correctionFigure, 'namedRightTriangle');
    assert.equal(d.correctionFigure, 'namedRightTriangle');
    assert.match(c.correction, /d'après le théorème de Pythagore|d’après le théorème de Pythagore/);
  });
});

describe('part1 — finale remplacée', () => {
  const fin = byId('p1_7_finale');
  const exercises = fin.hotspots
    .filter((h) => h.required)
    .flatMap((h) => (h.sequence || []).filter((s) => s.type === 'exercise'));

  it('route intérieure a/b et monte-charge', () => {
    assert.equal(exercises.length, 3);
    assert.equal(exercises[0].id, 'p1_final_route_a');
    assert.equal(exercises[0].expected, 6.2);
    assert.equal(exercises[1].id, 'p1_final_route_b');
    assert.equal(exercises[1].answerType, 'radical');
    assert.equal(exercises[1].expectedRadicand, 182.25);
    assert.equal(exercises[2].id, 'p1_final_monte_charge');
    assert.equal(exercises[2].expected, 27.2);
  });

  it('trois indices Maki sans résultat final par sous-question', () => {
    for (const ex of exercises) {
      assert.equal(ex.hints.length, 3);
      for (const h of ex.hints) {
        assert.match(h.reaction, /Krii/);
        // 6,2 / 13,5 / 27,2 ne doivent pas être la réponse finale devinée
        if (ex.id === 'p1_final_route_b') {
          assert.ok(!/\b13,5\b|\b6,2\b/.test(h.text));
        } else {
          assert.ok(!/\b6,2\b|\b13,5\b|\b27,2\b/.test(h.text));
        }
      }
      assert.match(
        ex.correction,
        /d'après le théorème de Pythagore|d’après le théorème de Pythagore|losange|√182/,
      );
    }
  });

  it('anciens exercices 15-20-25 et 17-8-15 absents', () => {
    assert.ok(!raw.includes('p1_final_route"'));
    assert.ok(!raw.includes('côtés de l’angle droit 15 et 20'));
    assert.ok(!raw.includes('"expected": 25') || raw.includes('areaA": "25"'));
  });
});

describe('part1 — objets entrée et balises', () => {
  it('p1_0 utilise îlot et Nérée-carte, pas dalle flottante', () => {
    const s = byId('p1_0_arrivee');
    const basenames = (s.decor.objects || []).map((o) =>
      String(o.image).split('/').pop(),
    );
    assert.ok(basenames.includes('ile-dallage-recif.png'));
    assert.ok(basenames.includes('neree-carte-recif.png'));
    assert.ok(!basenames.includes('dalle-carree-gravee.png'));
    assert.ok(!basenames.includes('carte-recif.png'));
  });

  it('p1_1 sans dalle superposée', () => {
    const s = byId('p1_1_decouverte');
    assert.ok(!s.decor.objects || s.decor.objects.length === 0);
  });

  it('balises sans PNG superposés', () => {
    for (const id of ['p1_4_hypotenuse', 'p1_5_cote', 'p1_6_entrainement']) {
      const s = byId(id);
      assert.deepEqual(s.decor.objects || [], []);
    }
  });
});

describe('part1 — hotspots facultatifs', () => {
  it('chaque scène a au moins un hotspot optional advancesStory false', () => {
    for (const s of content.scenes) {
      const opts = (s.hotspots || []).filter((h) => h.optional);
      assert.ok(opts.length >= 1, s.id);
      assert.ok(opts.every((h) => h.advancesStory === false));
      assert.ok(opts.every((h) => h.repeatable !== false));
    }
  });
});

describe('assets exercices part1', () => {
  it('monte-charge présent', () => {
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          'client',
          'assets',
          'exercises',
          'part1',
          'exercice-monte-charge.png',
        ),
      ),
    );
  });
  it('route intérieure PNG présente', () => {
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          'client',
          'assets',
          'exercises',
          'part1',
          'exercice-route-interieure.png',
        ),
      ),
    );
    assert.match(raw, /exercice-route-interieure\.png/);
  });
  it('nouveaux objets îlot et nérée-carte présents', () => {
    assert.ok(
      fs.existsSync(
        path.join(root, 'client', 'assets', 'objects', 'part1', 'ile-dallage-recif.png'),
      ),
    );
    assert.ok(
      fs.existsSync(
        path.join(root, 'client', 'assets', 'objects', 'part1', 'neree-carte-recif.png'),
      ),
    );
  });
});

describe('part1 — formulations arrondi sans exemple révélateur', () => {
  it('prompts d’arrondi sans « Exemple : 7,6 »', () => {
    assert.ok(!raw.includes('Exemple : 7,6'));
    assert.ok(!raw.includes('Exemple : 7.6'));
    assert.match(
      raw,
      /Donne une valeur approchée au dixième à l'aide de la calculatrice\. Saisis uniquement le nombre, sans unité\./,
    );
  });
});

describe('part1 — bulle cahier Euclide (moteur)', () => {
  it('SceneEngine expose la bulle cahier', () => {
    const engineSrc = fs.readFileSync(
      path.join(root, 'client', 'js', 'engine', 'SceneEngine.js'),
      'utf8',
    );
    assert.match(
      engineSrc,
      /Vérifie que tu as écrit exactement cette correction dans ton cahier/,
    );
    assert.match(engineSrc, /euclideNotebookBubbleHtml/);
    assert.match(engineSrc, /isUiBlocking/);
    assert.match(engineSrc, /setUiBlocking/);
    assert.match(engineSrc, /replayHotspot/);
  });
});

describe('part1 — hotspots rejouables et non double progression', () => {
  it('hotspots requis portent repeatable et facultatifs advancesStory false', () => {
    for (const s of content.scenes) {
      for (const h of s.hotspots || []) {
        if (h.optional) {
          assert.equal(h.advancesStory, false, s.id + '/' + h.id);
          assert.notEqual(h.repeatable, false, s.id + '/' + h.id);
        }
      }
    }
  });

  it('corrections balises A–D commencent par la justification Pythagore', () => {
    const train = byId('p1_6_entrainement');
    const exercises = Object.entries(train.exerciseQueue.exercises).map(
      ([id, ex]) => ({ ...ex, id }),
    );
    for (const ex of exercises) {
      assert.match(
        ex.correction,
        /Donc, d'après le théorème de Pythagore|Donc, d’après le théorème de Pythagore/,
        ex.id,
      );
      assert.ok(
        !ex.correction.startsWith('L’hypoténuse est') &&
          !ex.correction.startsWith("L'hypoténuse est"),
        ex.id,
      );
    }
  });
});
