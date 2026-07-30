/**
 * Résolution de la partie à jouer (partagé tests / client).
 */
import { canOpenPart, PART_ORDER } from './progression.js';

/** Parties pour lesquelles un contenu JSON est disponible côté client */
export const AVAILABLE_PART_IDS = [
  'prologue',
  'part1',
  'part2',
  'part3',
  'part4',
  'part5',
  'part6',
  'part7',
];

/**
 * @param {object} progress
 * @param {string[]} [availablePartIds]
 * @returns {'prologue'|'part1'|'part2'|'part3'|'part4'|'part5'|'part6'|'part7'|'completed'|'waiting'|string}
 */
export function resolvePartToPlay(
  progress = {},
  availablePartIds = AVAILABLE_PART_IDS,
) {
  const available = new Set(availablePartIds);
  const completed = new Set(progress.completedParts || []);
  let current = progress.currentPartId || 'prologue';

  // Fin du jeu : partie 7 terminée
  if (completed.has('part7') || progress.flags?.gameCompleted) {
    return 'completed';
  }

  if (!available.has(current)) {
    // Partie non encore implémentée → écran d’attente
    if (completed.has('part7') || current === 'completed') return 'completed';
    if (completed.has('part6') && available.has('part7')) return 'part7';
    if (completed.has('part6') || current === 'part7') return 'waiting';
    if (completed.has('part5') && available.has('part6')) return 'part6';
    if (completed.has('part4') && available.has('part5')) return 'part5';
    if (completed.has('part3') && available.has('part4')) return 'part4';
    if (completed.has('part2') && available.has('part3')) return 'part3';
    if (completed.has('part1') && available.has('part2')) return 'part2';
    if (completed.has('prologue') && available.has('part1')) return 'part1';
    return 'prologue';
  }

  if (completed.has(current)) {
    const idx = PART_ORDER.indexOf(current);
    const next = idx >= 0 ? PART_ORDER[idx + 1] : null;
    if (next && available.has(next) && canOpenPart(next, progress)) {
      return next;
    }
    if (next && !available.has(next) && canOpenPart(next, progress)) {
      return 'waiting';
    }
    // Plus de suite dans l’ordre → aventure terminée
    if (!next) {
      return 'completed';
    }
  }

  if (canOpenPart(current, progress)) {
    return current;
  }

  if (!completed.has('prologue')) return 'prologue';
  if (!completed.has('part1') && available.has('part1') && canOpenPart('part1', progress)) {
    return 'part1';
  }
  if (!completed.has('part2') && available.has('part2') && canOpenPart('part2', progress)) {
    return 'part2';
  }
  if (!completed.has('part3') && available.has('part3') && canOpenPart('part3', progress)) {
    return 'part3';
  }
  if (!completed.has('part4') && available.has('part4') && canOpenPart('part4', progress)) {
    return 'part4';
  }
  if (!completed.has('part5') && available.has('part5') && canOpenPart('part5', progress)) {
    return 'part5';
  }
  if (!completed.has('part6') && available.has('part6') && canOpenPart('part6', progress)) {
    return 'part6';
  }
  if (!completed.has('part7') && available.has('part7') && canOpenPart('part7', progress)) {
    return 'part7';
  }
  return 'waiting';
}
