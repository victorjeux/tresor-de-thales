/**
 * Validation d’expressions de racine carrée exactes (sans eval).
 * Accepte √182,25 / √182.25 / sqrt(182,25) / sqrt(182.25).
 * Refuse volontairement la forme décimale simplifiée (ex. 13,5).
 */

/**
 * Normalise une saisie : espaces retirés, virgule → point, √ unifié.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeRadicalInput(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw !== 'string') return '';
  let s = raw.trim().replace(/\s+/g, '');
  // Unifier le radical unicode et ascii
  s = s.replace(/√/g, '√');
  s = s.replace(/,/g, '.');
  s = s.toLowerCase();
  return s;
}

/**
 * Extrait le radicande d’une expression √n ou sqrt(n).
 * @param {string} normalized
 * @returns {number|null}
 */
export function parseRadicand(normalized) {
  if (!normalized) return null;
  // √182.25
  let m = /^√([+-]?\d+(?:\.\d+)?)$/.exec(normalized);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  // sqrt(182.25)
  m = /^sqrt\(([+-]?\d+(?:\.\d+)?)\)$/.exec(normalized);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * @param {unknown} rawInput
 * @param {number} expectedRadicand
 * @param {number} [tolerance=0]
 * @returns {{ ok: boolean, radicand: number|null, reason?: string, form?: string }}
 */
export function checkRadicalAnswer(rawInput, expectedRadicand, tolerance = 0) {
  if (typeof expectedRadicand !== 'number' || !Number.isFinite(expectedRadicand)) {
    return { ok: false, radicand: null, reason: 'Radicande attendu invalide.' };
  }

  const tol =
    typeof tolerance === 'number' && Number.isFinite(tolerance) && tolerance >= 0
      ? tolerance
      : 0;

  const FORMAT_HINT =
    'Écris la valeur exacte sous la forme √nombre, avec le symbole √ puis le nombre sous la racine.';

  const norm = normalizeRadicalInput(rawInput);
  if (!norm) {
    return {
      ok: false,
      radicand: null,
      reason: FORMAT_HINT,
    };
  }

  // Refuser explicitement une simple valeur numérique (ex. 13,5)
  if (/^[+-]?\d+(?:\.\d+)?$/.test(norm)) {
    return {
      ok: false,
      radicand: null,
      reason:
        'La forme radicale exacte est demandée (√nombre), pas une valeur décimale. ' +
        FORMAT_HINT,
    };
  }

  const radicand = parseRadicand(norm);
  if (radicand === null) {
    return {
      ok: false,
      radicand: null,
      reason: FORMAT_HINT,
    };
  }

  const ok = Math.abs(radicand - expectedRadicand) <= tol;
  return {
    ok,
    radicand,
    form: `√${String(expectedRadicand).replace('.', ',')}`,
    reason: ok
      ? undefined
      : 'Ce n’est pas la bonne valeur sous le radical. Relis l’énoncé ou utilise un indice.',
  };
}

/**
 * @param {unknown} rawInput
 * @param {{ expectedRadicand?: number, expected?: number, tolerance?: number }} exercise
 */
export function validateExerciseRadical(rawInput, exercise) {
  const rad =
    exercise?.expectedRadicand ??
    (typeof exercise?.expected === 'number' ? exercise.expected : NaN);
  return checkRadicalAnswer(rawInput, rad, exercise?.tolerance ?? 0);
}
