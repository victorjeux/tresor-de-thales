/**
 * Progression linéaire du jeu.
 * Ordre définitif des parties (parties 2–7 hors contenu prototype).
 */

export const PART_ORDER = [
  'prologue',
  'part1', // théorème de Pythagore
  'part2', // réciproque du théorème de Pythagore
  'part3', // triangles semblables
  'part4', // Thalès configuration emboîtée
  'part5', // Thalès configuration papillon
  'part6', // réciproque de Thalès
  'part7', // synthèse type brevet
];

/**
 * Indique si une partie peut être ouverte compte tenu de la progression.
 * Une partie n'est ouverte que si la précédente est terminée
 * (sauf prologue, toujours accessible au départ).
 *
 * @param {string} partId
 * @param {{ completedParts?: string[], currentPartId?: string|null }} progress
 * @returns {boolean}
 */
export function canOpenPart(partId, progress = {}) {
  // Parties techniques de démonstration du moteur (hors parcours élève)
  if (typeof partId === 'string' && partId.startsWith('demo')) {
    return true;
  }

  const completed = new Set(progress.completedParts || []);
  const index = PART_ORDER.indexOf(partId);
  if (index === -1) return false;
  if (index === 0) return true;

  for (let i = 0; i < index; i += 1) {
    if (!completed.has(PART_ORDER[i])) return false;
  }
  return true;
}

/**
 * Partie suivante après un id donné, ou null.
 * @param {string} partId
 * @returns {string|null}
 */
export function nextPartId(partId) {
  const index = PART_ORDER.indexOf(partId);
  if (index === -1 || index >= PART_ORDER.length - 1) return null;
  return PART_ORDER[index + 1];
}

/**
 * Marque une partie comme terminée et avance le curseur de progression.
 * @param {object} progress
 * @param {string} partId
 * @returns {object} nouvelle progression
 */
export function completePart(progress, partId) {
  const completedParts = [...new Set([...(progress.completedParts || []), partId])];
  const next = nextPartId(partId);
  return {
    ...progress,
    completedParts,
    currentPartId: next ?? partId,
    currentSceneId: next ? null : progress.currentSceneId,
  };
}

/**
 * Met à jour la scène courante (après sauvegarde de scène).
 * @param {object} progress
 * @param {string} partId
 * @param {string} sceneId
 */
export function setCurrentScene(progress, partId, sceneId) {
  if (!canOpenPart(partId, progress)) {
    return { ok: false, error: 'Cette partie n’est pas encore débloquée.', progress };
  }
  return {
    ok: true,
    progress: {
      ...progress,
      currentPartId: partId,
      currentSceneId: sceneId,
    },
  };
}

/**
 * Progression initiale pour une nouvelle partie.
 */
export function initialProgress() {
  return {
    currentPartId: 'prologue',
    currentSceneId: null,
    completedParts: [],
    completedScenes: [],
    flags: {},
    /** Indices pédagogiques réellement ouverts (suivi prof) */
    indicesConsultes: {
      total: 0,
      uniques: {},
      historique: [],
    },
  };
}

/**
 * Vérifie qu'on peut entrer dans une scène (partie débloquée).
 * La linéarité fine des scènes est gérée par le moteur (scène suivante).
 */
export function assertLinearAccess(partId, progress) {
  if (!canOpenPart(partId, progress)) {
    return {
      ok: false,
      error: 'Terminez la partie précédente avant de continuer.',
    };
  }
  return { ok: true };
}
