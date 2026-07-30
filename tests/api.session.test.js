/**
 * Tests d’intégration légers de la session / sauvegarde (SQLite en mémoire fichier temp).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase, createPlayerQueries } from '../server/db.js';
import { createApiRouter } from '../server/routes/api.js';
import express from 'express';
import http from 'node:http';

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function jsonFetch(port, method, urlPath, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

describe('API session et progression', () => {
  /** @type {import('node:http').Server} */
  let server;
  let port;
  let dbPath;
  let db;

  before(async () => {
    dbPath = path.join(os.tmpdir(), `thales-test-${Date.now()}.sqlite`);
    db = openDatabase(dbPath, { busyTimeout: 3000 });
    const q = createPlayerQueries(db);
    const app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(q));
    const listened = await listen(app);
    server = listened.server;
    port = listened.port;
  });

  after(() => {
    return new Promise((resolve) => {
      server.close(() => {
        db.close();
        for (const suffix of ['', '-wal', '-shm']) {
          try {
            fs.unlinkSync(dbPath + suffix);
          } catch {
            /* ignore */
          }
        }
        resolve();
      });
    });
  });

  it('crée une session sans mettre le pseudo dans l’URL', async () => {
    const { status, data } = await jsonFetch(port, 'POST', '/api/session', {
      pseudo: '  Capitaine Léo ',
    });
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.isNew, true);
    assert.ok(data.token);
    assert.equal(data.pseudoDisplay, 'Capitaine Léo');
    assert.equal(data.progress.currentPartId, 'prologue');
  });

  it('recharge la même partie pour un pseudo canoniquement identique', async () => {
    const first = await jsonFetch(port, 'POST', '/api/session', {
      pseudo: 'Marie-Anne',
    });
    const token1 = first.data.token;

    await jsonFetch(
      port,
      'PUT',
      '/api/progress',
      {
        progress: {
          currentPartId: 'prologue',
          currentSceneId: 'p0_s2',
          completedParts: [],
          completedScenes: ['p0_s1'],
          flags: {},
        },
      },
      token1,
    );

    const second = await jsonFetch(port, 'POST', '/api/session', {
      pseudo: 'marie-anne',
    });
    assert.equal(second.data.isNew, false);
    assert.equal(second.data.progress.currentSceneId, 'p0_s2');
    assert.deepEqual(second.data.progress.completedScenes, ['p0_s1']);
  });

  it('refuse un pseudo invalide', async () => {
    const { status, data } = await jsonFetch(port, 'POST', '/api/session', {
      pseudo: 'ab',
    });
    assert.equal(status, 400);
    assert.equal(data.ok, false);
  });

  it('enregistre une réponse de façon idempotente (clientEventId)', async () => {
    const session = await jsonFetch(port, 'POST', '/api/session', {
      pseudo: 'TestIdem',
    });
    const token = session.data.token;
    const body = {
      exerciseId: 'ex_demo',
      rawAnswer: '5',
      isCorrect: true,
      clientEventId: 'client-evt-42',
    };
    const a = await jsonFetch(port, 'POST', '/api/answer', body, token);
    const b = await jsonFetch(port, 'POST', '/api/answer', body, token);
    assert.equal(a.data.ok, true);
    assert.equal(a.data.duplicate, false);
    assert.equal(b.data.duplicate, true);
    assert.equal(a.data.attemptNo, b.data.attemptNo);
  });

  it('protège les routes avec le token opaque', async () => {
    const { status } = await jsonFetch(port, 'GET', '/api/me');
    assert.equal(status, 401);
  });
});
