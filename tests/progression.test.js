import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canOpenPart,
  completePart,
  setCurrentScene,
  initialProgress,
  PART_ORDER,
  nextPartId,
} from '../shared/progression.js';

describe('progression linéaire', () => {
  it('expose l’ordre définitif des 7 parties + prologue', () => {
    assert.deepEqual(PART_ORDER, [
      'prologue',
      'part1',
      'part2',
      'part3',
      'part4',
      'part5',
      'part6',
      'part7',
    ]);
  });

  it('autorise le prologue au départ', () => {
    const p = initialProgress();
    assert.equal(canOpenPart('prologue', p), true);
    assert.equal(canOpenPart('part1', p), false);
  });

  it('débloque part1 seulement après prologue', () => {
    let p = initialProgress();
    p = completePart(p, 'prologue');
    assert.equal(canOpenPart('part1', p), true);
    assert.equal(canOpenPart('part2', p), false);
    assert.equal(p.currentPartId, 'part1');
  });

  it('part2 = réciproque de Pythagore (pas Thalès)', () => {
    assert.equal(nextPartId('part1'), 'part2');
  });

  it('interdit de sauter des parties', () => {
    const p = {
      completedParts: ['prologue'],
      currentPartId: 'part1',
    };
    assert.equal(canOpenPart('part3', p), false);
    assert.equal(canOpenPart('part7', p), false);
  });

  it('autorise les parties demo pour le moteur', () => {
    assert.equal(canOpenPart('demo', initialProgress()), true);
    assert.equal(canOpenPart('demo_engine', {}), true);
  });

  it('setCurrentScene refuse une partie verrouillée', () => {
    const p = initialProgress();
    const r = setCurrentScene(p, 'part2', 'scene_x');
    assert.equal(r.ok, false);
  });

  it('setCurrentScene accepte une partie ouverte', () => {
    let p = completePart(initialProgress(), 'prologue');
    const r = setCurrentScene(p, 'part1', 'p1_s1');
    assert.equal(r.ok, true);
    assert.equal(r.progress.currentSceneId, 'p1_s1');
  });
});
