import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateQuizOption,
  canRetryQuiz,
  simulateQuizAttempts,
} from '../shared/quizLogic.js';

const coffreOptions = [
  { text: 'L’épée', correct: false },
  { text: 'La pièce', correct: false },
  { text: 'Le compas', correct: true },
];

describe('QCM noté — erreurs non bloquantes', () => {
  it('une mauvaise réponse n’avance pas et n’empêche pas de retenter', () => {
    const r = evaluateQuizOption(coffreOptions[0], {});
    assert.equal(r.isCorrect, false);
    assert.equal(r.advances, false);
    assert.equal(r.blocksFurther, false);
    assert.equal(canRetryQuiz({ solved: false }), true);
  });

  it('mauvaise puis bonne réponse : progression uniquement après la bonne', () => {
    const sim = simulateQuizAttempts(coffreOptions, [0, 2], {});
    assert.equal(sim.log[0].isCorrect, false);
    assert.equal(sim.log[0].advances, false);
    assert.equal(sim.log[1].isCorrect, true);
    assert.equal(sim.log[1].advances, true);
    assert.equal(sim.solved, true);
    assert.equal(sim.advanced, true);
    assert.equal(sim.canRetry, false);
  });

  it('deux mauvaises réponses successives restent non bloquantes', () => {
    const sim = simulateQuizAttempts(coffreOptions, [0, 1], {});
    assert.equal(sim.solved, false);
    assert.equal(sim.advanced, false);
    assert.equal(sim.canRetry, true);
    assert.equal(sim.log.every((e) => e.advances === false), true);
  });

  it('impossible de progresser sans la bonne réponse', () => {
    const sim = simulateQuizAttempts(coffreOptions, [0, 1, 0], {});
    assert.equal(sim.advanced, false);
    assert.equal(sim.solved, false);
  });

  it('après la bonne réponse, les tentatives suivantes sont rejetées', () => {
    const sim = simulateQuizAttempts(coffreOptions, [2, 0], {});
    assert.equal(sim.log[0].advances, true);
    assert.equal(sim.log[1].rejected, true);
  });
});

describe('QCM narratif', () => {
  it('toute option fait progresser', () => {
    const opts = [
      { text: 'A' },
      { text: 'B' },
      { text: 'C' },
    ];
    const sim = simulateQuizAttempts(opts, [2], { allowAny: true });
    assert.equal(sim.advanced, true);
    assert.equal(sim.log[0].isCorrect, true);
  });
});
