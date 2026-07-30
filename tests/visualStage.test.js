import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getVisualStage,
  setVisualStage,
  resolveDecorForStage,
  P1_FINALE_STAGES,
} from '../shared/visualStage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const part1Scenes = path.join(
  root,
  'client',
  'content',
  'part1',
  'scenes.json',
);
const bgDir = path.join(root, 'client', 'assets', 'backgrounds', 'part1');

describe('stades visuels', () => {
  it('persiste le stade dans progress.visualStages', () => {
    let p = {};
    p = setVisualStage(p, 'p1_7_finale', 'interieur');
    assert.equal(getVisualStage(p, 'p1_7_finale'), 'interieur');
    p = setVisualStage(p, 'p1_7_finale', 'silas');
    assert.equal(getVisualStage(p, 'p1_7_finale'), 'silas');
  });

  it('résout le décor selon le stade', () => {
    const decor = {
      background: '/assets/backgrounds/part1/p1-passage-exterieur.png',
      initialStage: 'exterieur',
      stages: {
        exterieur: {
          background: '/a.png',
          objects: [],
        },
        interieur: {
          background: '/b.png',
          objects: [{ image: '/x.png', x: 1, y: 2 }],
        },
      },
    };
    const r0 = resolveDecorForStage(decor, null);
    assert.equal(r0.background, '/a.png');
    const r1 = resolveDecorForStage(decor, 'interieur');
    assert.equal(r1.background, '/b.png');
    assert.equal(r1.objects.length, 1);
  });

  it('définit les quatre stades de p1_7_finale dans le contenu', () => {
    const content = JSON.parse(fs.readFileSync(part1Scenes, 'utf8'));
    const fin = content.scenes.find((s) => s.id === 'p1_7_finale');
    assert.ok(fin.decor.stages);
    for (const id of P1_FINALE_STAGES) {
      assert.ok(fin.decor.stages[id], id);
      assert.match(fin.decor.stages[id].background, new RegExp(id === 'exterieur'
        ? 'passage-exterieur'
        : id === 'interieur'
          ? 'passage-interieur'
          : id === 'fragment'
            ? 'sanctuaire-fragment'
            : 'trace-silas'));
    }
    const allSteps = fin.hotspots.flatMap((h) => h.sequence || []);
    const routeA = allSteps.find((s) => s.id === 'p1_final_route_a');
    const routeB = allSteps.find((s) => s.id === 'p1_final_route_b');
    const monte = allSteps.find((s) => s.id === 'p1_final_monte_charge');
    const fragDlg = allSteps.find(
      (s) => s.type === 'dialogue' && s.setVisualStage === 'silas',
    );
    assert.ok(!routeA.setVisualStage, 'a reste extérieur');
    assert.equal(routeB.setVisualStage, 'interieur');
    assert.equal(monte.setVisualStage, 'fragment');
    assert.ok(fragDlg, 'dialogue fragment → silas');
  });
});

describe('références décors part1 dans le contenu', () => {
  const content = JSON.parse(fs.readFileSync(part1Scenes, 'utf8'));
  const expected = {
    p1_0_arrivee: 'p1-entree-recif.png',
    p1_1_decouverte: 'p1-dallage-pythagore.png',
    p1_2_cours: 'p1-table-carnet.png',
    p1_3_verification: 'p1-table-carnet.png',
    p1_4_hypotenuse: 'p1-balises-entrainement.png',
    p1_5_cote: 'p1-balises-entrainement.png',
    p1_6_entrainement: 'p1-balises-entrainement.png',
  };

  it('chaque scène référence le décor p1 attendu', () => {
    for (const [id, file] of Object.entries(expected)) {
      const sc = content.scenes.find((s) => s.id === id);
      assert.match(sc.decor.background, new RegExp(file.replace('.', '\\.')));
    }
  });

  it('liste les huit décors attendus (présence disque si fournis)', () => {
    const eight = [
      'p1-entree-recif.png',
      'p1-dallage-pythagore.png',
      'p1-table-carnet.png',
      'p1-balises-entrainement.png',
      'p1-passage-exterieur.png',
      'p1-passage-interieur.png',
      'p1-sanctuaire-fragment.png',
      'p1-trace-silas.png',
    ];
    const present = eight.filter((f) =>
      fs.existsSync(path.join(bgDir, f)),
    );
    // Documente le résultat : 0 si pack non fourni, 8 si pack complet
    assert.ok(present.length === 0 || present.length === 8,
      `Décors part1 présents: ${present.length}/8 (${present.join(', ') || 'aucun'})`);
    // Le contenu les référence toujours
    const raw = fs.readFileSync(part1Scenes, 'utf8');
    for (const f of eight) {
      assert.match(raw, new RegExp(f.replace('.', '\\.')));
    }
  });
});

describe('p1_3_verification — pas de révélation immédiate', () => {
  const content = JSON.parse(fs.readFileSync(part1Scenes, 'utf8'));
  const ver = content.scenes.find((s) => s.id === 'p1_3_verification');
  const quizzes = ver.hotspots[0].sequence.filter((s) => s.type === 'quiz');

  it('active progressiveHelp et indices Maki', () => {
    assert.equal(quizzes.length, 3);
    for (const q of quizzes) {
      assert.equal(q.progressiveHelp, true);
      assert.ok(q.hints?.length === 3);
      assert.ok(q.correction);
      for (const h of q.hints) {
        assert.match(h.reaction || '', /Krii/i);
      }
    }
  });

  it('les mauvaises options n’exposent pas la solution', () => {
    for (const q of quizzes) {
      for (const opt of q.options.filter((o) => !o.correct)) {
        const exp = opt.explanation || '';
        assert.match(exp, /Relis ton cahier/i);
        assert.ok(!/donc|BC est|égalité correcte|sommet est|réponse est/i.test(exp));
      }
    }
  });
});
