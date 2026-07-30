import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createSaveManager } from '../shared/saveQueue.js';

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

describe('file d’attente de sauvegarde', () => {
  let storage;
  let calls;

  beforeEach(() => {
    storage = memoryStorage();
    calls = [];
  });

  it('enregistre le token après openSession', async () => {
    const fetchFn = async (url, opts) => {
      calls.push({ url, opts });
      return {
        ok: true,
        json: async () => ({
          ok: true,
          token: 'tok_abc',
          pseudoDisplay: 'Léo',
          progress: { currentPartId: 'prologue' },
          isNew: true,
        }),
      };
    };
    const sm = createSaveManager({ storage, fetchFn });
    const data = await sm.openSession('Léo');
    assert.equal(data.token, 'tok_abc');
    assert.equal(sm.getToken(), 'tok_abc');
    assert.equal(sm.getPseudoDisplay(), 'Léo');
  });

  it('enfile une progression si le réseau échoue', async () => {
    const fetchFn = async () => {
      throw new Error('network down');
    };
    const sm = createSaveManager({
      storage,
      fetchFn,
      idFn: () => 'evt-1',
    });
    sm.setToken('tok');
    const res = await sm.saveProgress({ currentPartId: 'demo' }, 'evt-1');
    assert.equal(res.offline, true);
    assert.equal(sm.queueLength(), 1);
    assert.equal(sm.readQueue()[0].id, 'evt-1');
  });

  it('n’ajoute pas de doublon avec le même clientEventId', () => {
    const sm = createSaveManager({ storage, fetchFn: async () => ({}) });
    const a = sm.enqueue({
      id: 'same',
      method: 'PUT',
      path: '/api/progress',
      body: {},
    });
    const b = sm.enqueue({
      id: 'same',
      method: 'PUT',
      path: '/api/progress',
      body: {},
    });
    assert.equal(a.queued, true);
    assert.equal(b.duplicate, true);
    assert.equal(sm.queueLength(), 1);
  });

  it('mode offlineOnly : openSession locale sans API', async () => {
    let fetchCalls = 0;
    const fetchFn = async () => {
      fetchCalls += 1;
      throw new Error('should not call');
    };
    const sm = createSaveManager({
      storage,
      fetchFn,
      offlineOnly: true,
      idFn: () => 'local-1',
    });
    const data = await sm.openSession('Capitaine');
    assert.equal(fetchCalls, 0);
    assert.equal(data.localOnly, true);
    assert.equal(data.pseudoDisplay, 'Capitaine');
    assert.equal(data.progress.currentPartId, 'prologue');
    assert.ok(sm.getToken());
    const saved = await sm.saveProgress({ currentPartId: 'part1' });
    assert.equal(saved.localOnly, true);
    assert.equal(sm.getCachedProgress().currentPartId, 'part1');
    assert.equal(sm.queueLength(), 0);
  });

  it('flush resynchronise et vide la file', async () => {
    let n = 0;
    const fetchFn = async (url, opts) => {
      n += 1;
      calls.push({ url, method: opts.method });
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };
    const sm = createSaveManager({ storage, fetchFn });
    sm.setToken('tok');
    sm.enqueue({
      id: 'e1',
      method: 'PUT',
      path: '/api/progress',
      body: { progress: { x: 1 } },
    });
    sm.enqueue({
      id: 'e2',
      method: 'POST',
      path: '/api/answer',
      body: { exerciseId: 'ex1', isCorrect: true },
    });
    assert.equal(sm.queueLength(), 2);
    const result = await sm.flushQueue();
    assert.equal(result.flushed, 2);
    assert.equal(sm.queueLength(), 0);
    assert.equal(n, 2);
  });
});
