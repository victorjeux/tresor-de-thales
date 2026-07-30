/**
 * Substitution de variables dans les dialogues.
 */

/**
 * Remplace {{playerName}} (et variantes) dans une chaîne.
 * @param {string} text
 * @param {{ playerName?: string }} vars
 * @returns {string}
 */
export function applyDialogueVars(text, vars = {}) {
  if (text == null) return '';
  const name = vars.playerName || 'Aventurier';
  return String(text).replaceAll('{{playerName}}', name);
}

/**
 * Applique les variables à toutes les chaînes d'un arbre simple (lignes, choix).
 * @param {unknown} node
 * @param {{ playerName?: string }} vars
 */
export function applyVarsDeep(node, vars) {
  if (typeof node === 'string') return applyDialogueVars(node, vars);
  if (Array.isArray(node)) return node.map((n) => applyVarsDeep(n, vars));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = applyVarsDeep(v, vars);
    }
    return out;
  }
  return node;
}
