import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  P1_TRAIN_EXERCISE_IDS,
  P4_BALISE_EXERCISE_IDS,
  P4_BALISE_SCENE_ID,
  getNextQueueExerciseId,
  isQueueComplete,
  formatQueueStepLabel,
  simulateQueueOpenings,
  permutations,
  repairTrainingQueueProgress,
  isExerciseQueueItemDone,
  hasReachedTraining,
  hasExerciseActivity,
  migrateFalseTrainingPlacement,
  firstIncompletePreTrainScene,
  P1_PRE_TRAIN_SCENE_IDS,
} from '../shared/trainingQueue.js';
import { setExerciseInProgress, initialExerciseState } from '../shared/exerciseHelp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const content = JSON.parse(
  fs.readFileSync(
    path.join(root, 'client/content/part1/scenes.json'),
    'utf8',
  ),
);
const train = content.scenes.find((s) => s.id === 'p1_6_entrainement');
const raw = fs.readFileSync(
  path.join(root, 'client/content/part1/scenes.json'),
  'utf8',
);

function progressWithDone(idsDone) {
  let p = { exercises: {} };
  for (const id of idsDone) {
    p = setExerciseInProgress(p, id, {
      ...initialExerciseState(),
      succeeded: true,
      correctionUnlocked: true,
      correctionShown: true,
    });
  }
  return p;
}

describe('file pédagogique A→B→C→D', () => {
  it('contenu : exerciseQueue avec 4 ids et 4 queueMember', () => {
    assert.ok(train.exerciseQueue);
    assert.deepEqual(train.exerciseQueue.ids, P1_TRAIN_EXERCISE_IDS);
    const members = train.hotspots.filter((h) => h.queueMember);
    assert.equal(members.length, 4);
    assert.ok(train.hotspots.every((h) => !h.required || h.optional));
    assert.ok(members.every((h) => h.advancesStory === false));
    for (const id of P1_TRAIN_EXERCISE_IDS) {
      assert.ok(train.exerciseQueue.exercises[id], id);
    }
  });

  it('24 permutations de clics → toujours A,B,C,D', () => {
    const balises = ['balise_a', 'balise_b', 'balise_c', 'balise_d'];
    const perms = permutations(balises);
    assert.equal(perms.length, 24);
    for (const order of perms) {
      // 4 clics (un par balise) : chaque clic complète l’exo courant
      const opened = simulateQueueOpenings(order, P1_TRAIN_EXERCISE_IDS);
      assert.deepEqual(
        opened,
        P1_TRAIN_EXERCISE_IDS,
        `ordre clics ${order.join('→')}`,
      );
    }
  });

  it('aucune transition après seulement A et D', () => {
    const p = progressWithDone(['p1_train_1', 'p1_train_4']);
    assert.equal(isQueueComplete(p), false);
    assert.equal(getNextQueueExerciseId(p), 'p1_train_2');
  });

  it('aucune transition après 1, 2 ou 3 exercices', () => {
    assert.equal(isQueueComplete(progressWithDone(['p1_train_1'])), false);
    assert.equal(
      isQueueComplete(progressWithDone(['p1_train_1', 'p1_train_2'])),
      false,
    );
    assert.equal(
      isQueueComplete(
        progressWithDone(['p1_train_1', 'p1_train_2', 'p1_train_3']),
      ),
      false,
    );
  });

  it('transition uniquement après les quatre', () => {
    const p = progressWithDone(P1_TRAIN_EXERCISE_IDS);
    assert.equal(isQueueComplete(p), true);
    assert.equal(getNextQueueExerciseId(p), null);
  });

  it('facultatifs ne comptent pas', () => {
    assert.ok(
      train.hotspots.some(
        (h) => h.optional && h.id === 'opt_balise_cartographes_p6',
      ),
    );
    assert.ok(!P1_TRAIN_EXERCISE_IDS.includes('opt_balise_cartographes_p6'));
  });

  it('plusieurs clics même balise ne sautent pas d’étape', () => {
    const order = [
      'balise_a',
      'balise_a',
      'balise_a',
      'balise_a',
      'balise_a',
    ];
    // simulateQueueOpenings : chaque clic « complète » un exo de la file
    const opened = simulateQueueOpenings(order, P1_TRAIN_EXERCISE_IDS);
    assert.deepEqual(opened, P1_TRAIN_EXERCISE_IDS);
  });

  it('libellés Exercice k sur 4', () => {
    assert.equal(
      formatQueueStepLabel(progressWithDone([])),
      'Exercice 1 sur 4',
    );
    assert.equal(
      formatQueueStepLabel(progressWithDone(['p1_train_1'])),
      'Exercice 2 sur 4',
    );
    assert.equal(
      formatQueueStepLabel(
        progressWithDone(['p1_train_1', 'p1_train_2', 'p1_train_3']),
      ),
      'Exercice 4 sur 4',
    );
  });

  it('reprise : premier exercice manquant', () => {
    const p = progressWithDone(['p1_train_1', 'p1_train_2']);
    assert.equal(getNextQueueExerciseId(p), 'p1_train_3');
  });

  it('réparation save A+D seulement', () => {
    let p = progressWithDone(['p1_train_1', 'p1_train_4']);
    p = {
      ...p,
      completedScenes: ['p1_6_entrainement', 'p1_7_finale'],
      completedParts: ['part1'],
      currentPartId: 'part2',
      currentSceneId: null,
    };
    const { progress: fixed, repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, true);
    assert.equal(fixed.currentSceneId, 'p1_6_entrainement');
    assert.equal(fixed.currentPartId, 'part1');
    assert.ok(!fixed.completedParts.includes('part1'));
    assert.ok(!fixed.completedScenes.includes('p1_7_finale'));
    // États A et D conservés
    assert.equal(isExerciseQueueItemDone(fixed, 'p1_train_1'), true);
    assert.equal(isExerciseQueueItemDone(fixed, 'p1_train_4'), true);
    assert.equal(getNextQueueExerciseId(fixed), 'p1_train_2');
  });

  it('réparation idempotente si file complète', () => {
    let p = progressWithDone(P1_TRAIN_EXERCISE_IDS);
    p = {
      ...p,
      completedScenes: ['p1_6_entrainement'],
      completedParts: ['part1'],
      currentPartId: 'part2',
    };
    const { repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, false);
  });
});

describe('hasReachedTraining et non-régression début part1', () => {
  it('nouveau profil / file vide → hasReachedTraining false', () => {
    assert.equal(hasReachedTraining({ currentPartId: 'part1' }), false);
    assert.equal(
      hasReachedTraining({
        currentPartId: 'part1',
        currentSceneId: 'p1_0_arrivee',
        completedParts: ['prologue'],
        completedScenes: [],
      }),
      false,
    );
  });

  it('nouveau profil après prologue → reste p1_0, jamais p1_6', () => {
    const p = {
      currentPartId: 'part1',
      currentSceneId: 'p1_0_arrivee',
      completedParts: ['prologue'],
      completedScenes: [],
    };
    const { progress: fixed, repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, false);
    assert.equal(fixed.currentSceneId, 'p1_0_arrivee');
    assert.equal(fixed.currentPartId, 'part1');
  });

  it('rechargement à p1_3_verification → reste à p1_3', () => {
    const p = {
      currentPartId: 'part1',
      currentSceneId: 'p1_3_verification',
      completedParts: ['prologue'],
      completedScenes: ['p1_0_arrivee', 'p1_1_decouverte', 'p1_2_cours'],
    };
    const { progress: fixed, repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, false);
    assert.equal(fixed.currentSceneId, 'p1_3_verification');
  });

  it('rechargement à p1_5_cote → reste à p1_5', () => {
    const p = {
      currentPartId: 'part1',
      currentSceneId: 'p1_5_cote',
      completedParts: ['prologue'],
      completedScenes: P1_PRE_TRAIN_SCENE_IDS.slice(0, 5),
    };
    const { progress: fixed, repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, false);
    assert.equal(fixed.currentSceneId, 'p1_5_cote');
  });

  it('save touchée par le bug (p1_6 sans exercice ni scènes) → p1_0', () => {
    const p = {
      currentPartId: 'part1',
      currentSceneId: 'p1_6_entrainement',
      completedParts: ['prologue'],
      completedScenes: [],
      exercises: {},
    };
    const { progress: fixed, repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, true);
    assert.equal(fixed.currentSceneId, 'p1_0_arrivee');
  });

  it('migration : p1_6 + p1_0/p1_1 terminées → première non terminée p1_2', () => {
    const p = {
      currentPartId: 'part1',
      currentSceneId: 'p1_6_entrainement',
      completedScenes: ['p1_0_arrivee', 'p1_1_decouverte'],
      exercises: {},
    };
    const mig = migrateFalseTrainingPlacement(p);
    assert.equal(mig.migrated, true);
    assert.equal(mig.progress.currentSceneId, 'p1_2_cours');
  });

  it('joueur ayant commencé A → reste à p1_6', () => {
    let p = progressWithDone([]);
    p = setExerciseInProgress(p, 'p1_train_1', {
      ...initialExerciseState(),
      attempts: 2,
      wrongAttempts: 1,
    });
    p = {
      ...p,
      currentPartId: 'part1',
      currentSceneId: 'p1_6_entrainement',
      completedScenes: [...P1_PRE_TRAIN_SCENE_IDS],
    };
    assert.equal(hasReachedTraining(p), true);
    assert.equal(hasExerciseActivity(p, 'p1_train_1'), true);
    const { progress: fixed } = repairTrainingQueueProgress(p);
    assert.equal(fixed.currentSceneId, 'p1_6_entrainement');
    assert.equal(getNextQueueExerciseId(fixed), 'p1_train_1');
  });

  it('file complète → aucune réparation', () => {
    let p = progressWithDone(P1_TRAIN_EXERCISE_IDS);
    p = {
      ...p,
      currentPartId: 'part2',
      currentSceneId: null,
      completedParts: ['prologue', 'part1'],
      completedScenes: [...P1_PRE_TRAIN_SCENE_IDS, 'p1_6_entrainement', 'p1_7_finale'],
    };
    const { repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, false);
  });

  it('part1 terminée file incomplète → reprise premier exercice manquant', () => {
    let p = progressWithDone(['p1_train_1', 'p1_train_2']);
    p = {
      ...p,
      completedParts: ['prologue', 'part1'],
      currentPartId: 'part2',
      currentSceneId: null,
      completedScenes: [...P1_PRE_TRAIN_SCENE_IDS, 'p1_6_entrainement', 'p1_7_finale'],
    };
    const { progress: fixed, repaired } = repairTrainingQueueProgress(p);
    assert.equal(repaired, true);
    assert.equal(fixed.currentSceneId, 'p1_6_entrainement');
    assert.equal(getNextQueueExerciseId(fixed), 'p1_train_3');
  });

  it('firstIncompletePreTrainScene', () => {
    assert.equal(
      firstIncompletePreTrainScene({ completedScenes: [] }),
      'p1_0_arrivee',
    );
    assert.equal(
      firstIncompletePreTrainScene({
        completedScenes: ['p1_0_arrivee', 'p1_1_decouverte'],
      }),
      'p1_2_cours',
    );
  });
});

describe('positions entraînement et boussole', () => {
  it('boussole à gauche de la table + dialogue Madagascar', () => {
    const p2 = content.scenes.find((s) => s.id === 'p1_2_cours');
    const b = p2.hotspots.find((h) => h.id === 'opt_boussole_p2');
    assert.equal(b.label, 'Boussole de Nérée');
    assert.ok(b.x < 40, 'partie gauche de la table');
    assert.match(b.lines[0].text, /Madagascar/);
    assert.equal(b.lines[0].speaker, 'Alizée');
  });

  it('balise verte p1_5 recentrée (pas trop bas/droite)', () => {
    const h = content.scenes
      .find((s) => s.id === 'p1_5_cote')
      .hotspots.find((x) => x.label === 'Balise verte');
    assert.ok(h.x <= 70);
    assert.ok(h.y <= 42);
    assert.ok(h.h >= 26);
  });

  it('quatre balises d’entraînement sur des zones distinctes', () => {
    const members = train.hotspots.filter((h) => h.queueMember);
    assert.equal(members.length, 4);
    const xs = members.map((h) => h.x);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 30);
  });

  it('Nérée ancré bas sans conflit top+bottom dans les données', () => {
    const p0 = content.scenes.find((s) => s.id === 'p1_0_arrivee');
    const neree = p0.decor.objects.find((o) => o.image.includes('neree'));
    assert.equal(neree.anchor, 'bottom');
    assert.ok(neree.y >= 94, 'pieds bas sur le pont');
    assert.ok(neree.grounded);
  });

  it('dialogue Silas sans redécouverte du fragment', () => {
    assert.ok(!raw.includes('Au pied du phare : le premier fragment'));
    assert.match(raw, /Le premier fragment est en sécurité/);
  });
});

describe('file pédagogique part4 balises A→B→C→D', () => {
  const part4 = JSON.parse(
    fs.readFileSync(
      path.join(root, 'client/content/part4/scenes.json'),
      'utf8',
    ),
  );
  const balises = part4.scenes.find((s) => s.id === P4_BALISE_SCENE_ID);

  it('contenu part4 : exerciseQueue + 4 queueMember', () => {
    assert.ok(balises?.exerciseQueue);
    assert.deepEqual(balises.exerciseQueue.ids, P4_BALISE_EXERCISE_IDS);
    const members = balises.hotspots.filter((h) => h.queueMember);
    assert.equal(members.length, 4);
    for (const id of P4_BALISE_EXERCISE_IDS) {
      assert.ok(balises.exerciseQueue.exercises[id], id);
      assert.equal(balises.exerciseQueue.exercises[id].type, 'cloze');
    }
  });

  it('24 permutations part4 → toujours A,B,C,D', () => {
    const hs = ['balise_a', 'balise_b', 'balise_c', 'balise_d'];
    const perms = permutations(hs);
    assert.equal(perms.length, 24);
    for (const order of perms) {
      const opened = simulateQueueOpenings(order, P4_BALISE_EXERCISE_IDS);
      assert.deepEqual(opened, P4_BALISE_EXERCISE_IDS, order.join('→'));
    }
  });

  it('reprise mid-file part4', () => {
    const p = progressWithDone(['p4_balise_a', 'p4_balise_b']);
    assert.equal(getNextQueueExerciseId(p, P4_BALISE_EXERCISE_IDS), 'p4_balise_c');
    assert.equal(isQueueComplete(p, P4_BALISE_EXERCISE_IDS), false);
  });
});

describe('moteur file + ancrage', () => {
  const engine = fs.readFileSync(
    path.join(root, 'client/js/engine/SceneEngine.js'),
    'utf8',
  );
  it('playTrainingQueueFromHotspot et repair au start', () => {
    assert.match(engine, /playTrainingQueueFromHotspot/);
    assert.match(engine, /repairTrainingQueueProgress/);
    assert.match(engine, /queueMember/);
  });

  it('conserve type cloze pour files part4', () => {
    assert.match(engine, /type:\s*def\.type\s*\|\|\s*['"]exercise['"]/);
  });

  it('placeObject ancrage bas exclusif (pas top+translateY)', () => {
    assert.match(engine, /bottom = `\$\{Math\.max\(0, 100 - Number\(obj\.y/);
    assert.match(engine, /translateX\(-50%\)/);
    assert.match(engine, /top = 'auto'/);
  });

  it('CSS ancrage bas sans translateY\(-100%\)', () => {
    const css = fs.readFileSync(
      path.join(root, 'client/css/scenes.css'),
      'utf8',
    );
    assert.match(css, /translateX\(-50%\)/);
    assert.ok(!/grounded-object[\s\S]{0,80}translate\(-50%, -100%\)/.test(css));
  });
});

describe('part2 transition', () => {
  it('main charge part2 à part7 et termine l’aventure sans rejeu', () => {
    const main = fs.readFileSync(
      path.join(root, 'client/js/main.js'),
      'utf8',
    );
    assert.match(main, /goToNextPart/);
    assert.match(main, /Retour à l’accueil/);
    assert.ok(!main.includes('Revoir la partie 1'));
    assert.ok(!main.includes('btn-review-p1'));
    assert.ok(main.includes("url: '/content/part2/scenes.json'"));
    assert.ok(main.includes("url: '/content/part3/scenes.json'"));
    assert.ok(main.includes("url: '/content/part4/scenes.json'"));
    assert.ok(main.includes("url: '/content/part5/scenes.json'"));
    assert.ok(main.includes("url: '/content/part6/scenes.json'"));
    assert.ok(main.includes("url: '/content/part7/scenes.json'"));
    assert.match(main, /playPart\('part7'/);
  });

  it('endPart moteur affiche les cartes de transition part2 à part7 et la fin', () => {
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /Continuer vers la partie 2/);
    assert.match(engine, /btn-go-part2/);
    assert.match(engine, /La réciproque du théorème de Pythagore/);
    assert.match(engine, /btn-go-part3/);
    assert.match(engine, /Triangles semblables/);
    assert.match(engine, /btn-go-part4/);
    assert.match(engine, /btn-go-part5/);
    assert.match(engine, /btn-go-part6/);
    assert.match(engine, /btn-go-part7/);
    assert.match(engine, /btn-finish-adventure|Terminer l.aventure/);
  });
});
