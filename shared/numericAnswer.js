/**
 * Validation des réponses numériques pédagogiques.
 * Accepte virgule ou point décimal. Tolérance d'arrondi configurable par exercice.
 */

/**
 * Parse une saisie élève en nombre.
 * Accepte espaces, virgule ou point. Retourne null si invalide.
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseNumericInput(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw !== 'string') return null;

  let s = raw.trim().replace(/\s+/g, '');
  if (!s) return null;

  // Un seul séparateur décimal (virgule ou point)
  s = s.replace(',', '.');

  // Autoriser un signe optionnel et des chiffres
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) {
    return null;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Compare une réponse saisie à la valeur attendue avec une tolérance.
 * @param {unknown} rawInput
 * @param {number} expected
 * @param {number} [tolerance=0]
 * @returns {{ ok: boolean, parsed: number|null, reason?: string }}
 */
export function checkNumericAnswer(rawInput, expected, tolerance = 0) {
  if (typeof expected !== 'number' || !Number.isFinite(expected)) {
    return { ok: false, parsed: null, reason: 'Valeur attendue invalide.' };
  }

  const tol =
    typeof tolerance === 'number' && Number.isFinite(tolerance) && tolerance >= 0
      ? tolerance
      : 0;

  const parsed = parseNumericInput(rawInput);
  if (parsed === null) {
    return {
      ok: false,
      parsed: null,
      reason: 'Saisie non numérique. Utilisez des chiffres, avec une virgule ou un point.',
    };
  }

  const ok = Math.abs(parsed - expected) <= tol;
  return {
    ok,
    parsed,
    reason: ok
      ? undefined
      : 'Ce n’est pas la bonne valeur. Relis l’énoncé ou utilise un indice.',
  };
}

/**
 * Validation côté serveur / tests à partir de la définition d'un exercice.
 * @param {unknown} rawInput
 * @param {{ expected: number, tolerance?: number }} exercise
 */
export function validateExerciseNumeric(rawInput, exercise) {
  const tolerance = exercise?.tolerance ?? 0;
  return checkNumericAnswer(rawInput, exercise.expected, tolerance);
}
