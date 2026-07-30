/**
 * Accès SQLite via le module intégré node:sqlite (pas de binaire natif à compiler) :
 * - mode WAL pour l'usage simultané en classe
 * - busy_timeout configurable
 * - requêtes préparées
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * @param {string} sqlitePath chemin fichier (relatif au cwd ou absolu)
 * @param {{ busyTimeout?: number }} [options]
 */
export function openDatabase(sqlitePath, options = {}) {
  const busyTimeout = options.busyTimeout ?? 5000;
  const resolved = path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(process.cwd(), sqlitePath);

  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new DatabaseSync(resolved);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`PRAGMA busy_timeout = ${Number(busyTimeout)};`);
  db.exec('PRAGMA foreign_keys = ON;');

  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      pseudo_canonical TEXT NOT NULL UNIQUE,
      pseudo_display TEXT NOT NULL,
      progress_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      raw_answer TEXT,
      is_correct INTEGER NOT NULL,
      attempt_no INTEGER NOT NULL,
      client_event_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_client_event
      ON answers(player_id, client_event_id)
      WHERE client_event_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS hints_used (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      hint_level INTEGER NOT NULL,
      client_event_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hints_client_event
      ON hints_used(player_id, client_event_id)
      WHERE client_event_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_answers_player ON answers(player_id);
    CREATE INDEX IF NOT EXISTS idx_hints_player ON hints_used(player_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id);
  `);
}

/**
 * @param {DatabaseSync} db
 */
export function createPlayerQueries(db) {
  const findByCanonical = db.prepare(
    `SELECT * FROM players WHERE pseudo_canonical = ?`,
  );
  const findById = db.prepare(`SELECT * FROM players WHERE id = ?`);
  const insertPlayer = db.prepare(`
    INSERT INTO players (id, pseudo_canonical, pseudo_display, progress_json, created_at, updated_at)
    VALUES (@id, @pseudo_canonical, @pseudo_display, @progress_json, @created_at, @updated_at)
  `);
  const updateProgress = db.prepare(`
    UPDATE players
    SET progress_json = @progress_json, updated_at = @updated_at, pseudo_display = @pseudo_display
    WHERE id = @id
  `);
  const insertSession = db.prepare(`
    INSERT INTO sessions (token, player_id, created_at, last_seen_at)
    VALUES (@token, @player_id, @created_at, @last_seen_at)
  `);
  const findSession = db.prepare(`
    SELECT s.token AS token, s.player_id AS player_id, s.created_at AS created_at,
           s.last_seen_at AS last_seen_at,
           p.pseudo_display AS pseudo_display, p.pseudo_canonical AS pseudo_canonical,
           p.progress_json AS progress_json
    FROM sessions s
    JOIN players p ON p.id = s.player_id
    WHERE s.token = ?
  `);
  const touchSession = db.prepare(`
    UPDATE sessions SET last_seen_at = ? WHERE token = ?
  `);
  const insertAnswer = db.prepare(`
    INSERT INTO answers (id, player_id, exercise_id, raw_answer, is_correct, attempt_no, client_event_id, created_at)
    VALUES (@id, @player_id, @exercise_id, @raw_answer, @is_correct, @attempt_no, @client_event_id, @created_at)
  `);
  const findAnswerByEvent = db.prepare(`
    SELECT * FROM answers WHERE player_id = ? AND client_event_id = ?
  `);
  const countAttempts = db.prepare(`
    SELECT COUNT(*) AS n FROM answers WHERE player_id = ? AND exercise_id = ?
  `);
  const insertHint = db.prepare(`
    INSERT INTO hints_used (id, player_id, exercise_id, hint_level, client_event_id, created_at)
    VALUES (@id, @player_id, @exercise_id, @hint_level, @client_event_id, @created_at)
  `);
  const findHintByEvent = db.prepare(`
    SELECT * FROM hints_used WHERE player_id = ? AND client_event_id = ?
  `);
  const listPlayers = db.prepare(`
    SELECT id, pseudo_display, pseudo_canonical, progress_json, updated_at, created_at
    FROM players
    ORDER BY pseudo_display COLLATE NOCASE
  `);

  return {
    findByCanonical,
    findById,
    insertPlayer,
    updateProgress,
    insertSession,
    findSession,
    touchSession,
    insertAnswer,
    findAnswerByEvent,
    countAttempts,
    insertHint,
    findHintByEvent,
    listPlayers,
  };
}
