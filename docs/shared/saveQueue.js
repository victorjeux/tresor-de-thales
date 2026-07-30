/**
 * File d'attente locale de sauvegarde (côté navigateur).
 * - Enfile les requêtes en cas de coupure réseau
 * - Resynchronise automatiquement
 * - Évite les doublons via clientEventId
 *
 * Conçue pour être testable hors navigateur (injection de storage + fetch).
 */

const QUEUE_KEY = 'thales_save_queue_v1';
const TOKEN_KEY = 'thales_session_token_v1';
const PROGRESS_KEY = 'thales_progress_cache_v1';
const PSEUDO_KEY = 'thales_pseudo_display_v1';

/**
 * @typedef {{
 *   id: string,
 *   method: string,
 *   path: string,
 *   body: object,
 *   createdAt: string
 * }} QueueItem
 */

/**
 * Progression par défaut (hébergement statique / hors ligne).
 * @returns {object}
 */
export function defaultOfflineProgress() {
  return {
    currentPartId: 'prologue',
    currentSceneId: null,
    completedParts: [],
    completedScenes: [],
    flags: {},
    indicesConsultes: {
      total: 0,
      uniques: {},
      historique: [],
    },
  };
}

/**
 * @param {{
 *   storage?: Storage | { getItem(k:string):string|null, setItem(k:string,v:string):void, removeItem(k:string):void },
 *   fetchFn?: typeof fetch,
 *   baseUrl?: string,
 *   idFn?: () => string,
 *   offlineOnly?: boolean,
 *   allowOfflineFallback?: boolean,
 * }} [deps]
 */
export function createSaveManager(deps = {}) {
  const storage = deps.storage || (typeof localStorage !== 'undefined' ? localStorage : memoryStorage());
  const fetchFn = deps.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  const baseUrl = deps.baseUrl || '';
  const idFn = deps.idFn || defaultId;
  // GitHub Pages / build statique : pas d’API Express
  const offlineOnly = Boolean(
    deps.offlineOnly ??
      (typeof globalThis !== 'undefined' && globalThis.__THALES_OFFLINE__),
  );
  const allowOfflineFallback = Boolean(
    deps.allowOfflineFallback ??
      offlineOnly ??
      (typeof globalThis !== 'undefined' && globalThis.__THALES_OFFLINE__),
  );

  let flushing = false;
  let online = true;
  const listeners = new Set();

  function emit(event, payload) {
    for (const fn of listeners) fn(event, payload);
  }

  function on(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function readQueue() {
    try {
      const raw = storage.getItem(QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeQueue(items) {
    storage.setItem(QUEUE_KEY, JSON.stringify(items));
  }

  function getToken() {
    return storage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) storage.setItem(TOKEN_KEY, token);
    else storage.removeItem(TOKEN_KEY);
  }

  function cacheProgress(progress) {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function getCachedProgress() {
    try {
      const raw = storage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setPseudoDisplay(pseudo) {
    storage.setItem(PSEUDO_KEY, pseudo);
  }

  function getPseudoDisplay() {
    return storage.getItem(PSEUDO_KEY);
  }

  /**
   * Enfile un événement s'il n'existe pas déjà (même id).
   * @param {Omit<QueueItem, 'createdAt'>} item
   */
  function enqueue(item) {
    const queue = readQueue();
    if (queue.some((q) => q.id === item.id)) {
      return { queued: false, duplicate: true };
    }
    queue.push({
      ...item,
      createdAt: new Date().toISOString(),
    });
    writeQueue(queue);
    emit('queued', item);
    return { queued: true, duplicate: false };
  }

  async function apiRequest(method, path, body, { queueOnFail = true, eventId } = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      if (!fetchFn) throw new Error('fetch indisponible');
      const res = await fetchFn(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const err = new Error(data?.error || `Erreur HTTP ${res.status}`);
        err.status = res.status;
        err.data = data;
        // 4xx non liés au réseau : ne pas boucler indéfiniment sauf 401
        if (res.status >= 500 || res.status === 0) throw err;
        throw err;
      }

      online = true;
      emit('online', true);
      return data;
    } catch (err) {
      online = false;
      emit('online', false);
      if (queueOnFail) {
        enqueue({
          id: eventId || idFn(),
          method,
          path,
          body: body || {},
        });
      }
      throw err;
    }
  }

  /**
   * Session 100 % locale (GitHub Pages, hors ligne).
   * @param {string} pseudo
   */
  function openSessionLocal(pseudo) {
    const prev = getPseudoDisplay();
    let progress = getCachedProgress();
    // Nouveau pseudo ou pas de cache → progression neuve
    if (!progress || (prev && prev !== pseudo)) {
      progress = defaultOfflineProgress();
    }
    const token = getToken() || `local_${idFn()}`;
    setToken(token);
    setPseudoDisplay(pseudo);
    cacheProgress(progress);
    online = true;
    return {
      ok: true,
      token,
      pseudoDisplay: pseudo,
      progress,
      offline: true,
      localOnly: true,
    };
  }

  async function openSession(pseudo) {
    if (offlineOnly) {
      return openSessionLocal(pseudo);
    }
    try {
      const data = await apiRequest(
        'POST',
        '/api/session',
        { pseudo },
        { queueOnFail: false },
      );
      if (data?.token) {
        setToken(data.token);
        setPseudoDisplay(data.pseudoDisplay);
        cacheProgress(data.progress);
      }
      return data;
    } catch (err) {
      if (allowOfflineFallback) {
        return openSessionLocal(pseudo);
      }
      throw err;
    }
  }

  async function saveProgress(progress, clientEventId) {
    cacheProgress(progress);
    if (offlineOnly) {
      return { ok: true, offline: true, localOnly: true };
    }
    const eventId = clientEventId || idFn();
    try {
      return await apiRequest(
        'PUT',
        '/api/progress',
        { progress, clientEventId: eventId },
        { queueOnFail: true, eventId },
      );
    } catch (err) {
      return { ok: false, offline: true, error: err.message };
    }
  }

  async function recordAnswer(payload) {
    if (offlineOnly) {
      return { ok: true, offline: true, localOnly: true };
    }
    const eventId = payload.clientEventId || idFn();
    const body = { ...payload, clientEventId: eventId };
    try {
      return await apiRequest('POST', '/api/answer', body, {
        queueOnFail: true,
        eventId,
      });
    } catch (err) {
      return { ok: false, offline: true, error: err.message };
    }
  }

  async function recordHint(payload) {
    if (offlineOnly) {
      return { ok: true, offline: true, localOnly: true };
    }
    const eventId = payload.clientEventId || idFn();
    const body = { ...payload, clientEventId: eventId };
    try {
      return await apiRequest('POST', '/api/hint', body, {
        queueOnFail: true,
        eventId,
      });
    } catch (err) {
      return { ok: false, offline: true, error: err.message };
    }
  }

  /**
   * Vide la file d'attente. Idempotent grâce aux clientEventId côté serveur.
   */
  async function flushQueue() {
    if (flushing) return { flushed: 0, busy: true };
    if (!getToken()) return { flushed: 0, noSession: true };

    flushing = true;
    let flushed = 0;
    try {
      let queue = readQueue();
      while (queue.length > 0) {
        const item = queue[0];
        try {
          const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          };
          const res = await fetchFn(`${baseUrl}${item.path}`, {
            method: item.method,
            headers,
            body: JSON.stringify(item.body),
          });
          if (!res.ok && res.status >= 500) {
            online = false;
            break;
          }
          // 401 : arrêter (session à refaire)
          if (res.status === 401) {
            break;
          }
          // 4xx autres : retirer pour éviter un blocage (doublon déjà traité, etc.)
          queue = queue.slice(1);
          writeQueue(queue);
          flushed += 1;
          online = true;
        } catch {
          online = false;
          break;
        }
      }
      emit('flush', { flushed, remaining: readQueue().length });
      return { flushed, remaining: readQueue().length };
    } finally {
      flushing = false;
    }
  }

  function queueLength() {
    return readQueue().length;
  }

  function isOnline() {
    return online;
  }

  return {
    on,
    openSession,
    saveProgress,
    recordAnswer,
    recordHint,
    flushQueue,
    enqueue,
    readQueue,
    queueLength,
    getToken,
    setToken,
    cacheProgress,
    getCachedProgress,
    getPseudoDisplay,
    setPseudoDisplay,
    isOnline,
    apiRequest,
  };
}

function defaultId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}
