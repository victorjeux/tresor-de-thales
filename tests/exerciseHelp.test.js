import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialExerciseState,
  unlockedHintCount,
  isCorrectionUnlockedByErrors,
  registerAttempt,
  useHint,
  isHintAvailable,
  getExerciseFromProgress,
  setExerciseInProgress,
  HELP_THRESHOLDS,
  neutralErrorMessage,
} from '../shared/exerciseHelp.js';

describe('politique d’aide progressive', () => {
  it('aucun indice avant 2 erreurs', () => {
    assert.equal(unlockedHintCount(0), 0);
    assert.equal(unlockedHintCount(1), 0);
    assert.equal(unlockedHintCount(2), 1);
    assert.equal(unlockedHintCount(3), 2);
    assert.equal(unlockedHintCount(4), 3);
    assert.equal(unlockedHintCount(5), 3);
  });

  it('débloque les indices après 2, 3 et 4 erreurs', () => {
    let s = initialExerciseState();
    s = registerAttempt(s, false);
    assert.equal(s.hintsUnlocked, 0);
    s = registerAttempt(s, false);
    assert.equal(s.hintsUnlocked, 1);
    assert.equal(isHintAvailable(s, 1), true);
    assert.equal(isHintAvailable(s, 2), false);
    s = registerAttempt(s, false);
    assert.equal(s.hintsUnlocked, 2);
    s = registerAttempt(s, false);
    assert.equal(s.hintsUnlocked, 3);
  });

  it('n’affiche pas la correction avant 5 erreurs', () => {
    let s = initialExerciseState();
    for (let i = 0; i < 4; i += 1) s = registerAttempt(s, false);
    assert.equal(s.correctionUnlocked, false);
    assert.equal(isCorrectionUnlockedByErrors(4), false);
    s = registerAttempt(s, false);
    assert.equal(s.correctionUnlocked, true);
    assert.equal(isCorrectionUnlockedByErrors(5), true);
  });

  it('affiche la correction après réussite même sans 5 erreurs', () => {
    let s = initialExerciseState();
    s = registerAttempt(s, false);
    s = registerAttempt(s, true);
    assert.equal(s.succeeded, true);
    assert.equal(s.correctionUnlocked, true);
    assert.equal(s.correctionShown, true);
  });

  it('refuse d’utiliser un indice non débloqué', () => {
    const s = initialExerciseState();
    const r = useHint(s, 1);
    assert.equal(r.ok, false);
  });

  it('enregistre l’utilisation d’un indice débloqué', () => {
    let s = initialExerciseState();
    s = registerAttempt(s, false);
    s = registerAttempt(s, false);
    const r = useHint(s, 1);
    assert.equal(r.ok, true);
    assert.deepEqual(r.state.hintsUsed, [1]);
  });

  it('message d’erreur neutre sans solution', () => {
    const msg = neutralErrorMessage(1);
    assert.match(msg, /Réessaie/i);
    assert.ok(!/donc|égal|√|racine/i.test(msg));
  });

  it('persiste l’état dans progress.exercises', () => {
    let progress = {};
    let s = registerAttempt(initialExerciseState(), false);
    s = registerAttempt(s, false);
    progress = setExerciseInProgress(progress, 'ex_demo', s);
    const loaded = getExerciseFromProgress(progress, 'ex_demo');
    assert.equal(loaded.wrongAttempts, 2);
    assert.equal(loaded.hintsUnlocked, 1);
  });

  it('expose les seuils officiels', () => {
    assert.equal(HELP_THRESHOLDS.hint1AfterWrong, 2);
    assert.equal(HELP_THRESHOLDS.correctionAfterWrong, 5);
    assert.equal(HELP_THRESHOLDS.maxHints, 3);
  });
});
