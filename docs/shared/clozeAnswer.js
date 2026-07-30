/**
 * Validation des rédactions à trous (réciproque de Pythagore, etc.).
 * Champs courts : choix, symbolisons, sommets — pas de phrases libres.
 */
import { parseNumericInput } from './numericAnswer.js';
// parseNumericInput used for unordered numeric sets

/**
 * Normalise une saisie texte pour comparaison (espaces, apostrophes).
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeClozeText(raw) {
  if (raw == null) return '';
  return String(raw)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['’]/g, "'")
    .toLocaleLowerCase('fr-FR');
}

/**
 * Compare un champ unique à sa définition.
 * @param {unknown} rawValue
 * @param {{
 *   kind?: 'select'|'choice'|'number'|'numeric'|'text',
 *   expected?: string|number|string[],
 *   accept?: Array<string|number>,
 *   tolerance?: number,
 * }} field
 * @returns {{ ok: boolean, reason?: string, parsed?: unknown }}
 */
export function checkClozeField(rawValue, field = {}) {
  const kind = field.kind || 'text';
  const empty =
    rawValue == null ||
    (typeof rawValue === 'string' && rawValue.trim() === '');

  if (empty) {
    return { ok: false, reason: 'Complète tous les champs.' };
  }

  if (kind === 'number' || kind === 'numeric') {
    const acceptList = Array.isArray(field.accept) ? field.accept : [];
    const rawStr = String(rawValue).trim();
    // Acceptation de formes textuelles exactes (0,60 / 0.6 …)
    for (const a of acceptList) {
      if (normalizeClozeText(rawStr) === normalizeClozeText(a)) {
        return { ok: true, parsed: parseNumericInput(rawStr) };
      }
      const na = parseNumericInput(a);
      const np = parseNumericInput(rawStr);
      if (na != null && np != null && Math.abs(na - np) <= (field.tolerance ?? 1e-9)) {
        return { ok: true, parsed: np };
      }
    }

    const expectedNum =
      typeof field.expected === 'number'
        ? field.expected
        : parseNumericInput(field.expected);
    if (expectedNum == null) {
      return { ok: false, reason: 'Définition de champ invalide.' };
    }
    const tol =
      typeof field.tolerance === 'number' && Number.isFinite(field.tolerance)
        ? field.tolerance
        : 1e-9;
    const parsed = parseNumericInput(rawValue);
    if (parsed == null) {
      return {
        ok: false,
        parsed: null,
        reason:
          'Saisie non numérique. Utilise des chiffres, avec une virgule ou un point.',
      };
    }
    const ok = Math.abs(parsed - expectedNum) <= tol;
    return {
      ok,
      parsed,
      reason: ok
        ? undefined
        : 'Ce n’est pas la bonne valeur. Relis l’énoncé ou utilise un indice.',
    };
  }

  // select / choice / text
  const expectedList = Array.isArray(field.expected)
    ? field.expected
    : field.expected != null
      ? [field.expected]
      : [];
  const acceptList = Array.isArray(field.accept) ? field.accept : [];
  const candidates = [...expectedList, ...acceptList];
  if (!candidates.length) {
    return { ok: false, reason: 'Définition de champ invalide.' };
  }

  const norm = normalizeClozeText(rawValue);
  const ok = candidates.some((c) => normalizeClozeText(c) === norm);
  return {
    ok,
    parsed: String(rawValue).trim(),
    reason: ok
      ? undefined
      : 'Ce n’est pas la bonne réponse. Relis l’énoncé ou utilise un indice.',
  };
}

/**
 * Indique si une valeur numérique appartient à un des centres (avec tolérance).
 * @param {number} val
 * @param {number[]} centers
 * @param {number} tol
 * @returns {number} index du centre ou -1
 */
function matchNumericCenter(val, centers, tol) {
  for (let i = 0; i < centers.length; i += 1) {
    if (Math.abs(val - centers[i]) <= tol) return i;
  }
  return -1;
}

/**
 * Vérifie l’ensemble des champs d’une rédaction.
 * @param {Record<string, unknown>} answers
 * @param {Record<string, object>} fields
 * @param {{
 *   unorderedNumericFields?: string[],
 *   unorderedNumericExpected?: number[],
 *   tolerance?: number,
 *   coherentNumericGroups?: {
 *     fields: string[],
 *     groups: Array<{ center: number, tolerance?: number } | number>,
 *     mixedReason?: string,
 *   },
 * }} [opts]
 * @returns {{
 *   ok: boolean,
 *   wrongIds: string[],
 *   results: Record<string, { ok: boolean, reason?: string }>,
 * }}
 */
export function checkClozeAnswers(answers = {}, fields = {}, opts = {}) {
  const results = {};
  const wrongIds = [];
  const ids = Object.keys(fields || {});
  if (!ids.length) {
    return { ok: false, wrongIds: [], results: {} };
  }

  const unordered = Array.isArray(opts.unorderedNumericFields)
    ? opts.unorderedNumericFields
    : [];
  const expectedSet = Array.isArray(opts.unorderedNumericExpected)
    ? opts.unorderedNumericExpected.map(Number)
    : [];
  const tol =
    typeof opts.tolerance === 'number' && Number.isFinite(opts.tolerance)
      ? opts.tolerance
      : 1e-9;

  if (unordered.length >= 2 && expectedSet.length === unordered.length) {
    const parsed = unordered.map((id) => parseNumericInput(answers[id]));
    const used = new Set();
    let allOk = true;
    for (let i = 0; i < unordered.length; i += 1) {
      const id = unordered[i];
      const val = parsed[i];
      if (val == null) {
        results[id] = {
          ok: false,
          reason:
            'Saisie non numérique. Utilise des chiffres, avec une virgule ou un point.',
        };
        wrongIds.push(id);
        allOk = false;
        continue;
      }
      let matched = false;
      for (let j = 0; j < expectedSet.length; j += 1) {
        if (used.has(j)) continue;
        if (Math.abs(val - expectedSet[j]) <= tol) {
          used.add(j);
          matched = true;
          break;
        }
      }
      results[id] = matched
        ? { ok: true, parsed: val }
        : {
            ok: false,
            parsed: val,
            reason: 'Ce n’est pas la bonne valeur. Relis l’énoncé.',
          };
      if (!matched) {
        wrongIds.push(id);
        allOk = false;
      }
    }
    // Autres champs hors paire
    for (const id of ids) {
      if (unordered.includes(id)) continue;
      const r = checkClozeField(answers[id], fields[id]);
      results[id] = r;
      if (!r.ok) wrongIds.push(id);
    }
    return {
      ok: wrongIds.length === 0 && allOk,
      wrongIds,
      results,
    };
  }

  for (const id of ids) {
    const r = checkClozeField(answers[id], fields[id]);
    results[id] = r;
    if (!r.ok) wrongIds.push(id);
  }

  // Cohérence des rapports (même sens : 0,6/0,6 ou 1,67/1,67, pas un mélange)
  const coh = opts.coherentNumericGroups;
  if (
    coh &&
    Array.isArray(coh.fields) &&
    coh.fields.length >= 2 &&
    Array.isArray(coh.groups) &&
    coh.groups.length >= 2
  ) {
    const pairIds = coh.fields;
    const groups = coh.groups.map((g) => {
      if (typeof g === 'number') {
        return { center: g, tolerance: 0.005 };
      }
      return {
        center: Number(g.center),
        tolerance:
          typeof g.tolerance === 'number' && Number.isFinite(g.tolerance)
            ? g.tolerance
            : 0.005,
      };
    });
    const allPresentOk = pairIds.every(
      (id) => results[id]?.ok && parseNumericInput(answers[id]) != null,
    );
    if (allPresentOk) {
      const groupIndexes = pairIds.map((id) => {
        const val = parseNumericInput(answers[id]);
        for (let gi = 0; gi < groups.length; gi += 1) {
          if (Math.abs(val - groups[gi].center) <= groups[gi].tolerance) {
            return gi;
          }
        }
        return -1;
      });
      const first = groupIndexes[0];
      const same =
        first >= 0 && groupIndexes.every((gi) => gi === first);
      if (!same) {
        const mixedReason =
          coh.mixedReason ||
          'Tes deux calculs sont bons séparément, mais tu as changé de sens entre les deux rapports. Reprends les deux rapports dans le même sens.';
        for (const id of pairIds) {
          results[id] = {
            ok: false,
            parsed: parseNumericInput(answers[id]),
            reason: mixedReason,
          };
          if (!wrongIds.includes(id)) wrongIds.push(id);
        }
      }
    }
  }

  return {
    ok: wrongIds.length === 0,
    wrongIds,
    results,
  };
}

/**
 * Extrait les valeurs de champs depuis un conteneur DOM (tests / moteur).
 * @param {ParentNode} root
 * @param {string[]} fieldIds
 */
export function readClozeAnswersFromDom(root, fieldIds) {
  const out = {};
  for (const id of fieldIds) {
    const el = root.querySelector(`[data-cloze-field="${id}"]`);
    if (!el) {
      out[id] = '';
      continue;
    }
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') {
      out[id] = el.value;
    } else if (el.getAttribute('data-value') != null) {
      out[id] = el.getAttribute('data-value');
    } else {
      out[id] = el.value ?? el.textContent ?? '';
    }
  }
  return out;
}
