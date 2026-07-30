/**
 * Politique d'aide progressive pour les exercices pédagogiques (data-driven).
 *
 * - 1re erreur : message neutre, aucun indice
 * - après 2 erreurs : indice 1 débloqué
 * - après 3 erreurs : indice 2 débloqué
 * - après 4 erreurs : indice 3 débloqué
 * - après 5 erreurs : correction détaillée débloquée
 * - bonne réponse : correction détaillée affichée
 *
 * Les QCM narratifs du prologue ne passent pas par ce module.
 */

export const MAX_HINTS = 3;
export const WRONG_BEFORE_HINT1 = 2;
export const WRONG_BEFORE_HINT2 = 3;
export const WRONG_BEFORE_HINT3 = 4;
export const WRONG_BEFORE_CORRECTION = 5;

/**
 * @typedef {{
 *   attempts: number,
 *   wrongAttempts: number,
 *   hintsUnlocked: number,
 *   hintsUsed: number[],
 *   succeeded: boolean,
 *   correctionUnlocked: boolean,
 *   correctionShown: boolean
 * }} ExercisePedagogyState
 */

/**
 * État initial d'un exercice.
 * @returns {ExercisePedagogyState}
 */
export function initialExerciseState() {
  return {
    attempts: 0,
    wrongAttempts: 0,
    hintsUnlocked: 0,
    hintsUsed: [],
    succeeded: false,
    correctionUnlocked: false,
    correctionShown: false,
    lastAnswer: '',
  };
}

/**
 * Normalise un état partiel.
 * @param {Partial<ExercisePedagogyState>|null|undefined} raw
 * @returns {ExercisePedagogyState}
 */
export function normalizeExerciseState(raw) {
  const base = initialExerciseState();
  if (!raw || typeof raw !== 'object') return base;
  const hintsUsed = Array.isArray(raw.hintsUsed)
    ? raw.hintsUsed.map(Number).filter((n) => n >= 1 && n <= MAX_HINTS)
    : [];
  return {
    attempts: Math.max(0, Number(raw.attempts) || 0),
    wrongAttempts: Math.max(0, Number(raw.wrongAttempts) || 0),
    hintsUnlocked: Math.min(
      MAX_HINTS,
      Math.max(0, Number(raw.hintsUnlocked) || 0),
    ),
    hintsUsed: [...new Set(hintsUsed)].sort((a, b) => a - b),
    succeeded: Boolean(raw.succeeded),
    correctionUnlocked: Boolean(raw.correctionUnlocked),
    correctionShown: Boolean(raw.correctionShown),
    lastAnswer:
      raw.lastAnswer != null && raw.lastAnswer !== undefined
        ? String(raw.lastAnswer)
        : '',
  };
}

/**
 * Nombre d'indices débloqués selon le nombre d'erreurs.
 * @param {number} wrongAttempts
 * @returns {number} 0..3
 */
export function unlockedHintCount(wrongAttempts) {
  const n = Math.max(0, Number(wrongAttempts) || 0);
  if (n >= WRONG_BEFORE_HINT3) return 3;
  if (n >= WRONG_BEFORE_HINT2) return 2;
  if (n >= WRONG_BEFORE_HINT1) return 1;
  return 0;
}

/**
 * La correction est-elle débloquée (sans succès) ?
 * @param {number} wrongAttempts
 */
export function isCorrectionUnlockedByErrors(wrongAttempts) {
  return Math.max(0, Number(wrongAttempts) || 0) >= WRONG_BEFORE_CORRECTION;
}

/**
 * Applique le résultat d'une tentative.
 * @param {ExercisePedagogyState} state
 * @param {boolean} isCorrect
 * @returns {ExercisePedagogyState}
 */
export function registerAttempt(state, isCorrect) {
  const s = normalizeExerciseState(state);
  // Conserver la dernière saisie (radical, décimal…)
  if (state && state.lastAnswer != null) {
    s.lastAnswer = String(state.lastAnswer);
  }
  s.attempts += 1;
  if (isCorrect) {
    s.succeeded = true;
    s.correctionUnlocked = true;
    s.correctionShown = true;
  } else {
    s.wrongAttempts += 1;
    s.hintsUnlocked = Math.max(
      s.hintsUnlocked,
      unlockedHintCount(s.wrongAttempts),
    );
    if (isCorrectionUnlockedByErrors(s.wrongAttempts)) {
      s.correctionUnlocked = true;
    }
  }
  return s;
}

/**
 * Enregistre l'utilisation d'un indice (s'il est débloqué).
 * @param {ExercisePedagogyState} state
 * @param {number} level 1..3
 * @returns {{ ok: boolean, state: ExercisePedagogyState, reason?: string }}
 */
export function useHint(state, level) {
  const s = normalizeExerciseState(state);
  const lvl = Number(level);
  if (!Number.isInteger(lvl) || lvl < 1 || lvl > MAX_HINTS) {
    return { ok: false, state: s, reason: 'Niveau d’indice invalide.' };
  }
  if (lvl > s.hintsUnlocked) {
    return {
      ok: false,
      state: s,
      reason: 'Cet indice n’est pas encore débloqué.',
    };
  }
  if (!s.hintsUsed.includes(lvl)) {
    s.hintsUsed = [...s.hintsUsed, lvl].sort((a, b) => a - b);
  }
  return { ok: true, state: s };
}

/**
 * Message neutre après une erreur (sans solution).
 * @param {number} wrongAttempts
 */
export function neutralErrorMessage(wrongAttempts) {
  if (wrongAttempts <= 1) {
    return 'Ce n’est pas la bonne réponse. Réessaie.';
  }
  if (wrongAttempts < WRONG_BEFORE_CORRECTION) {
    return 'Ce n’est pas encore exact. Relis l’énoncé ou utilise un indice débloqué.';
  }
  return 'Ce n’est pas la bonne réponse. Lis la correction de Maître Euclide, puis continue.';
}

/**
 * Indique si un bouton d'indice de niveau donné est utilisable.
 * @param {ExercisePedagogyState} state
 * @param {number} level
 */
export function isHintAvailable(state, level) {
  const s = normalizeExerciseState(state);
  return level >= 1 && level <= MAX_HINTS && level <= s.hintsUnlocked;
}

/**
 * Lit / écrit l'état d'un exercice dans progress.exercises.
 * @param {object} progress
 * @param {string} exerciseId
 */
export function getExerciseFromProgress(progress, exerciseId) {
  const map = progress?.exercises || {};
  return normalizeExerciseState(map[exerciseId]);
}

/**
 * @param {object} progress
 * @param {string} exerciseId
 * @param {ExercisePedagogyState} state
 */
export function setExerciseInProgress(progress, exerciseId, state) {
  const exercises = { ...(progress?.exercises || {}) };
  exercises[exerciseId] = normalizeExerciseState(state);
  return { ...progress, exercises };
}

/**
 * Seuils exposés pour les tests / l'UI.
 */
export const HELP_THRESHOLDS = {
  hint1AfterWrong: WRONG_BEFORE_HINT1,
  hint2AfterWrong: WRONG_BEFORE_HINT2,
  hint3AfterWrong: WRONG_BEFORE_HINT3,
  correctionAfterWrong: WRONG_BEFORE_CORRECTION,
  maxHints: MAX_HINTS,
};
