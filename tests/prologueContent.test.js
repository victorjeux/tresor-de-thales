import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canOpenPart, completePart, initialProgress } from '../shared/progression.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prologuePath = path.join(
  __dirname,
  '..',
  'client',
  'content',
  'prologue',
  'scenes.json',
);

describe('contenu prologue', () => {
  const raw = fs.readFileSync(prologuePath, 'utf8');
  const content = JSON.parse(raw);

  it('contient exactement 7 scènes linéaires P0–P6', () => {
    assert.equal(content.meta.partId, 'prologue');
    assert.equal(content.meta.sceneOrder.length, 7);
    assert.equal(content.scenes.length, 7);
    assert.deepEqual(content.meta.sceneOrder, [
      'p0_port',
      'p1_chaloupe',
      'p2_pont',
      'p3_cabine',
      'p4_lettre',
      'p5_serment',
      'p6_depart',
    ]);
  });

  it('chaque scène exige une interaction (pas d’auto-start)', () => {
    for (const scene of content.scenes) {
      assert.notEqual(scene.requireInteraction, false);
      assert.ok((scene.hotspots || []).length > 0, scene.id);
    }
  });

  it('la porte du pont exige 3 indices examinés', () => {
    const pont = content.scenes.find((s) => s.id === 'p2_pont');
    const porte = pont.hotspots.find((h) => h.id === 'porte');
    assert.equal(porte.unlockAfterExamined, 3);
    const exams = pont.hotspots.filter((h) => h.exam);
    assert.ok(exams.length >= 4);
  });

  it('le QCM du coffre a une seule bonne réponse (compas)', () => {
    const cabine = content.scenes.find((s) => s.id === 'p3_cabine');
    const coffre = cabine.hotspots.find((h) => h.id === 'coffre');
    const quiz = coffre.sequence.find((s) => s.type === 'quiz');
    const corrects = quiz.options.filter((o) => o.correct);
    assert.equal(corrects.length, 1);
    assert.match(corrects[0].text, /compas/i);
    assert.equal(quiz.allowAny, undefined);
  });

  it('utilise {{playerName}} dans au moins un dialogue', () => {
    assert.match(raw, /\{\{playerName\}\}/);
  });

  it('annonce la fin vers la partie 1 sans menu', () => {
    assert.match(content.meta.endMessage, /récif des Angles droits/i);
  });
});

describe('progression après prologue', () => {
  it('débloque part1 uniquement après prologue terminé', () => {
    let p = initialProgress();
    assert.equal(canOpenPart('part1', p), false);
    p = completePart(p, 'prologue');
    assert.equal(canOpenPart('part1', p), true);
    assert.equal(p.currentPartId, 'part1');
    assert.equal(canOpenPart('part2', p), false);
  });
});
