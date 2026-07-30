import crypto from 'node:crypto';

/** Identifiant technique opaque (session, joueur, événements). */
export function createOpaqueId(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function nowIso() {
  return new Date().toISOString();
}
