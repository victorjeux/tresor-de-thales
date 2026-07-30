/**
 * Suivi professeur : indices pédagogiques réellement consultés (ouverts / affichés).
 *
 * - Compte les aides Maki (niveaux 1–3) au moment de l’affichage uniquement.
 * - Ne compte pas les indices débloqués non ouverts, ni les objets d’ambiance
 *   (boussole, décors narratifs, découvertes Silas scénaristiques).
 * - total = nombre d’indices distincts ; uniques évite le double comptage.
 */

/**
 * @typedef {{
 *   total: number,
 *   uniques: Record<string, true>,
 *   historique: Array<{
 *     id: string,
 *     sceneId?: string|null,
 *     partId?: string|null,
 *     label?: string,
 *     timestamp?: string,
 *     exerciseId?: string,
 *     hintLevel?: number,
 *   }>
 * }} IndicesConsultes
 */

/**
 * Structure vide pour un profil neuf ou une migration.
 * @returns {IndicesConsultes}
 */
export function emptyIndicesConsultes() {
  return {
    total: 0,
    uniques: {},
    historique: [],
  };
}

/**
 * Normalise une structure partielle / corrompue.
 * total est toujours dérivé des uniques (source de vérité).
 * @param {unknown} raw
 * @returns {IndicesConsultes}
 */
export function normalizeIndicesConsultes(raw) {
  if (!raw || typeof raw !== 'object') return emptyIndicesConsultes();
  const src = /** @type {Record<string, unknown>} */ (raw);

  const uniques = {};
  if (src.uniques && typeof src.uniques === 'object' && !Array.isArray(src.uniques)) {
    for (const [key, value] of Object.entries(
      /** @type {Record<string, unknown>} */ (src.uniques),
    )) {
      if (value) uniques[String(key)] = true;
    }
  }

  const historique = Array.isArray(src.historique)
    ? src.historique
        .filter((h) => h && typeof h === 'object')
        .map((h) => {
          const entry = /** @type {Record<string, unknown>} */ (h);
          const id = entry.id != null ? String(entry.id) : '';
          if (!id) return null;
          /** @type {IndicesConsultes['historique'][number]} */
          const row = {
            id,
            sceneId:
              entry.sceneId == null || entry.sceneId === ''
                ? null
                : String(entry.sceneId),
            partId:
              entry.partId == null || entry.partId === ''
                ? null
                : String(entry.partId),
            label:
              entry.label == null || entry.label === ''
                ? 'Indice de Maki'
                : String(entry.label),
            timestamp:
              entry.timestamp == null
                ? null
                : String(entry.timestamp),
          };
          if (entry.exerciseId != null && entry.exerciseId !== '') {
            row.exerciseId = String(entry.exerciseId);
          }
          if (entry.hintLevel != null && Number.isFinite(Number(entry.hintLevel))) {
            row.hintLevel = Number(entry.hintLevel);
          }
          return row;
        })
        .filter(Boolean)
    : [];

  // Reconstruire uniques manquants depuis l’historique si besoin
  for (const row of historique) {
    if (row?.id) uniques[row.id] = true;
  }

  return {
    total: Object.keys(uniques).length,
    uniques,
    historique,
  };
}

/**
 * Migre un profil sans indicesConsultes (ou structure invalide).
 * Ne casse pas les autres champs de sauvegarde.
 * @param {object} progress
 * @returns {{ progress: object, migrated: boolean }}
 */
export function ensureIndicesConsultes(progress = {}) {
  const p = progress && typeof progress === 'object' ? progress : {};
  const had =
    p.indicesConsultes &&
    typeof p.indicesConsultes === 'object' &&
    !Array.isArray(p.indicesConsultes) &&
    p.indicesConsultes.uniques &&
    typeof p.indicesConsultes.uniques === 'object' &&
    Array.isArray(p.indicesConsultes.historique);

  const normalized = normalizeIndicesConsultes(p.indicesConsultes);
  const sameTotal =
    had && Number(p.indicesConsultes.total) === normalized.total;
  const migrated = !had || !sameTotal;

  return {
    progress: { ...p, indicesConsultes: normalized },
    migrated: Boolean(migrated),
  };
}

/**
 * Identifiant stable d’un indice pédagogique Maki.
 * Ex. p1_4_hypotenuse_indice_1
 * @param {string} exerciseId
 * @param {number} hintLevel
 */
export function makeHintConsultId(exerciseId, hintLevel) {
  return `${String(exerciseId || '').trim()}_indice_${Number(hintLevel)}`;
}

/**
 * Enregistre qu’un indice a été réellement affiché à l’élève.
 * Idempotent sur l’id : total ne monte qu’une fois par indice distinct.
 *
 * @param {object} progress
 * @param {{
 *   id?: string,
 *   exerciseId?: string,
 *   hintLevel?: number,
 *   sceneId?: string|null,
 *   partId?: string|null,
 *   label?: string,
 *   timestamp?: string,
 * }} hintInfo
 * @returns {{
 *   progress: object,
 *   isNew: boolean,
 *   changed: boolean,
 *   total: number,
 *   id: string|null,
 * }}
 */
export function recordHintConsulted(progress, hintInfo = {}) {
  const ensured = ensureIndicesConsultes(progress);
  let p = ensured.progress;
  const ic = normalizeIndicesConsultes(p.indicesConsultes);

  const id =
    (hintInfo.id != null && String(hintInfo.id).trim()) ||
    (hintInfo.exerciseId != null &&
    hintInfo.hintLevel != null &&
    Number.isFinite(Number(hintInfo.hintLevel))
      ? makeHintConsultId(hintInfo.exerciseId, hintInfo.hintLevel)
      : null);

  if (!id) {
    return {
      progress: p,
      isNew: false,
      changed: ensured.migrated,
      total: ic.total,
      id: null,
    };
  }

  if (ic.uniques[id]) {
    return {
      progress: { ...p, indicesConsultes: ic },
      isNew: false,
      changed: ensured.migrated,
      total: ic.total,
      id,
    };
  }

  const entry = {
    id,
    sceneId:
      hintInfo.sceneId == null || hintInfo.sceneId === ''
        ? null
        : String(hintInfo.sceneId),
    partId:
      hintInfo.partId == null || hintInfo.partId === ''
        ? null
        : String(hintInfo.partId),
    label: hintInfo.label || 'Indice de Maki',
    timestamp: hintInfo.timestamp || new Date().toISOString(),
  };
  if (hintInfo.exerciseId != null && hintInfo.exerciseId !== '') {
    entry.exerciseId = String(hintInfo.exerciseId);
  }
  if (
    hintInfo.hintLevel != null &&
    Number.isFinite(Number(hintInfo.hintLevel))
  ) {
    entry.hintLevel = Number(hintInfo.hintLevel);
  }

  ic.uniques[id] = true;
  ic.historique = [...ic.historique, entry];
  ic.total = Object.keys(ic.uniques).length;

  return {
    progress: { ...p, indicesConsultes: ic },
    isNew: true,
    changed: true,
    total: ic.total,
    id,
  };
}

/**
 * Alias demandé pour réutilisation dans les parties suivantes.
 * @param {object} progress
 * @param {string} hintId
 * @param {object} [metadata]
 */
export function markHintConsulted(progress, hintId, metadata = {}) {
  return recordHintConsulted(progress, {
    ...metadata,
    id: hintId || metadata.id,
  });
}

/**
 * @param {object} progress
 * @returns {number}
 */
export function getIndicesConsultesTotal(progress) {
  return normalizeIndicesConsultes(progress?.indicesConsultes).total;
}

/**
 * Résumé compact pour l’export / API professeur.
 * @param {object} progress
 */
export function teacherHintSummary(progress) {
  const ic = normalizeIndicesConsultes(progress?.indicesConsultes);
  return {
    total: ic.total,
    uniques: { ...ic.uniques },
    historique: ic.historique.map((h) => ({ ...h })),
  };
}
