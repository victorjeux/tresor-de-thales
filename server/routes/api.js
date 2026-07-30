import { Router } from 'express';
import { validatePseudo } from '../../shared/pseudo.js';
import { initialProgress, canOpenPart } from '../../shared/progression.js';
import {
  ensureIndicesConsultes,
  teacherHintSummary,
} from '../../shared/hintConsult.js';
import { createOpaqueId, nowIso } from '../ids.js';

/**
 * Normalise / migre la progression côté serveur (indicesConsultes).
 * Persiste si migration nécessaire.
 * @param {ReturnType<import('../db.js').createPlayerQueries>} q
 * @param {{ id: string, progress_json: string, pseudo_display?: string }} player
 */
function loadProgressWithMigration(q, player) {
  let progress;
  try {
    progress = JSON.parse(player.progress_json);
  } catch {
    progress = initialProgress();
  }
  const mig = ensureIndicesConsultes(progress);
  progress = mig.progress;
  if (mig.migrated && player.id) {
    const ts = nowIso();
    q.updateProgress.run({
      id: player.id,
      progress_json: JSON.stringify(progress),
      updated_at: ts,
      pseudo_display: player.pseudo_display || player.pseudoDisplay || '',
    });
  }
  return progress;
}

/**
 * @param {ReturnType<import('../db.js').createPlayerQueries>} q
 */
export function createApiRouter(q) {
  const router = Router();

  /** Middleware : session opaque dans l'en-tête Authorization: Bearer <token> */
  function requireSession(req, res, next) {
    const header = req.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    const token = match?.[1]?.trim();
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: 'Session manquante. Reconnectez-vous avec votre pseudo.',
      });
    }

    const session = q.findSession.get(token);
    if (!session) {
      return res.status(401).json({
        ok: false,
        error: 'Session invalide ou expirée. Reconnectez-vous avec votre pseudo.',
      });
    }

    q.touchSession.run(nowIso(), token);
    req.session = session;
    req.playerId = session.player_id;
    next();
  }

  /**
   * POST /api/session
   * Corps : { pseudo: string }
   * Crée ou recharge la partie. Retourne un token opaque (jamais le pseudo en URL).
   */
  router.post('/session', (req, res) => {
    const validated = validatePseudo(req.body?.pseudo);
    if (!validated.ok) {
      return res.status(400).json({ ok: false, error: validated.error });
    }

    const { display, canonical } = validated;
    let player = q.findByCanonical.get(canonical);
    let isNew = false;
    const ts = nowIso();

    if (!player) {
      isNew = true;
      const progress = initialProgress();
      player = {
        id: createOpaqueId(),
        pseudo_canonical: canonical,
        pseudo_display: display,
        progress_json: JSON.stringify(progress),
        created_at: ts,
        updated_at: ts,
      };
      q.insertPlayer.run(player);
    } else {
      // Met à jour la forme d'affichage si l'élève a retapé avec une autre casse
      q.updateProgress.run({
        id: player.id,
        progress_json: player.progress_json,
        updated_at: ts,
        pseudo_display: display,
      });
      player.pseudo_display = display;
    }

    const token = createOpaqueId(32);
    q.insertSession.run({
      token,
      player_id: player.id,
      created_at: ts,
      last_seen_at: ts,
    });

    const progress = loadProgressWithMigration(q, player);

    return res.json({
      ok: true,
      isNew,
      token,
      pseudoDisplay: player.pseudo_display,
      progress,
    });
  });

  /**
   * GET /api/me — état courant (token dans Authorization)
   */
  router.get('/me', requireSession, (req, res) => {
    const progress = loadProgressWithMigration(q, {
      id: req.playerId,
      progress_json: req.session.progress_json,
      pseudo_display: req.session.pseudo_display,
    });
    return res.json({
      ok: true,
      pseudoDisplay: req.session.pseudo_display,
      progress,
    });
  });

  /**
   * PUT /api/progress
   * Corps : { progress: object, clientEventId?: string }
   */
  router.put('/progress', requireSession, (req, res) => {
    let progress = req.body?.progress;
    if (!progress || typeof progress !== 'object') {
      return res.status(400).json({
        ok: false,
        error: 'Progression manquante ou invalide.',
      });
    }

    // Garde-fou basique : partie courante doit être accessible
    if (progress.currentPartId && !canOpenPart(progress.currentPartId, progress)) {
      return res.status(400).json({
        ok: false,
        error: 'Progression non linéaire refusée.',
      });
    }

    // Toujours normaliser indicesConsultes avant écriture
    progress = ensureIndicesConsultes(progress).progress;

    const ts = nowIso();
    q.updateProgress.run({
      id: req.playerId,
      progress_json: JSON.stringify(progress),
      updated_at: ts,
      pseudo_display: req.session.pseudo_display,
    });

    return res.json({ ok: true, updatedAt: ts, progress });
  });

  /**
   * POST /api/answer
   * Corps : { exerciseId, rawAnswer, isCorrect, clientEventId? }
   * Idempotent si clientEventId déjà vu.
   */
  router.post('/answer', requireSession, (req, res) => {
    const exerciseId = String(req.body?.exerciseId || '').trim();
    if (!exerciseId) {
      return res.status(400).json({ ok: false, error: 'Identifiant d’exercice manquant.' });
    }

    const clientEventId = req.body?.clientEventId
      ? String(req.body.clientEventId)
      : null;

    if (clientEventId) {
      const existing = q.findAnswerByEvent.get(req.playerId, clientEventId);
      if (existing) {
        return res.json({
          ok: true,
          duplicate: true,
          attemptNo: existing.attempt_no,
        });
      }
    }

    const attemptNo =
      (q.countAttempts.get(req.playerId, exerciseId)?.n || 0) + 1;
    const ts = nowIso();
    const id = createOpaqueId(16);

    try {
      q.insertAnswer.run({
        id,
        player_id: req.playerId,
        exercise_id: exerciseId,
        raw_answer:
          req.body?.rawAnswer === undefined || req.body?.rawAnswer === null
            ? null
            : String(req.body.rawAnswer),
        is_correct: req.body?.isCorrect ? 1 : 0,
        attempt_no: attemptNo,
        client_event_id: clientEventId,
        created_at: ts,
      });
    } catch (err) {
      // Course possible sur l'unicité client_event_id
      if (clientEventId && String(err.message || '').includes('UNIQUE')) {
        const existing = q.findAnswerByEvent.get(req.playerId, clientEventId);
        return res.json({
          ok: true,
          duplicate: true,
          attemptNo: existing?.attempt_no ?? attemptNo,
        });
      }
      throw err;
    }

    return res.json({ ok: true, duplicate: false, attemptNo });
  });

  /**
   * POST /api/hint
   * Corps : { exerciseId, hintLevel, clientEventId? }
   */
  router.post('/hint', requireSession, (req, res) => {
    const exerciseId = String(req.body?.exerciseId || '').trim();
    const hintLevel = Number(req.body?.hintLevel);
    if (!exerciseId || !Number.isInteger(hintLevel) || hintLevel < 1 || hintLevel > 3) {
      return res.status(400).json({
        ok: false,
        error: 'Indice invalide (exercice ou niveau 1–3).',
      });
    }

    const clientEventId = req.body?.clientEventId
      ? String(req.body.clientEventId)
      : null;

    if (clientEventId) {
      const existing = q.findHintByEvent.get(req.playerId, clientEventId);
      if (existing) {
        return res.json({ ok: true, duplicate: true });
      }
    }

    const ts = nowIso();
    try {
      q.insertHint.run({
        id: createOpaqueId(16),
        player_id: req.playerId,
        exercise_id: exerciseId,
        hint_level: hintLevel,
        client_event_id: clientEventId,
        created_at: ts,
      });
    } catch (err) {
      if (clientEventId && String(err.message || '').includes('UNIQUE')) {
        return res.json({ ok: true, duplicate: true });
      }
      throw err;
    }

    return res.json({ ok: true, duplicate: false });
  });

  /**
   * GET /api/teacher/summary
   * Liste des profils pour le suivi professeur (pseudo, progression, indices consultés).
   * Usage local / classe — pas d’auth prof dédiée dans le prototype.
   */
  router.get('/teacher/summary', (_req, res) => {
    const rows = q.listPlayers.all();
    const players = rows.map((row) => {
      let progress;
      try {
        progress = JSON.parse(row.progress_json);
      } catch {
        progress = initialProgress();
      }
      progress = ensureIndicesConsultes(progress).progress;
      const hints = teacherHintSummary(progress);
      return {
        pseudo: row.pseudo_display,
        pseudoCanonical: row.pseudo_canonical,
        currentPartId: progress.currentPartId || null,
        currentSceneId: progress.currentSceneId || null,
        completedParts: progress.completedParts || [],
        /** Colonne « Indices consultés » (total uniques ouverts) */
        indicesConsultes: hints.total,
        indicesConsultesDetail: hints,
        updatedAt: row.updated_at,
      };
    });
    return res.json({
      ok: true,
      columns: ['pseudo', 'progression', 'indicesConsultes'],
      players,
    });
  });

  /** Santé pour tests / monitoring local */
  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'tresor-de-thales' });
  });

  return router;
}
