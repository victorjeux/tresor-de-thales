import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRadicalInput,
  parseRadicand,
  checkRadicalAnswer,
  validateExerciseRadical,
} from '../shared/radicalAnswer.js';

describe('radicalAnswer — √182,25', () => {
  it('accepte √182,25 et √182.25', () => {
    assert.equal(checkRadicalAnswer('√182,25', 182.25).ok, true);
    assert.equal(checkRadicalAnswer('√182.25', 182.25).ok, true);
  });

  it('accepte sqrt(182,25) et sqrt(182.25)', () => {
    assert.equal(checkRadicalAnswer('sqrt(182,25)', 182.25).ok, true);
    assert.equal(checkRadicalAnswer('sqrt(182.25)', 182.25).ok, true);
  });

  it('ignore les espaces', () => {
    assert.equal(checkRadicalAnswer('  √ 182,25  ', 182.25).ok, true);
  });

  it('refuse 13,5 (forme décimale)', () => {
    const r = checkRadicalAnswer('13,5', 182.25);
    assert.equal(r.ok, false);
    assert.match(r.reason, /radicale|√nombre|√/i);
    assert.ok(!r.reason.includes('182,25') && !r.reason.includes('182.25'));
  });

  it('refuse 13.5', () => {
    assert.equal(checkRadicalAnswer('13.5', 182.25).ok, false);
  });

  it('refuse un mauvais radicande', () => {
    assert.equal(checkRadicalAnswer('√100', 182.25).ok, false);
  });

  it('message d’erreur de format ne révèle pas √182,25', () => {
    const empty = checkRadicalAnswer('', 182.25);
    const bad = checkRadicalAnswer('xyz', 182.25);
    for (const r of [empty, bad]) {
      assert.equal(r.ok, false);
      assert.ok(!/182[,.]25/.test(r.reason || ''));
      assert.match(r.reason, /√nombre|symbole √/i);
    }
  });

  it('parseRadicand et normalize', () => {
    assert.equal(parseRadicand(normalizeRadicalInput('√182,25')), 182.25);
    assert.equal(parseRadicand(normalizeRadicalInput('SQRT(182.25)')), 182.25);
  });

  it('validateExerciseRadical', () => {
    assert.equal(
      validateExerciseRadical('√182,25', { expectedRadicand: 182.25 }).ok,
      true,
    );
  });
});
