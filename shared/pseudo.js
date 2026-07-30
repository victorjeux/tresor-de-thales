/**
 * Normalisation et validation des pseudos (partagé client / serveur / tests).
 *
 * - 3 à 24 caractères (après normalisation d'affichage)
 * - lettres (y compris accentuées), chiffres, espaces, tirets, underscores
 * - trim des extrémités, espaces multiples → un seul
 * - forme d'affichage conservée (casse d'origine après nettoyage des espaces)
 * - forme canonique : minuscules pour comparaison / unicité
 */

const PSEUDO_MIN = 3;
const PSEUDO_MAX = 24;

/** Caractères autorisés après normalisation d'affichage */
const PSEUDO_PATTERN = /^[\p{L}0-9 _-]+$/u;

/**
 * Réduit les espaces et retire les extrémités, sans changer la casse.
 * @param {unknown} raw
 * @returns {string}
 */
export function cleanPseudoDisplay(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Forme canonique pour unicité (insensible à la casse).
 * @param {string} display
 * @returns {string}
 */
export function toCanonicalPseudo(display) {
  return cleanPseudoDisplay(display).toLocaleLowerCase('fr-FR');
}

/**
 * Valide un pseudo brut saisi par l'élève.
 * @param {unknown} raw
 * @returns {{ ok: true, display: string, canonical: string } | { ok: false, error: string }}
 */
export function validatePseudo(raw) {
  const display = cleanPseudoDisplay(raw);

  if (!display) {
    return { ok: false, error: 'Le pseudo ne peut pas être vide.' };
  }

  if (display.length < PSEUDO_MIN) {
    return {
      ok: false,
      error: `Le pseudo doit contenir au moins ${PSEUDO_MIN} caractères.`,
    };
  }

  if (display.length > PSEUDO_MAX) {
    return {
      ok: false,
      error: `Le pseudo ne doit pas dépasser ${PSEUDO_MAX} caractères.`,
    };
  }

  if (!PSEUDO_PATTERN.test(display)) {
    return {
      ok: false,
      error:
        'Le pseudo ne peut contenir que des lettres, chiffres, espaces, tirets et underscores.',
    };
  }

  return {
    ok: true,
    display,
    canonical: toCanonicalPseudo(display),
  };
}

export const PSEUDO_RULES = {
  min: PSEUDO_MIN,
  max: PSEUDO_MAX,
};
