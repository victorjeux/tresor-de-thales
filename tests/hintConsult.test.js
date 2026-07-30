import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initialProgress } from '../shared/progression.js';
import {
  emptyIndicesConsultes,
  normalizeIndicesConsultes,
  ensureIndicesConsultes,
  recordHintConsulted,
  markHintConsulted,
  makeHintConsultId,
  getIndicesConsultesTotal,
  teacherHintSummary,
} from '../shared/hintConsult.js';
import {
  initialExerciseState,
  registerAttempt,
  useHint,
  isHintAvailable,
} from '../shared/exerciseHelp.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

describe('indicesConsultes — suivi prof des indices ouverts', () => {
  it('1. un profil neuf a total=0, uniques vide, historique vide', () => {
    const p = initialProgress();
    assert.ok(p.indicesConsultes);
    assert.equal(p.indicesConsultes.total, 0);
    assert.deepEqual(p.indicesConsultes.uniques, {});
    assert.deepEqual(p.indicesConsultes.historique, []);
    assert.equal(getIndicesConsultesTotal(p), 0);
  });

  it('2. affichage d’un indice pédagogique : total 0→1, id + historique scène/partie', () => {
    let p = initialProgress();
    p = {
      ...p,
      currentPartId: 'part1',
      currentSceneId: 'p1_4_hypotenuse',
    };
    const id = makeHintConsultId('p1_4_hypotenuse', 1);
    const r = recordHintConsulted(p, {
      id,
      exerciseId: 'p1_4_hypotenuse',
      hintLevel: 1,
      sceneId: 'p1_4_hypotenuse',
      partId: 'part1',
      label: 'Indice de Maki',
      timestamp: '2026-07-22T12:00:00.000Z',
    });
    assert.equal(r.isNew, true);
    assert.equal(r.total, 1);
    assert.equal(r.progress.indicesConsultes.total, 1);
    assert.equal(r.progress.indicesConsultes.uniques[id], true);
    assert.equal(r.progress.indicesConsultes.historique.length, 1);
    const h = r.progress.indicesConsultes.historique[0];
    assert.equal(h.id, id);
    assert.equal(h.sceneId, 'p1_4_hypotenuse');
    assert.equal(h.partId, 'part1');
    assert.equal(h.label, 'Indice de Maki');
  });

  it('3. même indice consulté deux fois → total reste 1', () => {
    let p = initialProgress();
    const info = {
      exerciseId: 'p1_4_hypotenuse',
      hintLevel: 1,
      sceneId: 'p1_4_hypotenuse',
      partId: 'part1',
      label: 'Indice de Maki',
    };
    const r1 = recordHintConsulted(p, info);
    const r2 = recordHintConsulted(r1.progress, info);
    assert.equal(r1.total, 1);
    assert.equal(r2.isNew, false);
    assert.equal(r2.total, 1);
    assert.equal(r2.progress.indicesConsultes.historique.length, 1);
  });

  it('4. deux indices différents → total passe à 2', () => {
    let p = initialProgress();
    p = recordHintConsulted(p, {
      exerciseId: 'p1_4_hypotenuse',
      hintLevel: 1,
      sceneId: 'p1_4_hypotenuse',
      partId: 'part1',
    }).progress;
    p = recordHintConsulted(p, {
      exerciseId: 'p1_5_cote_droit',
      hintLevel: 2,
      sceneId: 'p1_5_cote_droit',
      partId: 'part1',
    }).progress;
    assert.equal(p.indicesConsultes.total, 2);
    assert.equal(
      p.indicesConsultes.uniques['p1_4_hypotenuse_indice_1'],
      true,
    );
    assert.equal(
      p.indicesConsultes.uniques['p1_5_cote_droit_indice_2'],
      true,
    );
  });

  it('5. indice débloqué mais non ouvert → ne modifie pas total', () => {
    let s = initialExerciseState();
    s = registerAttempt(s, false);
    s = registerAttempt(s, false);
    // Indice 1 débloqué, pas encore useHint / affichage
    assert.equal(isHintAvailable(s, 1), true);
    assert.deepEqual(s.hintsUsed, []);

    let p = initialProgress();
    // Simuler état exercice débloqué sans consultation
    p = {
      ...p,
      exercises: {
        p1_4_hypotenuse: s,
      },
    };
    assert.equal(getIndicesConsultesTotal(p), 0);

    // useHint seul (logique pédago) n’écrit pas indicesConsultes
    const used = useHint(s, 1);
    assert.equal(used.ok, true);
    // Sans recordHintConsulted, le total reste 0
    assert.equal(getIndicesConsultesTotal(p), 0);
  });

  it('6. F5 / recharge du profil conserve le nombre d’indices consultés', () => {
    let p = initialProgress();
    p = recordHintConsulted(p, {
      exerciseId: 'ex_a',
      hintLevel: 1,
      sceneId: 'scene_a',
      partId: 'part1',
    }).progress;
    p = recordHintConsulted(p, {
      exerciseId: 'ex_b',
      hintLevel: 1,
      sceneId: 'scene_b',
      partId: 'part1',
    }).progress;
    assert.equal(p.indicesConsultes.total, 2);

    // Simuler sérialisation / restauration (F5 via progress_json)
    const restored = JSON.parse(JSON.stringify(p));
    const mig = ensureIndicesConsultes(restored);
    assert.equal(mig.progress.indicesConsultes.total, 2);
    assert.equal(
      Object.keys(mig.progress.indicesConsultes.uniques).length,
      2,
    );
  });

  it('7. anciens profils sans indicesConsultes sont migrés sans erreur', () => {
    const legacy = {
      currentPartId: 'part1',
      currentSceneId: 'p1_2',
      completedParts: ['prologue'],
      completedScenes: ['p1_0'],
      flags: { sawLetter: true },
    };
    assert.equal(legacy.indicesConsultes, undefined);
    const { progress, migrated } = ensureIndicesConsultes(legacy);
    assert.equal(migrated, true);
    assert.equal(progress.indicesConsultes.total, 0);
    assert.deepEqual(progress.indicesConsultes.uniques, {});
    assert.deepEqual(progress.indicesConsultes.historique, []);
    // Autres champs préservés
    assert.equal(progress.currentPartId, 'part1');
    assert.deepEqual(progress.completedParts, ['prologue']);
    assert.equal(progress.flags.sawLetter, true);

    // Re-migration idempotente
    const again = ensureIndicesConsultes(progress);
    assert.equal(again.progress.indicesConsultes.total, 0);
  });

  it('8. objets d’ambiance (ex. boussole) ne sont pas comptés comme indices pédagogiques', () => {
    // La boussole / hotspots narratifs n’appellent jamais recordHintConsulted
    // ni makeHintConsultId — ils passent par sceneHotspots / phases.
    let p = initialProgress();
    p = {
      ...p,
      sceneHotspots: {
        p1_1_pont: { boussole: { interacted: true } },
      },
      flags: { boussoleOpened: true },
    };
    assert.equal(getIndicesConsultesTotal(p), 0);

    // Seul un vrai affichage Maki incrémente
    p = recordHintConsulted(p, {
      exerciseId: 'p1_4_hypotenuse',
      hintLevel: 1,
      label: 'Indice de Maki',
    }).progress;
    assert.equal(getIndicesConsultesTotal(p), 1);
  });

  it('markHintConsulted est un alias de recordHintConsulted', () => {
    let p = initialProgress();
    const r = markHintConsulted(p, 'p1_x_indice_1', {
      sceneId: 'p1_x',
      partId: 'part1',
      label: 'Indice de Maki',
    });
    assert.equal(r.isNew, true);
    assert.equal(r.total, 1);
    assert.equal(r.progress.indicesConsultes.uniques['p1_x_indice_1'], true);
  });

  it('normalizeIndicesConsultes recalcule total depuis uniques', () => {
    const n = normalizeIndicesConsultes({
      total: 99,
      uniques: { a: true, b: true },
      historique: [],
    });
    assert.equal(n.total, 2);
    assert.deepEqual(emptyIndicesConsultes(), {
      total: 0,
      uniques: {},
      historique: [],
    });
  });

  it('teacherHintSummary expose total pour l’API prof', () => {
    let p = initialProgress();
    p = recordHintConsulted(p, {
      exerciseId: 'ex1',
      hintLevel: 1,
      sceneId: 's1',
      partId: 'part1',
    }).progress;
    const s = teacherHintSummary(p);
    assert.equal(s.total, 1);
    assert.ok(s.uniques['ex1_indice_1']);
  });

  it('SceneEngine appelle noteMakiHintDisplayed à l’ouverture Maki', () => {
    const enginePath = path.join(root, 'client/js/engine/SceneEngine.js');
    const src = fs.readFileSync(enginePath, 'utf8');
    assert.match(src, /noteMakiHintDisplayed/);
    assert.match(src, /recordHintConsulted/);
    assert.match(src, /ensureIndicesConsultes/);
    // Ne compte pas au déblocage seul
    assert.match(src, /Comptage prof uniquement à l’affichage/);
  });

  it('API teacher/summary est exposée', () => {
    const apiPath = path.join(root, 'server/routes/api.js');
    const src = fs.readFileSync(apiPath, 'utf8');
    assert.match(src, /\/teacher\/summary/);
    assert.match(src, /indicesConsultes/);
  });
});
