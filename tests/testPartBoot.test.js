import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canOpenPart, completePart, initialProgress } from '../shared/progression.js';
import { resolvePartToPlay } from '../shared/partLoader.js';
import {
  repairTrainingQueueProgress,
  isQueueComplete,
  P1_TRAIN_EXERCISE_IDS,
  getNextQueueExerciseId,
} from '../shared/trainingQueue.js';
import {
  ENABLE_TEST_PART_BUTTONS,
  TEST_PSEUDO_PART1,
  TEST_PSEUDO_PART2,
  buildTestProgressPart1,
  buildTestProgressPart2,
} from '../shared/testPartBoot.js';
import {
  setExerciseInProgress,
  initialExerciseState,
} from '../shared/exerciseHelp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

describe('mode test — boutons démarrage partie 1 / 2', () => {
  it('expose un flag ENABLE_TEST_PART_BUTTONS pour masquer les boutons plus tard', () => {
    assert.equal(typeof ENABLE_TEST_PART_BUTTONS, 'boolean');
    assert.equal(ENABLE_TEST_PART_BUTTONS, true);
  });

  it('1. Mode test Partie 1 démarre sur p1_0_arrivee', () => {
    const p = buildTestProgressPart1();
    assert.equal(p.currentPartId, 'part1');
    assert.equal(p.currentSceneId, 'p1_0_arrivee');
    assert.ok(p.completedParts.includes('prologue'));
    assert.equal(canOpenPart('part1', p), true);
    assert.equal(resolvePartToPlay(p), 'part1');
  });

  it('2. Mode test Partie 2 démarre sur p2_0_arrivee_chantier', () => {
    const p = buildTestProgressPart2();
    assert.equal(p.currentPartId, 'part2');
    assert.equal(p.currentSceneId, 'p2_0_arrivee_chantier');
    assert.ok(p.completedParts.includes('prologue'));
    assert.ok(p.completedParts.includes('part1'));
    assert.equal(canOpenPart('part2', p), true);
    assert.equal(resolvePartToPlay(p), 'part2');
    assert.equal(p.flags._testBoot, 'part2');
  });

  it('3. Après réparation file, Test-Partie-2 reste sur part2 / p2_0 (pas p1_6)', () => {
    const p = buildTestProgressPart2();
    assert.equal(isQueueComplete(p, P1_TRAIN_EXERCISE_IDS), true);
    const { progress: fixed, repaired } = repairTrainingQueueProgress(p);
    assert.equal(fixed.currentPartId, 'part2');
    assert.equal(fixed.currentSceneId, 'p2_0_arrivee_chantier');
    assert.notEqual(fixed.currentSceneId, 'p1_6_entrainement');
    // repair peut être false (no-op) grâce au flag _testBoot
    assert.equal(typeof repaired, 'boolean');
  });

  it('4. Test-Partie-2 ne passe jamais par p1_6 même sans exercices (garde-fou flag)', () => {
    // Progression minimale comme l’ancien bug : part1 « terminée » sans file
    const brokenStyle = {
      currentPartId: 'part2',
      currentSceneId: 'p2_0_arrivee_chantier',
      completedParts: ['prologue', 'part1'],
      completedScenes: [],
      exercises: {},
      flags: { _testBoot: 'part2' },
    };
    const { progress: fixed } = repairTrainingQueueProgress(brokenStyle);
    assert.equal(fixed.currentPartId, 'part2');
    assert.equal(fixed.currentSceneId, 'p2_0_arrivee_chantier');
    assert.notEqual(fixed.currentSceneId, 'p1_6_entrainement');
  });

  it('5. Vraie sauvegarde part1 cassée (file incomplète) est encore réparée vers p1_6', () => {
    let p = {};
    p = setExerciseInProgress(p, 'p1_train_1', {
      ...initialExerciseState(),
      succeeded: true,
    });
    p = setExerciseInProgress(p, 'p1_train_4', {
      ...initialExerciseState(),
      succeeded: true,
    });
    p = {
      ...p,
      completedScenes: ['p1_6_entrainement', 'p1_7_finale'],
      completedParts: ['prologue', 'part1'],
      currentPartId: 'part2',
      currentSceneId: null,
      // pas de _testBoot → élève réel
    };
    const { progress: fixed, repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, true);
    assert.equal(fixed.currentSceneId, 'p1_6_entrainement');
    assert.equal(fixed.currentPartId, 'part1');
    assert.equal(getNextQueueExerciseId(fixed), 'p1_train_2');
  });

  it('6. Parcours normal fin part1 → part2 fonctionne toujours', () => {
    let p = completePart(initialProgress(), 'prologue');
    p = completePart(p, 'part1');
    assert.equal(p.currentPartId, 'part2');
    assert.equal(canOpenPart('part2', p), true);
    assert.equal(resolvePartToPlay(p), 'part2');
    const main = fs.readFileSync(path.join(root, 'client/js/main.js'), 'utf8');
    assert.match(main, /playPart\('part2'/);
    assert.match(main, /Partie 3 — Triangles semblables/);
  });

  it('utilise des pseudos de test dédiés (pas les profils élèves)', () => {
    assert.equal(TEST_PSEUDO_PART1, 'Test-Partie-1');
    assert.equal(TEST_PSEUDO_PART2, 'Test-Partie-2');
  });

  it('écran d’accueil conditionne les boutons au flag + commentaires TEMP', () => {
    const src = fs.readFileSync(
      path.join(root, 'client/js/ui/screens.js'),
      'utf8',
    );
    assert.match(src, /TEMP TEST ONLY - remove before final release/);
    assert.match(src, /ENABLE_TEST_PART_BUTTONS/);
    assert.match(src, /Mode test — Partie 1/);
    assert.match(src, /Mode test — Partie 2/);
    assert.match(src, /btn-test-part1/);
    assert.match(src, /btn-test-part2/);
    assert.match(src, /buildTestProgressPart1/);
    assert.match(src, /buildTestProgressPart2/);
    assert.match(src, /id="btn-start"/);
    assert.match(src, /Embarquer/);
  });

  it('module partagé documente le flag pour la version finale', () => {
    const src = fs.readFileSync(
      path.join(root, 'shared/testPartBoot.js'),
      'utf8',
    );
    assert.match(src, /TEMP TEST ONLY - remove before final release/);
    assert.match(src, /ENABLE_TEST_PART_BUTTONS/);
    assert.match(src, /markPart1TrainingCompleteForTest/);
  });

  it('file A–D marquée complète dans le boot test part2', () => {
    const p = buildTestProgressPart2();
    for (const id of P1_TRAIN_EXERCISE_IDS) {
      assert.equal(p.exercises[id]?.succeeded, true, id);
    }
    assert.ok(p.completedScenes.includes('p1_6_entrainement'));
    assert.ok(p.completedScenes.includes('p1_7_finale'));
  });
});
