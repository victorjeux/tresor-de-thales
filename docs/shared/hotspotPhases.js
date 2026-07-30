/**
 * Progression des hotspots multi-phases (ex. lettre de Thalès).
 * Pure / testable — sans DOM.
 */

/**
 * @param {object|null|undefined} sceneHotspot
 * @param {string} hotspotId
 * @returns {{ phaseIndex: number, completed: boolean }}
 */
export function getPhaseProgress(sceneHotspot, hotspotId) {
  const phaseIndex = Math.max(
    0,
    Number(sceneHotspot?.phaseIndex?.[hotspotId]) || 0,
  );
  const completedList = sceneHotspot?.phaseCompleted || [];
  const completed = Array.isArray(completedList)
    ? completedList.includes(hotspotId)
    : Boolean(completedList?.[hotspotId]);
  return { phaseIndex, completed };
}

/**
 * Décide l’action d’un clic sur un hotspot multi-phases.
 * @param {{ phaseIndex: number, completed: boolean, totalPhases: number }} p
 * @returns {{ kind: 'play'|'replay', phaseIndex: number, isLast: boolean }}
 */
export function resolvePhaseClick({ phaseIndex, completed, totalPhases }) {
  const total = Math.max(0, Number(totalPhases) || 0);
  if (total === 0) {
    return { kind: 'replay', phaseIndex: 0, isLast: true };
  }
  if (completed || phaseIndex >= total) {
    return { kind: 'replay', phaseIndex: total - 1, isLast: true };
  }
  const idx = Math.max(0, Math.min(phaseIndex, total - 1));
  return {
    kind: 'play',
    phaseIndex: idx,
    isLast: idx === total - 1,
  };
}

/**
 * Après fermeture d’une partie de message.
 * @param {{ phaseIndex: number, totalPhases: number }} p
 */
export function afterPhaseClosed({ phaseIndex, totalPhases }) {
  const total = Math.max(0, Number(totalPhases) || 0);
  const current = Math.max(0, Number(phaseIndex) || 0);
  const next = current + 1;
  if (next >= total) {
    return { phaseIndex: total, completed: true };
  }
  return { phaseIndex: next, completed: false };
}

/**
 * Répare une sauvegarde où un hotspot multi-phases a été marqué
 * « interacted » trop tôt (régression rejeu) alors que la lecture n’est
 * pas terminée.
 *
 * @param {object|null|undefined} sceneHotspot état sauvegardé de la scène
 * @param {{ id: string, phases?: object[] }} hotspot
 * @param {{ sceneCompleted?: boolean }} [opts]
 */
export function repairPhasedHotspotState(sceneHotspot, hotspot, opts = {}) {
  const base = {
    interacted: [...(sceneHotspot?.interacted || [])],
    examined: [...(sceneHotspot?.examined || [])],
    phaseIndex: { ...(sceneHotspot?.phaseIndex || {}) },
    phaseCompleted: [...(sceneHotspot?.phaseCompleted || [])],
  };
  if (!hotspot?.phases?.length) return base;

  const id = hotspot.id;
  const total = hotspot.phases.length;
  let idx = Math.max(0, Number(base.phaseIndex[id]) || 0);
  const phaseDone = base.phaseCompleted.includes(id);
  const wasInteracted = base.interacted.includes(id);

  // Scène déjà terminée : considérer les phases comme lues
  if (opts.sceneCompleted) {
    if (!phaseDone) base.phaseCompleted.push(id);
    base.phaseIndex[id] = total;
    if (!base.interacted.includes(id)) base.interacted.push(id);
    return base;
  }

  // Régression : marqué interacted dès le 1er clic, sans phaseCompleted
  if (wasInteracted && !phaseDone && idx < total) {
    base.interacted = base.interacted.filter((x) => x !== id);
    // Si phaseIndex n’a jamais été persisté (0) mais un clic a eu lieu,
    // on reprend à 0 pour relire sans bloquer ; si un index > 0 existe, on le garde.
    base.phaseIndex[id] = idx;
  }

  // Cohérence : phaseCompleted ⇒ index au bout + interacted
  if (phaseDone) {
    base.phaseIndex[id] = total;
    if (!base.interacted.includes(id)) base.interacted.push(id);
  }

  return base;
}
