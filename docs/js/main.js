/**
 * Point d'entrée client — charge la partie selon progress.currentPartId.
 */
import { saveManager, startConnectivityWatch } from './api.js';
import { showWelcome, renderStatusBar } from './ui/screens.js';
import { SceneEngine } from './engine/SceneEngine.js';
import { canOpenPart } from '/tresor-de-thales/shared/progression.js';
import { resolvePartToPlay } from '/tresor-de-thales/shared/partLoader.js';
import { repairTrainingQueueProgress } from '/tresor-de-thales/shared/trainingQueue.js';
import { ensureIndicesConsultes } from '/tresor-de-thales/shared/hintConsult.js';

const app = document.getElementById('app');

/** Chargeurs de contenu par identifiant de partie */
const PART_LOADERS = {
  prologue: {
    url: '/tresor-de-thales/content/prologue/scenes.json',
    labelPrefix: 'Prologue',
  },
  part1: {
    url: '/tresor-de-thales/content/part1/scenes.json',
    labelPrefix: 'Partie 1',
  },
  part2: {
    url: '/tresor-de-thales/content/part2/scenes.json',
    labelPrefix: 'Partie 2',
  },
  part3: {
    url: '/tresor-de-thales/content/part3/scenes.json',
    labelPrefix: 'Partie 3',
  },
  part4: {
    url: '/tresor-de-thales/content/part4/scenes.json',
    labelPrefix: 'Partie 4',
  },
  part5: {
    url: '/tresor-de-thales/content/part5/scenes.json',
    labelPrefix: 'Partie 5',
  },
  part6: {
    url: '/tresor-de-thales/content/part6/scenes.json',
    labelPrefix: 'Partie 6',
  },
  part7: {
    url: '/tresor-de-thales/content/part7/scenes.json',
    labelPrefix: 'Partie 7',
  },
};

function isDebugFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

/**
 * Charge le JSON d'une partie (factorisé).
 * @param {string} partId
 */
async function loadPartContent(partId) {
  const conf = PART_LOADERS[partId];
  if (!conf) {
    throw new Error(`Partie inconnue ou pas encore disponible : ${partId}`);
  }
  const res = await fetch(conf.url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Impossible de charger le contenu (${partId}).`);
  }
  return res.json();
}

function buildGameShell() {
  app.innerHTML = `
    <div class="game-shell">
      <div id="status-host"></div>
      <div class="scene-stage" id="stage"></div>
      <div class="scene-ui" id="scene-ui"></div>
    </div>
  `;
  return {
    statusHost: document.getElementById('status-host'),
    stage: document.getElementById('stage'),
    ui: document.getElementById('scene-ui'),
  };
}

/**
 * Écran d’attente pour une partie non encore implémentée (ex. part4).
 * Persistant : un F5 avec currentPartId=part4 retrouve cet écran.
 */
function showWaitingNextPart(
  shell,
  playerName,
  refreshStatus,
  _shared,
  options = {},
) {
  const title =
    options.title || 'Partie 5 — Thalès : configuration papillon';
  const message =
    options.message || 'Cette partie sera bientôt disponible.';
  const partLabel = options.partLabel || 'Partie 5 — bientôt';
  const bg =
    options.background ||
    '/tresor-de-thales/assets/backgrounds/part4/p4-arrivee-ile-paralleles.png';

  shell.stage.innerHTML = `
    <div class="scene-frame">
      <div class="scene-decor">
        <div class="scene-bg" style="background-image:url('${bg}')"></div>
      </div>
    </div>`;
  shell.ui.innerHTML = `
    <div class="dialogue-panel end-panel waiting-part-panel">
      <h2>${title}</h2>
      <p class="dialogue-text">${message}</p>
      <div class="btn-row" style="justify-content:center;margin-top:0.75rem;flex-wrap:wrap;gap:0.5rem">
        <button type="button" class="btn-primary btn-touch" id="btn-home">Retour à l’accueil</button>
      </div>
    </div>`;
  refreshStatus({ partLabel });

  shell.ui.querySelector('#btn-home')?.addEventListener('click', () => {
    location.href = '/tresor-de-thales';
  });
}

function waitingOptionsForPart(partId) {
  // Plus aucune partie en attente après part7
  return {
    title: 'Suite en préparation',
    message: 'Cette partie sera bientôt disponible.',
    partLabel: 'Bientôt',
    background: '/tresor-de-thales/assets/backgrounds/part7/p7-6-conclusion-tresor.png',
  };
}

/**
 * Écran de fin d’aventure (partie 7 terminée).
 */
function showGameCompleted(shell, playerName, refreshStatus, shared) {
  const bg = '/tresor-de-thales/assets/backgrounds/part7/p7-6-conclusion-tresor.png';
  shell.stage.innerHTML = `
    <div class="scene-frame">
      <div class="scene-decor">
        <div class="scene-bg" style="background-image:url('${bg}')"></div>
      </div>
    </div>`;
  shell.ui.innerHTML = `
    <div class="dialogue-panel end-panel waiting-part-panel">
      <h2>Le trésor de Thalès</h2>
      <p class="dialogue-text">L’odyssée géométrique est terminée. Les preuves ont ouvert le coffre.</p>
      <div class="btn-row" style="justify-content:center;margin-top:0.75rem;flex-wrap:wrap;gap:0.5rem">
        <button type="button" class="btn-primary btn-touch" id="btn-home">Retour à l’accueil</button>
      </div>
    </div>`;
  refreshStatus({ partLabel: 'Aventure terminée' });
  shell.ui.querySelector('#btn-home')?.addEventListener('click', () => {
    location.href = '/tresor-de-thales';
  });
}

async function playPart(partId, shell, shared) {
  // Contenu manquant → écran d’attente (part3, etc.)
  if (!PART_LOADERS[partId]) {
    const waitOpts = waitingOptionsForPart(partId);
    showWaitingNextPart(
      shell,
      shared.playerName,
      (opts) => {
        renderStatusBar(shell.statusHost, {
          pseudo: shared.playerName,
          partLabel: opts.partLabel || waitOpts.partLabel,
          offline: !saveManager.isOnline() || saveManager.queueLength() > 0,
          queueCount: saveManager.queueLength(),
          debug: false,
          onToggleDebug: () => {},
        });
      },
      shared,
      waitOpts,
    );
    return;
  }

  const content = await loadPartContent(partId);
  let progress = shared.progress;
  const playerName = shared.playerName;
  let partLabel = content.meta.title || PART_LOADERS[partId].labelPrefix;
  let debug = shared.debug;
  let engine;

  const refreshStatus = (opts = {}) => {
    renderStatusBar(shell.statusHost, {
      pseudo: playerName,
      partLabel: opts.partLabel || partLabel,
      offline: !saveManager.isOnline() || saveManager.queueLength() > 0,
      queueCount: saveManager.queueLength(),
      debug: opts.debug !== undefined ? opts.debug : debug,
      onToggleDebug: () => {
        debug = !debug;
        shared.debug = debug;
        if (engine) engine.setDebug(debug);
        refreshStatus({ debug });
      },
    });
  };

  refreshStatus();
  saveManager.on(() => refreshStatus());

  engine = new SceneEngine({
    stageEl: shell.stage,
    uiEl: shell.ui,
    content,
    progress,
    playerName,
    debug,
    onProgress: async (p) => {
      progress = p;
      shared.progress = p;
      const scene = content.scenes.find((s) => s.id === p.currentSceneId);
      if (scene) {
        partLabel = `${PART_LOADERS[partId].labelPrefix} · ${scene.title}`;
      }
      await saveManager.saveProgress(p);
      refreshStatus();
    },
    onAnswer: async (payload) => {
      await saveManager.recordAnswer(payload);
    },
    onHint: async (payload) => {
      await saveManager.recordHint(payload);
    },
    onPartEnd: async ({
      partId: endedId,
      progress: endProgress,
      goToNextPart,
    }) => {
      progress = endProgress || progress;
      shared.progress = progress;
      partLabel =
        endedId === 'prologue'
          ? 'Prologue terminé'
          : endedId === 'part1'
            ? 'Partie 1 terminée'
            : endedId === 'part2'
              ? 'Partie 2 terminée'
              : endedId === 'part3'
                ? 'Partie 3 terminée'
                : endedId === 'part4'
                  ? 'Partie 4 terminée'
                  : endedId === 'part5'
                    ? 'Partie 5 terminée'
                    : endedId === 'part6'
                      ? 'Partie 6 terminée'
                      : endedId === 'part7'
                        ? 'Partie 7 terminée — aventure accomplie'
                        : 'Partie terminée';
      refreshStatus({ partLabel });
      await saveManager.saveProgress(progress);

      if (endedId === 'prologue') {
        const cont = document.createElement('div');
        cont.className = 'btn-row';
        cont.style.marginTop = '0.75rem';
        cont.innerHTML = `<button type="button" class="btn-primary btn-touch" id="btn-go-part1">Continuer vers le récif</button>`;
        shell.ui
          .querySelector('.dialogue-panel, .end-panel')
          ?.appendChild(cont);
        cont.querySelector('#btn-go-part1')?.addEventListener('click', async () => {
          shell.stage.innerHTML = '';
          shell.ui.innerHTML = '';
          await playPart('part1', shell, shared);
        });
        return;
      }

      if (endedId === 'part1' && goToNextPart) {
        shell.stage.innerHTML = '';
        shell.ui.innerHTML = '';
        if (PART_LOADERS.part2) {
          await playPart('part2', shell, shared);
        } else {
          showWaitingNextPart(shell, playerName, refreshStatus, shared, {
            title: 'Partie 2 — La réciproque du théorème de Pythagore',
            partLabel: 'Partie 2 — bientôt',
            background: '/tresor-de-thales/assets/backgrounds/part1/recif-angles-droits.png',
          });
        }
        return;
      }

      if (endedId === 'part2' && goToNextPart) {
        shell.stage.innerHTML = '';
        shell.ui.innerHTML = '';
        if (PART_LOADERS.part3) {
          await playPart('part3', shell, shared);
        } else {
          showWaitingNextPart(shell, playerName, refreshStatus, shared, {
            title: 'Partie 3 — Triangles semblables',
            partLabel: 'Partie 3 — bientôt',
            background: '/tresor-de-thales/assets/backgrounds/part2/p2-chantier-quai-mur.png',
          });
        }
        return;
      }

      if (endedId === 'part3' && goToNextPart) {
        shell.stage.innerHTML = '';
        shell.ui.innerHTML = '';
        if (PART_LOADERS.part4) {
          await playPart('part4', shell, shared);
        } else {
          showWaitingNextPart(shell, playerName, refreshStatus, shared, {
            title: 'Partie 4 — Théorème de Thalès : configuration emboîtée',
            message: 'Cette partie sera bientôt disponible.',
            partLabel: 'Partie 4 — bientôt',
            background: '/tresor-de-thales/assets/backgrounds/part3/p3-arrivee-moulin.png',
          });
        }
        return;
      }

      if (endedId === 'part4' && goToNextPart) {
        shell.stage.innerHTML = '';
        shell.ui.innerHTML = '';
        if (PART_LOADERS.part5) {
          await playPart('part5', shell, shared);
        } else {
          showWaitingNextPart(shell, playerName, refreshStatus, shared, {
            title: 'Partie 5 — Thalès : configuration papillon',
            message: 'Cette partie sera bientôt disponible.',
            partLabel: 'Partie 5 — bientôt',
            background: '/tresor-de-thales/assets/backgrounds/part4/p4-arrivee-ile-paralleles.png',
          });
        }
        return;
      }

      if (endedId === 'part5' && goToNextPart) {
        shell.stage.innerHTML = '';
        shell.ui.innerHTML = '';
        if (PART_LOADERS.part6) {
          await playPart('part6', shell, shared);
        } else {
          showWaitingNextPart(shell, playerName, refreshStatus, shared, {
            title: 'Partie 6 — Réciproque du théorème de Thalès',
            message: 'Cette partie sera bientôt disponible.',
            partLabel: 'Partie 6 — bientôt',
            background:
              '/tresor-de-thales/assets/backgrounds/part5/p5-arrivee-crique-vents-croises.png',
          });
        }
        return;
      }

      if (endedId === 'part6' && goToNextPart) {
        shell.stage.innerHTML = '';
        shell.ui.innerHTML = '';
        if (PART_LOADERS.part7) {
          await playPart('part7', shell, shared);
        } else {
          showWaitingNextPart(shell, playerName, refreshStatus, shared, {
            title: 'Partie 7 — Bilan final',
            message: 'Cette partie sera bientôt disponible.',
            partLabel: 'Partie 7 — bientôt',
            background: '/tresor-de-thales/assets/backgrounds/part6/p6-0-cabinet-routes.png',
          });
        }
        return;
      }

      if (endedId === 'part7') {
        // Fin du jeu : l’écran endPart du moteur affiche déjà « Terminer l’aventure »
        return;
      }
    },
    onStatus: (msg) => console.info(msg),
  });

  const resumeScene =
    progress.currentPartId === partId ? progress.currentSceneId : null;
  await engine.start(partId, resumeScene);
}

async function startGame(sessionData) {
  startConnectivityWatch();
  const shell = buildGameShell();
  const playerName =
    sessionData.pseudoDisplay || saveManager.getPseudoDisplay() || 'Aventurier';
  let progress =
    sessionData.progress || saveManager.getCachedProgress() || {};

  // Migration indices consultés (profils anciens)
  const migHints = ensureIndicesConsultes(progress);
  if (migHints.migrated) {
    progress = migHints.progress;
    await saveManager.saveProgress(progress);
  } else {
    progress = migHints.progress;
  }

  // Réparer file d’entraînement avant résolution de partie
  const fixed = repairTrainingQueueProgress(progress);
  if (fixed.repaired) {
    progress = fixed.progress;
    await saveManager.saveProgress(progress);
  }

  const shared = {
    progress,
    playerName,
    debug: isDebugFromUrl(),
  };

  const part = resolvePartToPlay(progress);

  if (part === 'completed') {
    showGameCompleted(
      shell,
      playerName,
      (opts) => {
        renderStatusBar(shell.statusHost, {
          pseudo: playerName,
          partLabel: opts.partLabel || 'Aventure terminée',
          offline: !saveManager.isOnline() || saveManager.queueLength() > 0,
          queueCount: saveManager.queueLength(),
          debug: false,
          onToggleDebug: () => {},
        });
      },
      shared,
    );
    return;
  }

  if (part === 'waiting') {
    const waitOpts = waitingOptionsForPart(progress.currentPartId || 'part3');
    showWaitingNextPart(
      shell,
      playerName,
      (opts) => {
        renderStatusBar(shell.statusHost, {
          pseudo: playerName,
          partLabel: opts.partLabel || waitOpts.partLabel,
          offline: !saveManager.isOnline() || saveManager.queueLength() > 0,
          queueCount: saveManager.queueLength(),
          debug: false,
          onToggleDebug: () => {},
        });
      },
      shared,
      waitOpts,
    );
    return;
  }

  if (!canOpenPart(part, progress) && part !== 'waiting') {
    shell.ui.innerHTML = `
      <div class="dialogue-panel">
        <p class="error-msg">Cette partie n’est pas encore débloquée.</p>
      </div>`;
    return;
  }

  await playPart(part, shell, shared);
}

function boot() {
  showWelcome(app, {
    onSessionReady: (data) => {
      startGame(data).catch((err) => {
        app.innerHTML = `
          <section class="screen"><div class="card">
            <h1>Erreur</h1>
            <p class="error-msg">${err.message || 'Chargement impossible.'}</p>
            <button type="button" class="btn-primary" id="reload">Réessayer</button>
          </div></section>`;
        document.getElementById('reload').onclick = () => location.reload();
      });
    },
  });
}

boot();
