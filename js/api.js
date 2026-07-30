/**
 * Couche API client + file d'attente (import du module partagé).
 */
import { createSaveManager } from '/shared/saveQueue.js';

export const saveManager = createSaveManager({ baseUrl: '' });

/** Resync périodique + au retour en ligne */
export function startConnectivityWatch() {
  const tryFlush = () => {
    saveManager.flushQueue().catch(() => {});
  };

  window.addEventListener('online', tryFlush);
  setInterval(tryFlush, 8000);

  // Premier essai si file non vide
  tryFlush();
}
