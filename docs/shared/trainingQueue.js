/**
 * File pédagogique d’exercices d’entraînement (indépendante de l’ordre des clics).
 * Ex. p1_6 : A → B → C → D strictement.
 */
import { getExerciseFromProgress } from './exerciseHelp.js';

/** Identifiants officiels des 4 exercices d’entraînement part1 */
export const P1_TRAIN_EXERCISE_IDS = [
  'p1_train_1',
  'p1_train_2',
  'p1_train_3',
  'p1_train_4',
];

/**
 * Identifiants officiels des 4 exercices balises part4 (Thalès emboîtés).
 * Même file pédagogique fixe A → B → C → D que part1, indépendante des clics.
 */
export const P4_BALISE_EXERCISE_IDS = [
  'p4_balise_a',
  'p4_balise_b',
  'p4_balise_c',
  'p4_balise_d',
];

/** Scène d’entraînement part4 (balises) */
export const P4_BALISE_SCENE_ID = 'p4_4_balises_thales';

/** Scène suivante après les 4 balises part4 */
export const P4_AFTER_BALISE_SCENE_ID = 'p4_5_finale_compas_marin';

/**
 * Identifiants officiels des 4 exercices balises part5 (Thalès papillon).
 * File pédagogique fixe A → B → C → D, indépendante des clics.
 */
export const P5_BALISE_EXERCISE_IDS = [
  'p5_balise_a',
  'p5_balise_b',
  'p5_balise_c',
  'p5_balise_d',
];

/** Scène d’entraînement part5 (balises papillon) */
export const P5_BALISE_SCENE_ID = 'p5_4_balises_thales_papillon';

/** Scène suivante après les 4 balises part5 */
export const P5_AFTER_BALISE_SCENE_ID = 'p5_5_finale_citerne';

/**
 * Identifiants officiels des 4 exercices balises part6 (réciproque de Thalès).
 * File pédagogique fixe A → B → C → D.
 */
export const P6_BALISE_EXERCISE_IDS = [
  'p6_balise_a',
  'p6_balise_b',
  'p6_balise_c',
  'p6_balise_d',
];

export const P6_BALISE_SCENE_ID = 'p6_4_balises_verification';
/** Après les 4 balises : table du capitaine (pas le fragment) */
export const P6_AFTER_BALISE_SCENE_ID = 'p6_5_table_capitaine';
export const P6_FRAGMENT_SCENE_ID = 'p6_6_fragment_final';

/**
 * Un exercice est terminé s’il est réussi OU si la correction a été débloquée
 * (5 erreurs) — l’élève a pu l’acquitter via « J’ai compris ».
 * @param {object} progress
 * @param {string} exerciseId
 */
export function isExerciseQueueItemDone(progress, exerciseId) {
  const st = getExerciseFromProgress(progress, exerciseId);
  return Boolean(st.succeeded || st.correctionUnlocked);
}

/**
 * Premier exercice non terminé dans la file, ou null si tout est fait.
 * @param {object} progress
 * @param {string[]} queueIds
 * @returns {string|null}
 */
export function getNextQueueExerciseId(progress, queueIds = P1_TRAIN_EXERCISE_IDS) {
  const ids = Array.isArray(queueIds) && queueIds.length
    ? queueIds
    : P1_TRAIN_EXERCISE_IDS;
  for (const id of ids) {
    if (!isExerciseQueueItemDone(progress, id)) return id;
  }
  return null;
}

/**
 * @param {object} progress
 * @param {string[]} queueIds
 */
export function isQueueComplete(progress, queueIds = P1_TRAIN_EXERCISE_IDS) {
  return getNextQueueExerciseId(progress, queueIds) === null;
}

/**
 * Index 0-based du prochain exercice (ou length si terminé).
 * @param {object} progress
 * @param {string[]} queueIds
 */
export function getQueueProgressIndex(progress, queueIds = P1_TRAIN_EXERCISE_IDS) {
  const ids = Array.isArray(queueIds) && queueIds.length
    ? queueIds
    : P1_TRAIN_EXERCISE_IDS;
  const next = getNextQueueExerciseId(progress, ids);
  if (!next) return ids.length;
  return ids.indexOf(next);
}

/**
 * Libellé « Exercice k sur n ».
 * @param {object} progress
 * @param {string[]} queueIds
 */
export function formatQueueStepLabel(progress, queueIds = P1_TRAIN_EXERCISE_IDS) {
  const ids = Array.isArray(queueIds) && queueIds.length
    ? queueIds
    : P1_TRAIN_EXERCISE_IDS;
  const idx = getQueueProgressIndex(progress, ids);
  if (idx >= ids.length) {
    return `Exercice ${ids.length} sur ${ids.length}`;
  }
  return `Exercice ${idx + 1} sur ${ids.length}`;
}

/**
 * Simule une suite d’ouvertures de file pour une permutation de clics
 * (chaque clic ouvre le prochain exercice non fait — l’ordre des clics
 * n’influence pas l’ordre pédagogique).
 * @param {string[]} clickOrder ex. ['balise_d','balise_a',...]
 * @param {string[]} queueIds
 * @returns {string[]} ids d’exercices ouverts successivement
 */
export function simulateQueueOpenings(clickOrder, queueIds = P1_TRAIN_EXERCISE_IDS) {
  const done = new Set();
  const opened = [];
  const nextOf = () => {
    for (const id of queueIds) {
      if (!done.has(id)) return id;
    }
    return null;
  };
  for (let i = 0; i < clickOrder.length; i += 1) {
    const n = nextOf();
    if (!n) break;
    opened.push(n);
    done.add(n);
  }
  return opened;
}

/**
 * Toutes les permutations de n éléments.
 * @template T
 * @param {T[]} arr
 * @returns {T[][]}
 */
export function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  for (let i = 0; i < arr.length; i += 1) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) {
      out.push([arr[i], ...p]);
    }
  }
  return out;
}

/** Scènes narratives part1 avant l’entraînement (ordre linéaire) */
export const P1_PRE_TRAIN_SCENE_IDS = [
  'p1_0_arrivee',
  'p1_1_decouverte',
  'p1_2_cours',
  'p1_3_verification',
  'p1_4_hypotenuse',
  'p1_5_cote',
];

/**
 * Indique si un état d’exercice d’entraînement a réellement été touché
 * (tentative, réussite, correction, indice).
 * @param {object} progress
 * @param {string} exerciseId
 */
export function hasExerciseActivity(progress, exerciseId) {
  const raw = progress?.exercises?.[exerciseId];
  if (!raw || typeof raw !== 'object') return false;
  if (raw.succeeded || raw.correctionUnlocked || raw.correctionShown) return true;
  if (Number(raw.attempts) > 0 || Number(raw.wrongAttempts) > 0) return true;
  if (Number(raw.hintsUnlocked) > 0) return true;
  if (Array.isArray(raw.hintsUsed) && raw.hintsUsed.length > 0) return true;
  if (raw.lastAnswer != null && String(raw.lastAnswer).length > 0) return true;
  return false;
}

/**
 * Preuve que le joueur a réellement atteint ou dépassé l’entraînement.
 * currentPartId === "part1" seul ne suffit PAS.
 *
 * @param {object} progress
 * @param {{
 *   trainSceneId?: string,
 *   finaleSceneId?: string,
 *   partId?: string,
 *   queueIds?: string[],
 * }} [opts]
 */
export function hasReachedTraining(progress = {}, opts = {}) {
  const trainSceneId = opts.trainSceneId || 'p1_6_entrainement';
  const finaleSceneId = opts.finaleSceneId || 'p1_7_finale';
  const partId = opts.partId || 'part1';
  const queueIds = opts.queueIds || P1_TRAIN_EXERCISE_IDS;

  const completedScenes = progress.completedScenes || [];
  const completedParts = progress.completedParts || [];
  const cur = progress.currentSceneId;

  if (cur === trainSceneId || cur === finaleSceneId) return true;
  if (completedScenes.includes(trainSceneId)) return true;
  if (completedScenes.includes(finaleSceneId)) return true;
  if (completedParts.includes(partId)) return true;
  if (progress.currentPartId === 'part2') return true;
  if (progress.visualStages?.[finaleSceneId]) return true;

  for (const id of queueIds) {
    if (hasExerciseActivity(progress, id)) return true;
  }
  return false;
}

/**
 * Au moins un exercice de la file a une activité réelle.
 * @param {object} progress
 * @param {string[]} queueIds
 */
export function hasAnyTrainingExerciseActivity(
  progress,
  queueIds = P1_TRAIN_EXERCISE_IDS,
) {
  return queueIds.some((id) => hasExerciseActivity(progress, id));
}

/**
 * Première scène narrative non terminée avant l’entraînement, ou p1_0.
 * @param {object} progress
 * @param {string[]} preTrainIds
 */
export function firstIncompletePreTrainScene(
  progress = {},
  preTrainIds = P1_PRE_TRAIN_SCENE_IDS,
) {
  const done = new Set(progress.completedScenes || []);
  for (const id of preTrainIds) {
    if (!done.has(id)) return id;
  }
  return preTrainIds[0] || 'p1_0_arrivee';
}

/**
 * Migration : joueur placé à tort sur p1_6 sans jamais avoir entraîné
 * ni terminé les scènes antérieures.
 *
 * @param {object} progress
 * @param {{
 *   trainSceneId?: string,
 *   queueIds?: string[],
 *   preTrainIds?: string[],
 * }} [opts]
 * @returns {{ progress: object, migrated: boolean, reason?: string }}
 */
export function migrateFalseTrainingPlacement(progress = {}, opts = {}) {
  const trainSceneId = opts.trainSceneId || 'p1_6_entrainement';
  const queueIds = opts.queueIds || P1_TRAIN_EXERCISE_IDS;
  const preTrainIds = opts.preTrainIds || P1_PRE_TRAIN_SCENE_IDS;

  if (progress.currentSceneId !== trainSceneId) {
    return { progress, migrated: false };
  }

  // Vrai entraînement commencé → ne pas renvoyer en arrière
  if (hasAnyTrainingExerciseActivity(progress, queueIds)) {
    return { progress, migrated: false };
  }

  const done = new Set(progress.completedScenes || []);
  const allPreDone = preTrainIds.every((id) => done.has(id));
  // A vraiment fini le parcours narratif avant l’entraînement
  if (allPreDone) {
    return { progress, migrated: false };
  }

  const resume = firstIncompletePreTrainScene(progress, preTrainIds);
  return {
    progress: {
      ...progress,
      currentPartId: progress.currentPartId === 'part2' ? 'part1' : (progress.currentPartId || 'part1'),
      currentSceneId: resume,
    },
    migrated: true,
    reason: `placement p1_6 sans activité → reprise ${resume}`,
  };
}

/**
 * Répare une sauvegarde où l’entraînement a été sauté (ex. A+D vus → sortie).
 * Idempotent. Ne supprime pas les états d’exercices déjà réussis.
 *
 * Ne force JAMAIS p1_6 pour une simple file incomplète (nouveau joueur).
 * Exige hasReachedTraining.
 *
 * @param {object} progress
 * @param {{
 *   trainSceneId?: string,
 *   finaleSceneId?: string,
 *   partId?: string,
 *   queueIds?: string[],
 *   preTrainIds?: string[],
 * }} [opts]
 * @returns {{ progress: object, repaired: boolean, reason?: string }}
 */
export function repairTrainingQueueProgress(progress = {}, opts = {}) {
  const trainSceneId = opts.trainSceneId || 'p1_6_entrainement';
  const finaleSceneId = opts.finaleSceneId || 'p1_7_finale';
  const partId = opts.partId || 'part1';
  const queueIds = opts.queueIds || P1_TRAIN_EXERCISE_IDS;
  const preTrainIds = opts.preTrainIds || P1_PRE_TRAIN_SCENE_IDS;

  let p = { ...progress };
  let repaired = false;
  let reason;

  // Mode test Partie 2 : ne jamais renvoyer vers p1_6 (profils Test-Partie-2 uniquement).
  // Les vrais élèves ne portent pas flags._testBoot === 'part2'.
  if (p.flags?._testBoot === 'part2') {
    return { progress: p, repaired: false, reason: 'testBoot part2 — réparation file ignorée' };
  }

  // 1) Migration des saves victimes du faux positif (p1_6 sans avoir joué)
  const mig = migrateFalseTrainingPlacement(p, {
    trainSceneId,
    queueIds,
    preTrainIds,
  });
  if (mig.migrated) {
    p = mig.progress;
    repaired = true;
    reason = mig.reason;
  }

  const complete = isQueueComplete(p, queueIds);
  const reached = hasReachedTraining(p, {
    trainSceneId,
    finaleSceneId,
    partId,
    queueIds,
  });

  // 2) File incomplète sans preuve d’avoir atteint l’entraînement → ne rien forcer
  if (!complete && !reached) {
    return { progress: p, repaired, reason };
  }

  // 3) File incomplète + preuve d’avoir atteint/dépassé l’entraînement
  if (!complete && reached) {
    const completedScenes = [...(p.completedScenes || [])];
    const completedParts = [...(p.completedParts || [])];
    const hadPart = completedParts.includes(partId);

    // Retirer train/finale des scènes « terminées » si file incomplète
    const nextScenes = completedScenes.filter(
      (id) => id !== trainSceneId && id !== finaleSceneId,
    );
    if (nextScenes.length !== completedScenes.length) {
      repaired = true;
      reason = reason || 'scènes d’entraînement/finale retirées (file incomplète)';
    }
    p.completedScenes = nextScenes;

    // Si part1 marquée terminée sans les 4 exercices → rouvrir part1
    if (hadPart) {
      p.completedParts = completedParts.filter((id) => id !== partId);
      repaired = true;
      reason = reason || 'part1 rouverte (exercices manquants)';
    }

    // Reprise à l’entraînement uniquement si le joueur n’est plus avant p1_6
    // de façon légitime (scènes pre-train incomplètes + pas d’activité train
    // déjà gérées par migrate). Ici reached est vrai.
    const shouldResumeTrain =
      p.currentSceneId === trainSceneId ||
      p.currentSceneId === finaleSceneId ||
      p.currentPartId === 'part2' ||
      hadPart ||
      (p.completedScenes || []).includes(finaleSceneId) ||
      Boolean(p.visualStages?.[finaleSceneId]) ||
      // était sur train/finale avant filtre completedScenes
      completedScenes.includes(trainSceneId) ||
      completedScenes.includes(finaleSceneId) ||
      hasAnyTrainingExerciseActivity(p, queueIds);

    if (shouldResumeTrain) {
      // Ne pas écraser une scène narrative antérieure légitime
      // (ex. currentSceneId = p1_3 alors que reached via un autre signal rare)
      const cur = p.currentSceneId;
      const isPreTrain =
        cur && preTrainIds.includes(cur) && !hasAnyTrainingExerciseActivity(p, queueIds);
      if (!isPreTrain) {
        p.currentPartId = partId;
        p.currentSceneId = trainSceneId;
        repaired = true;
        reason = reason || 'reprise au premier exercice manquant';
      }
    }

    // Nettoyer stades visuels de finale si file incomplète
    if (p.visualStages?.[finaleSceneId]) {
      const vs = { ...p.visualStages };
      delete vs[finaleSceneId];
      p.visualStages = vs;
      repaired = true;
    }
  }

  return { progress: p, repaired, reason };
}
