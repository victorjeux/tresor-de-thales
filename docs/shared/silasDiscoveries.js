/**
 * Trois découvertes du stade silas (p1_7_finale).
 * Une découverte n’est validée qu’à la fermeture complète du dialogue.
 */

export const SILAS_DISCOVERY_IDS = {
  opt_empreintes_p7: 'footprintsCompleted',
  silas_passage: 'passageCompleted',
  silas_traces: 'tracesCompleted',
};

export const SILAS_HOTSPOT_IDS = Object.keys(SILAS_DISCOVERY_IDS);

/**
 * @returns {{
 *   footprintsCompleted: boolean,
 *   passageCompleted: boolean,
 *   tracesCompleted: boolean,
 *   completionDialogShown: boolean,
 * }}
 */
export function getSilasDiscoveries(progress = {}) {
  const raw = progress.silasDiscoveries || {};
  return {
    footprintsCompleted: Boolean(raw.footprintsCompleted),
    passageCompleted: Boolean(raw.passageCompleted),
    tracesCompleted: Boolean(raw.tracesCompleted),
    completionDialogShown: Boolean(raw.completionDialogShown),
  };
}

/**
 * @param {object} progress
 * @param {string} hotspotId
 */
export function markSilasDiscoveryComplete(progress, hotspotId) {
  const field = SILAS_DISCOVERY_IDS[hotspotId];
  const prev = getSilasDiscoveries(progress);
  if (!field) {
    return { progress, changed: false, discoveries: prev };
  }
  if (prev[field]) {
    return { progress, changed: false, discoveries: prev };
  }
  const next = { ...prev, [field]: true };
  return {
    progress: { ...progress, silasDiscoveries: next },
    changed: true,
    discoveries: next,
  };
}

export function allSilasDiscoveriesCompleted(progress) {
  const d = getSilasDiscoveries(progress);
  return Boolean(
    d.footprintsCompleted && d.passageCompleted && d.tracesCompleted,
  );
}

export function countSilasDiscoveriesCompleted(progress) {
  const d = getSilasDiscoveries(progress);
  return (
    Number(d.footprintsCompleted) +
    Number(d.passageCompleted) +
    Number(d.tracesCompleted)
  );
}

/**
 * Prompt selon le nombre de découvertes terminées (0–3).
 */
export function silasDiscoveryPrompt(progress) {
  const n = countSilasDiscoveriesCompleted(progress);
  if (n >= 3) {
    return null; // dialogue final / transition
  }
  if (n === 0) {
    return 'Examinez les trois indices avant de poursuivre.';
  }
  if (n === 1) {
    return 'Deux indices restent à examiner.';
  }
  return 'Il reste encore un indice à examiner.';
}

/**
 * Migration des profils bloqués sur silas (correctifs précédents).
 * N’initialise à false que si part1 n’est pas terminée.
 * Ne convertit PAS interacted/silasClues en « dialogue entièrement lu ».
 *
 * @param {object} progress
 */
export function migrateSilasDiscoveries(progress = {}) {
  const partDone = (progress.completedParts || []).includes('part1');
  if (partDone) {
    // Laisser tel quel
    return { progress, migrated: false };
  }

  let p = { ...progress };
  let migrated = false;

  // Toujours s’assurer que la structure existe
  if (!p.silasDiscoveries || typeof p.silasDiscoveries !== 'object') {
    p = {
      ...p,
      silasDiscoveries: {
        footprintsCompleted: false,
        passageCompleted: false,
        tracesCompleted: false,
        completionDialogShown: false,
      },
    };
    migrated = true;
  } else {
    // Normaliser les champs manquants sans forcer true
    const d = getSilasDiscoveries(p);
    p = { ...p, silasDiscoveries: d };
  }

  // Profils bloqués sur silas (part1 non terminée) :
  // - ne pas auto-ouvrir le dialogue final ;
  // - ne pas faire confiance à silasClues/interacted pour « dialogue entièrement lu » ;
  // - permettre de rejouer proprement les 3 dialogues.
  const stage = p.visualStages?.p1_7_finale;
  const onSilas =
    stage === 'silas' || p.currentSceneId === 'p1_7_finale';
  const hasLegacyClues = Boolean(progress.silasClues);
  const stuckOnSilas =
    onSilas &&
    !partDone &&
    (hasLegacyClues ||
      p.silasDiscoveries?.completionDialogShown ||
      // Ancienne save sans structure fiable
      (!progress.silasDiscoveries && onSilas));

  if (stuckOnSilas) {
    p = {
      ...p,
      silasDiscoveries: {
        footprintsCompleted: false,
        passageCompleted: false,
        tracesCompleted: false,
        completionDialogShown: false,
      },
    };
    migrated = true;
  }

  // Nettoyer l’ancienne clé silasClues si présente
  if (p.silasClues) {
    const { silasClues: _drop, ...rest } = p;
    p = rest;
    migrated = true;
  }

  return { progress: p, migrated };
}

/**
 * Les 6 ordres possibles de 3 hotspots.
 */
export function silasDiscoveryOrders() {
  const ids = ['opt_empreintes_p7', 'silas_passage', 'silas_traces'];
  const out = [];
  const perm = (arr, m = []) => {
    if (!arr.length) {
      out.push(m);
      return;
    }
    for (let i = 0; i < arr.length; i += 1) {
      perm(
        arr.slice(0, i).concat(arr.slice(i + 1)),
        m.concat([arr[i]]),
      );
    }
  };
  perm(ids);
  return out;
}
