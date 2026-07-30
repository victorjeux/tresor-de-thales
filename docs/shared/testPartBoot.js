/**
 * TEMP TEST ONLY - remove before final release
 *
 * Boot de progression pour les boutons « Mode test — Partie 1/2 ».
 * Utilise des pseudos dédiés pour ne pas écraser les profils élèves.
 */
import { initialProgress } from './progression.js';
import {
  initialExerciseState,
  setExerciseInProgress,
} from './exerciseHelp.js';
import {
  P1_PRE_TRAIN_SCENE_IDS,
  P1_TRAIN_EXERCISE_IDS,
} from './trainingQueue.js';

/** Mettre à false (ou retirer le code) avant la version finale. */
export const ENABLE_TEST_PART_BUTTONS = true;

export const TEST_PSEUDO_PART1 = 'Test-Partie-1';
export const TEST_PSEUDO_PART2 = 'Test-Partie-2';
export const TEST_PSEUDO_PART3 = 'Test-Partie-3';
export const TEST_PSEUDO_PART4 = 'Test-Partie-4';
export const TEST_PSEUDO_PART5 = 'Test-Partie-5';
export const TEST_PSEUDO_PART6 = 'Test-Partie-6';
export const TEST_PSEUDO_PART7 = 'Test-Partie-7';

/**
 * Progression de test : début de la partie 1 (prologue considéré terminé).
 * @returns {object}
 */
export function buildTestProgressPart1() {
  // TEMP TEST ONLY - remove before final release
  const base = initialProgress();
  return {
    ...base,
    currentPartId: 'part1',
    currentSceneId: 'p1_0_arrivee',
    completedParts: ['prologue'],
    completedScenes: [],
    flags: { ...(base.flags || {}), _testBoot: 'part1' },
  };
}

/**
 * Marque la file A→B→C→D comme entièrement réussie (profil test part2 uniquement).
 * Évite que repairTrainingQueueProgress renvoie vers p1_6_entrainement.
 * @param {object} progress
 */
export function markPart1TrainingCompleteForTest(progress) {
  // TEMP TEST ONLY - remove before final release
  let p = { ...progress, exercises: { ...(progress.exercises || {}) } };
  const done = {
    ...initialExerciseState(),
    succeeded: true,
    correctionUnlocked: true,
    correctionShown: true,
    attempts: 1,
  };
  for (const id of P1_TRAIN_EXERCISE_IDS) {
    p = setExerciseInProgress(p, id, done);
  }
  return p;
}

/**
 * Progression de test : début de la partie 2.
 * Contourne le verrou en marquant prologue + part1 comme terminés
 * uniquement pour ce profil de test, avec une part1 cohérente
 * (file d’entraînement A–D acquittée) pour ne pas déclencher la réparation.
 * @returns {object}
 */
export function buildTestProgressPart2() {
  // TEMP TEST ONLY - remove before final release
  const base = initialProgress();
  const completedScenes = [
    ...P1_PRE_TRAIN_SCENE_IDS,
    'p1_6_entrainement',
    'p1_7_finale',
  ];
  let p = {
    ...base,
    currentPartId: 'part2',
    currentSceneId: 'p2_0_arrivee_chantier',
    completedParts: ['prologue', 'part1'],
    completedScenes,
    // Fragment 1 déjà obtenu en part1 (compteur 2/6 après fragment 2)
    fragmentsCollected: [1],
    flags: {
      ...(base.flags || {}),
      _testBoot: 'part2',
      fragment_1: true,
      fragment1Collected: true,
    },
  };
  p = markPart1TrainingCompleteForTest(p);
  return p;
}

/**
 * Progression de test : début de la partie 3 (triangles semblables).
 * @returns {object}
 */
export function buildTestProgressPart3() {
  // TEMP TEST ONLY - remove before final release
  let p = buildTestProgressPart2();
  p = {
    ...p,
    currentPartId: 'part3',
    currentSceneId: 'p3_0_arrivee_moulin',
    completedParts: ['prologue', 'part1', 'part2'],
    fragmentsCollected: [1, 2],
    flags: {
      ...(p.flags || {}),
      _testBoot: 'part3',
      fragment1Collected: true,
      fragment2Collected: true,
      fragment_1: true,
      fragment_2: true,
    },
  };
  return p;
}

/**
 * Progression de test : début de la partie 4 (Thalès emboîté).
 * @returns {object}
 */
export function buildTestProgressPart4() {
  // TEMP TEST ONLY - remove before final release
  let p = buildTestProgressPart3();
  p = {
    ...p,
    currentPartId: 'part4',
    currentSceneId: 'p4_0_arrivee_ile_paralleles',
    completedParts: ['prologue', 'part1', 'part2', 'part3'],
    fragmentsCollected: [1, 2, 3],
    flags: {
      ...(p.flags || {}),
      _testBoot: 'part4',
      fragment1Collected: true,
      fragment2Collected: true,
      fragment3Collected: true,
      fragment_1: true,
      fragment_2: true,
      fragment_3: true,
    },
  };
  return p;
}

/**
 * Progression de test : début de la partie 5 (Thalès papillon).
 * @returns {object}
 */
export function buildTestProgressPart5() {
  // TEMP TEST ONLY - remove before final release
  let p = buildTestProgressPart4();
  p = {
    ...p,
    currentPartId: 'part5',
    currentSceneId: 'p5_0_arrivee_crique_vents_croises',
    completedParts: ['prologue', 'part1', 'part2', 'part3', 'part4'],
    fragmentsCollected: [1, 2, 3, 4],
    flags: {
      ...(p.flags || {}),
      _testBoot: 'part5',
      fragment1Collected: true,
      fragment2Collected: true,
      fragment3Collected: true,
      fragment4Collected: true,
      fragment_1: true,
      fragment_2: true,
      fragment_3: true,
      fragment_4: true,
    },
  };
  return p;
}

/**
 * Progression de test : début de la partie 6 (réciproque de Thalès).
 * @returns {object}
 */
export function buildTestProgressPart6() {
  // TEMP TEST ONLY - remove before final release
  let p = buildTestProgressPart5();
  p = {
    ...p,
    currentPartId: 'part6',
    currentSceneId: 'p6_0_cabinet_routes',
    completedParts: ['prologue', 'part1', 'part2', 'part3', 'part4', 'part5'],
    fragmentsCollected: [1, 2, 3, 4, 5],
    flags: {
      ...(p.flags || {}),
      _testBoot: 'part6',
      fragment1Collected: true,
      fragment2Collected: true,
      fragment3Collected: true,
      fragment4Collected: true,
      fragment5Collected: true,
      fragment_1: true,
      fragment_2: true,
      fragment_3: true,
      fragment_4: true,
      fragment_5: true,
    },
  };
  return p;
}

/**
 * Progression de test : début de la partie 7 (bilan final / trésor).
 * @returns {object}
 */
export function buildTestProgressPart7() {
  // TEMP TEST ONLY - remove before final release
  let p = buildTestProgressPart6();
  p = {
    ...p,
    currentPartId: 'part7',
    currentSceneId: 'p7_0_carte_complete',
    completedParts: [
      'prologue',
      'part1',
      'part2',
      'part3',
      'part4',
      'part5',
      'part6',
    ],
    fragmentsCollected: [1, 2, 3, 4, 5, 6],
    flags: {
      ...(p.flags || {}),
      _testBoot: 'part7',
      fragment1Collected: true,
      fragment2Collected: true,
      fragment3Collected: true,
      fragment4Collected: true,
      fragment5Collected: true,
      fragment6Collected: true,
      fragment_1: true,
      fragment_2: true,
      fragment_3: true,
      fragment_4: true,
      fragment_5: true,
      fragment_6: true,
    },
  };
  return p;
}
