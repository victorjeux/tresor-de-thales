/**
 * Serveur unique : API REST + fichiers statiques du client.
 * Configuration via variables d'environnement (voir .env.example).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { openDatabase, createPlayerQueries } from './db.js';
import { createApiRouter } from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const sharedDir = path.join(rootDir, 'shared');

const PORT = Number(process.env.PORT) || 3000;
const SQLITE_PATH = process.env.SQLITE_PATH || 'data/jeu.sqlite';
const SQLITE_BUSY_TIMEOUT = Number(process.env.SQLITE_BUSY_TIMEOUT) || 5000;

const db = openDatabase(SQLITE_PATH, { busyTimeout: SQLITE_BUSY_TIMEOUT });
const queries = createPlayerQueries(db);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.use('/api', createApiRouter(queries));

// Modules partagés (pseudo, progression, file d'attente) pour le navigateur
app.use('/shared', express.static(sharedDir, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  },
}));

// Front statique (HTML, CSS, JS, contenu, KaTeX local)
app.use(express.static(clientDir, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// SPA : index.html uniquement pour la navigation applicative.
// Les assets manquants doivent renvoyer 404 (pas de faux 200 HTML).
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const staticPrefixes = [
    '/assets/',
    '/content/',
    '/vendor/',
    '/shared/',
    '/css/',
    '/js/',
  ];
  if (staticPrefixes.some((p) => req.path.startsWith(p))) {
    return res.status(404).type('text/plain').send('Fichier introuvable');
  }
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Gestion d'erreurs JSON
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    error: 'Erreur interne du serveur. Réessayez dans un instant.',
  });
});

const server = app.listen(PORT, () => {
  console.log(`Le Trésor de Thalès — http://localhost:${PORT}`);
  console.log(`Base SQLite : ${SQLITE_PATH}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { app, db };
