/**
 * Logique pure des QCM (testable hors navigateur).
 *
 * QCM noté :
 * - chaque clic est évalué immédiatement ;
 * - une erreur n'empêche pas de retenter une autre option ;
 * - seule la bonne réponse fait progresser.
 *
 * QCM narratif (allowAny) :
 * - toute option est acceptable et fait progresser.
 */

/**
 * @param {{ correct?: boolean, text?: string }} option
 * @param {{ narrative?: boolean, allowAny?: boolean }} step
 * @returns {{ isCorrect: boolean, advances: boolean, blocksFurther: boolean }}
 */
export function evaluateQuizOption(option, step = {}) {
  const narrative = Boolean(step.narrative || step.allowAny);
  if (narrative) {
    return { isCorrect: true, advances: true, blocksFurther: false };
  }
  const isCorrect = Boolean(option?.correct);
  return {
    isCorrect,
    advances: isCorrect,
    blocksFurther: false,
  };
}

/**
 * Après une séquence de tentatives, peut-on encore choisir ?
 * @param {{ solved: boolean }} state
 */
export function canRetryQuiz(state) {
  return !state.solved;
}

/**
 * Simule une session de QCM (pour tests).
 * @param {Array<{ correct?: boolean, text?: string }>} options
 * @param {number[]} attemptIndices ordre des clics
 * @param {{ narrative?: boolean, allowAny?: boolean }} step
 */
export function simulateQuizAttempts(options, attemptIndices, step = {}) {
  let solved = false;
  const log = [];
  let advanced = false;

  for (const idx of attemptIndices) {
    if (solved) {
      log.push({ index: idx, rejected: true, reason: 'already_solved' });
      continue;
    }
    const option = options[idx];
    if (!option) {
      log.push({ index: idx, rejected: true, reason: 'invalid' });
      continue;
    }
    const result = evaluateQuizOption(option, step);
    log.push({
      index: idx,
      text: option.text,
      isCorrect: result.isCorrect,
      advances: result.advances,
    });
    if (result.advances) {
      solved = true;
      advanced = true;
    }
  }

  return { solved, advanced, log, canRetry: canRetryQuiz({ solved }) };
}
