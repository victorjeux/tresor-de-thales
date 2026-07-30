/**
 * Stades visuels de scène (ex. p1_7_finale) — data-driven, persistés.
 */

/**
 * @param {object} progress
 * @param {string} sceneId
 * @returns {string|null}
 */
export function getVisualStage(progress, sceneId) {
  const map = progress?.visualStages || {};
  const v = map[sceneId];
  return typeof v === 'string' && v ? v : null;
}

/**
 * @param {object} progress
 * @param {string} sceneId
 * @param {string} stageId
 */
export function setVisualStage(progress, sceneId, stageId) {
  const visualStages = { ...(progress?.visualStages || {}) };
  visualStages[sceneId] = String(stageId);
  return { ...progress, visualStages };
}

/**
 * Résout le décor effectif (fond + objets) pour un stade.
 * @param {object} decor scène.decor
 * @param {string|null} stageId
 */
export function resolveDecorForStage(decor = {}, stageId = null) {
  const stages = decor.stages || null;
  if (stageId && stages && stages[stageId]) {
    const st = stages[stageId];
    return {
      background: st.background || decor.background,
      objects: st.objects !== undefined ? st.objects : decor.objects || [],
      stageId,
    };
  }
  const initial = decor.initialStage;
  if (initial && stages && stages[initial]) {
    const st = stages[initial];
    return {
      background: st.background || decor.background,
      objects: st.objects !== undefined ? st.objects : decor.objects || [],
      stageId: initial,
    };
  }
  return {
    background: decor.background,
    objects: decor.objects || [],
    stageId: stageId || initial || null,
  };
}

/**
 * Ordre attendu des stades de la finale part1.
 */
export const P1_FINALE_STAGES = [
  'exterieur',
  'interieur',
  'fragment',
  'silas',
];
