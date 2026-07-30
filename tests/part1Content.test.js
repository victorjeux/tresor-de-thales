import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canOpenPart,
  completePart,
  initialProgress,
  PART_ORDER,
} from '../shared/progression.js';
import { resolvePartToPlay } from '../shared/partLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const part1Path = path.join(
  __dirname,
  '..',
  'client',
  'content',
  'part1',
  'scenes.json',
);

describe('contenu partie 1', () => {
  const raw = fs.readFileSync(part1Path, 'utf8');
  const content = JSON.parse(raw);

  it('contient 8 scènes linéaires dans l’ordre officiel', () => {
    assert.equal(content.meta.partId, 'part1');
    assert.deepEqual(content.meta.sceneOrder, [
      'p1_0_arrivee',
      'p1_1_decouverte',
      'p1_2_cours',
      'p1_3_verification',
      'p1_4_hypotenuse',
      'p1_5_cote',
      'p1_6_entrainement',
      'p1_7_finale',
    ]);
    assert.equal(content.scenes.length, 8);
  });

  it('notebook : 3 pages avec titre, lettres et formulation littérale', () => {
    const cours = content.scenes.find((s) => s.id === 'p1_2_cours');
    const nb = cours.hotspots[0].sequence.find((s) => s.type === 'notebook');
    assert.equal(nb.pages.length, 3);
    assert.match(JSON.stringify(nb.pages[1]), /BC\^\{2\}/);
    assert.match(JSON.stringify(nb.pages[2]), /hypoténuse/i);
  });

  it('entraînement : quatre exercices progressifs (file A→B→C→D)', () => {
    const train = content.scenes.find((s) => s.id === 'p1_6_entrainement');
    assert.ok(train.exerciseQueue?.ids?.length === 4);
    const exercises = train.exerciseQueue.ids.map(
      (id) => train.exerciseQueue.exercises[id],
    );
    assert.equal(exercises.length, 4);
    assert.ok(exercises.every((e) => e.progressiveHelp === true));
    assert.equal(exercises[2].title, 'Balise C');
    assert.equal(exercises[3].title, 'Balise D');
    assert.equal(train.hotspots.filter((h) => h.queueMember).length, 4);
  });

  it('finale : route intérieure 6,2/√182,25 + monte-charge 27,2, fragment et part2', () => {
    const fin = content.scenes.find((s) => s.id === 'p1_7_finale');
    const exercises = fin.hotspots
      .filter((h) => h.required)
      .flatMap((h) => (h.sequence || []).filter((s) => s.type === 'exercise'));
    assert.equal(exercises.length, 3);
    assert.equal(exercises[0].expected, 6.2);
    assert.equal(exercises[1].answerType, 'radical');
    assert.equal(exercises[1].expectedRadicand, 182.25);
    assert.equal(exercises[2].expected, 27.2);
    const end =
      fin.silasFinalDialogue ||
      fin.hotspots
        .flatMap((h) => h.sequence || [])
        .find((s) => s.endPart);
    assert.ok(end);
    assert.match(end.announce || '', /[Rr]éciproque/);
    assert.match(raw, /Silas/);
    assert.match(raw, /fragment/i);
  });

  it('correction côté angle droit mentionne l’addition à trou', () => {
    assert.match(raw, /addition à trou/i);
    assert.match(raw, /AC mesure √80|\\sqrt\{80\}/);
  });

  it('tous les indices d’exercices progressifs sont attribués à Maki', () => {
    const walk = (node, acc = []) => {
      if (!node || typeof node !== 'object') return acc;
      if (node.type === 'exercise' && node.progressiveHelp) acc.push(node);
      if (Array.isArray(node)) node.forEach((n) => walk(n, acc));
      else Object.values(node).forEach((n) => walk(n, acc));
      return acc;
    };
    const exercises = walk(content);
    assert.ok(exercises.length >= 4);
    for (const ex of exercises) {
      if (!Array.isArray(ex.hints) || ex.hints.length === 0) continue;
      assert.ok(ex.hints.length <= 3, `${ex.id} max 3 indices`);
      for (const h of ex.hints) {
        const text = typeof h === 'string' ? h : h?.text;
        assert.ok(text && text.length > 5, `${ex.id} indice vide`);
        if (typeof h === 'object' && h.reaction) {
          assert.match(h.reaction, /Krii/i);
        }
      }
    }
    // Exercices complets (entraînement + finale) : 3 indices Maki + correction Euclide
    // train A–D (4) + route intérieure a/b (2) + monte-charge (1) = 7
    const train = content.scenes.find((s) => s.id === 'p1_6_entrainement');
    const trainEx = Object.entries(train.exerciseQueue.exercises).map(
      ([id, ex]) => ({ ...ex, id }),
    );
    const finalEx = exercises.filter((e) => e.id?.startsWith('p1_final_'));
    const full = [...trainEx, ...finalEx];
    assert.equal(full.length, 7);
    for (const ex of full) {
      assert.equal(ex.hints.length, 3, ex.id);
      assert.ok(
        ex.hints.every((h) => typeof h === 'object' && /Krii/i.test(h.reaction || '')),
        ex.id,
      );
      assert.ok(ex.correction, `${ex.id} doit avoir une correction Euclide`);
      assert.match(ex.correction, /Pythagore|hypoténuse|rectangle|losange|√182/i);
    }
  });

  it('QCM de vérification sans révélation de solution', () => {
    const verif = content.scenes.find((s) => s.id === 'p1_3_verification');
    const quizzes = verif.hotspots[0].sequence.filter((s) => s.type === 'quiz');
    for (const q of quizzes) {
      for (const opt of q.options.filter((o) => !o.correct)) {
        assert.match(opt.explanation || '', /Relis ton cahier/i);
      }
    }
  });
});

describe('chargement et progression part1', () => {
  it('conserve l’ordre officiel des parties', () => {
    assert.deepEqual(PART_ORDER.slice(0, 3), ['prologue', 'part1', 'part2']);
  });

  it('charge part1 après le prologue terminé', () => {
    let p = completePart(initialProgress(), 'prologue');
    assert.equal(canOpenPart('part1', p), true);
    assert.equal(resolvePartToPlay(p), 'part1');
  });

  it('nouvel élève commence au prologue', () => {
    assert.equal(resolvePartToPlay(initialProgress()), 'prologue');
  });

  it('reprend part1 si currentPartId vaut part1', () => {
    const p = {
      currentPartId: 'part1',
      currentSceneId: 'p1_4_hypotenuse',
      completedParts: ['prologue'],
      completedScenes: [],
      exercises: {},
    };
    assert.equal(resolvePartToPlay(p), 'part1');
  });

  it('fin de part1 débloque part2 et charge part2 (contenu disponible)', () => {
    let p = completePart(initialProgress(), 'prologue');
    p = completePart(p, 'part1');
    assert.equal(canOpenPart('part2', p), true);
    assert.equal(p.currentPartId, 'part2');
    assert.equal(resolvePartToPlay(p), 'part2');
  });
});
