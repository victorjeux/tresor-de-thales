import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNumericInput,
  checkNumericAnswer,
  validateExerciseNumeric,
} from '../shared/numericAnswer.js';

describe('parseNumericInput', () => {
  it('accepte le point décimal', () => {
    assert.equal(parseNumericInput('3.5'), 3.5);
  });

  it('accepte la virgule décimale', () => {
    assert.equal(parseNumericInput('3,5'), 3.5);
  });

  it('ignore les espaces', () => {
    assert.equal(parseNumericInput(' 12 '), 12);
  });

  it('refuse le texte non numérique', () => {
    assert.equal(parseNumericInput('abc'), null);
    assert.equal(parseNumericInput('5cm'), null);
  });
});

describe('checkNumericAnswer', () => {
  it('valide une réponse exacte', () => {
    const r = checkNumericAnswer('5', 5, 0);
    assert.equal(r.ok, true);
    assert.equal(r.parsed, 5);
  });

  it('accepte virgule pour un décimal attendu', () => {
    const r = checkNumericAnswer('2,5', 2.5, 0);
    assert.equal(r.ok, true);
  });

  it('applique la tolérance d’arrondi', () => {
    const r = checkNumericAnswer('3,14', Math.PI, 0.01);
    assert.equal(r.ok, true);
  });

  it('refuse hors tolérance', () => {
    const r = checkNumericAnswer('3,14', Math.PI, 0.0001);
    assert.equal(r.ok, false);
  });

  it('tolérance définissable par exercice', () => {
    const ex = { expected: 5.0, tolerance: 0.05 };
    assert.equal(validateExerciseNumeric('4,96', ex).ok, true);
    assert.equal(validateExerciseNumeric('4,9', ex).ok, false);
  });
});
