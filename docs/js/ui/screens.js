/**
 * Écrans hors récit : accueil, pseudo, barre d'état.
 */
import { validatePseudo } from '/tresor-de-thales/shared/pseudo.js';
import { saveManager } from '../api.js';
import {
  ENABLE_TEST_PART_BUTTONS,
  TEST_PSEUDO_PART1,
  TEST_PSEUDO_PART2,
  TEST_PSEUDO_PART3,
  TEST_PSEUDO_PART4,
  TEST_PSEUDO_PART5,
  TEST_PSEUDO_PART6,
  TEST_PSEUDO_PART7,
  buildTestProgressPart1,
  buildTestProgressPart2,
  buildTestProgressPart3,
  buildTestProgressPart4,
  buildTestProgressPart5,
  buildTestProgressPart6,
  buildTestProgressPart7,
} from '/tresor-de-thales/shared/testPartBoot.js';

/**
 * @param {HTMLElement} root
 * @param {{ onSessionReady: (data: object) => void }} handlers
 */
export function showWelcome(root, handlers) {
  // TEMP TEST ONLY - remove before final release
  // Affiché seulement si ENABLE_TEST_PART_BUTTONS === true
  const testButtonsHtml = ENABLE_TEST_PART_BUTTONS
    ? `
        <div class="test-boot-panel" role="group" aria-label="Mode test développeur">
          <p class="test-boot-label">Mode test (temporaire — retirer avant version finale)</p>
          <div class="btn-row test-boot-row">
            <button type="button" class="btn-secondary btn-touch btn-test-boot" id="btn-test-part1">
              Mode test — Partie 1
            </button>
            <button type="button" class="btn-secondary btn-touch btn-test-boot" id="btn-test-part2">
              Mode test — Partie 2
            </button>
            <button type="button" class="btn-secondary btn-touch btn-test-boot" id="btn-test-part3">
              Mode test — Partie 3
            </button>
            <button type="button" class="btn-secondary btn-touch btn-test-boot" id="btn-test-part4">
              Mode test — Partie 4
            </button>
            <button type="button" class="btn-secondary btn-touch btn-test-boot" id="btn-test-part5">
              Mode test — Partie 5
            </button>
            <button type="button" class="btn-secondary btn-touch btn-test-boot" id="btn-test-part6">
              Mode test — Partie 6
            </button>
            <button type="button" class="btn-secondary btn-touch btn-test-boot" id="btn-test-part7">
              Mode test — Partie 7
            </button>
          </div>
          <p id="test-boot-error" class="error-msg hidden" role="alert"></p>
        </div>
      `
    : '';

  root.innerHTML = `
    <section class="screen screen-title" aria-labelledby="title">
      <div class="card card-title-panel">
        <h1 id="title">Le Trésor de Thalès</h1>
        <p class="subtitle">Odyssée géométrique en mer</p>
        <p>
          Embarquez à bord de <em>La Sécante des Vents</em> pour une aventure
          géométrique destinée aux élèves de troisième.
        </p>
        <div class="btn-row">
          <button type="button" class="btn-primary btn-touch" id="btn-start">Embarquer</button>
        </div>
        ${testButtonsHtml}
      </div>
    </section>
  `;
  root.querySelector('#btn-start').addEventListener('click', () => {
    showPseudo(root, handlers);
  });

  // TEMP TEST ONLY - remove before final release
  if (ENABLE_TEST_PART_BUTTONS) {
    const errEl = root.querySelector('#test-boot-error');
    const runTestBoot = async (which) => {
      if (errEl) {
        errEl.classList.add('hidden');
        errEl.textContent = '';
      }
      const booters = {
        part1: { pseudo: TEST_PSEUDO_PART1, progress: buildTestProgressPart1 },
        part2: { pseudo: TEST_PSEUDO_PART2, progress: buildTestProgressPart2 },
        part3: { pseudo: TEST_PSEUDO_PART3, progress: buildTestProgressPart3 },
        part4: { pseudo: TEST_PSEUDO_PART4, progress: buildTestProgressPart4 },
        part5: { pseudo: TEST_PSEUDO_PART5, progress: buildTestProgressPart5 },
        part6: { pseudo: TEST_PSEUDO_PART6, progress: buildTestProgressPart6 },
        part7: { pseudo: TEST_PSEUDO_PART7, progress: buildTestProgressPart7 },
      };
      const conf = booters[which] || booters.part1;
      const pseudo = conf.pseudo;
      const progress = conf.progress();
      try {
        const data = await saveManager.openSession(pseudo);
        await saveManager.saveProgress(progress);
        handlers.onSessionReady({
          ...data,
          progress,
          pseudoDisplay: data.pseudoDisplay || pseudo,
          _testBoot: which,
        });
      } catch (e) {
        if (errEl) {
          errEl.textContent =
            e?.message ||
            'Impossible de démarrer le mode test. Vérifiez que le serveur est lancé.';
          errEl.classList.remove('hidden');
        }
      }
    };
    root
      .querySelector('#btn-test-part1')
      ?.addEventListener('click', () => runTestBoot('part1'));
    root
      .querySelector('#btn-test-part2')
      ?.addEventListener('click', () => runTestBoot('part2'));
    root
      .querySelector('#btn-test-part3')
      ?.addEventListener('click', () => runTestBoot('part3'));
    root
      .querySelector('#btn-test-part4')
      ?.addEventListener('click', () => runTestBoot('part4'));
    root
      .querySelector('#btn-test-part5')
      ?.addEventListener('click', () => runTestBoot('part5'));
    root
      .querySelector('#btn-test-part6')
      ?.addEventListener('click', () => runTestBoot('part6'));
    root
      .querySelector('#btn-test-part7')
      ?.addEventListener('click', () => runTestBoot('part7'));
  }
}

export function showPseudo(root, handlers) {
  root.innerHTML = `
    <section class="screen" aria-labelledby="pseudo-title">
      <div class="card">
        <h1 id="pseudo-title">Votre pseudo</h1>
        <p>
          Saisissez un pseudo pour enregistrer votre progression.
          Aucun mot de passe n’est demandé.
        </p>
        <label class="field-label" for="pseudo-input">Pseudo</label>
        <input id="pseudo-input" type="text" maxlength="24" autocomplete="username"
          placeholder="Ex. Capitaine Léo" />
        <p class="field-hint">3 à 24 caractères · lettres, chiffres, espaces, - et _</p>
        <div id="pseudo-error" class="error-msg hidden" role="alert"></div>
        <div id="pseudo-info" class="info-msg hidden" role="status"></div>
        <div class="btn-row">
          <button type="button" class="btn-secondary btn-touch" id="btn-back">Retour</button>
          <button type="button" class="btn-primary btn-touch" id="btn-go">Continuer</button>
        </div>
      </div>
    </section>
  `;

  const input = root.querySelector('#pseudo-input');
  const err = root.querySelector('#pseudo-error');
  const info = root.querySelector('#pseudo-info');

  root.querySelector('#btn-back').addEventListener('click', () => {
    showWelcome(root, handlers);
  });

  const submit = async () => {
    err.classList.add('hidden');
    info.classList.add('hidden');
    const validated = validatePseudo(input.value);
    if (!validated.ok) {
      err.textContent = validated.error;
      err.classList.remove('hidden');
      return;
    }

    info.textContent = 'Recherche de la carte de bord…';
    info.classList.remove('hidden');

    try {
      const data = await saveManager.openSession(validated.display);
      handlers.onSessionReady(data);
    } catch (e) {
      err.textContent =
        e?.message ||
        'Impossible de contacter le serveur. Vérifiez que le jeu est bien lancé.';
      err.classList.remove('hidden');
      info.classList.add('hidden');
    }
  };

  root.querySelector('#btn-go').addEventListener('click', submit);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') submit();
  });
  input.focus();
}

export function renderStatusBar(
  container,
  { pseudo, partLabel, offline, queueCount, debug, onToggleDebug },
) {
  container.innerHTML = `
    <div class="status-bar" role="status">
      <span><strong>${escapeHtml(pseudo || 'Élève')}</strong>
        · ${escapeHtml(partLabel || 'Prologue')}</span>
      <span class="status-right">
        <span class="text-size-controls" aria-label="Taille du texte">
          <button type="button" data-text="base" title="Texte normal">A</button>
          <button type="button" data-text="lg" title="Texte grand">A+</button>
          <button type="button" data-text="xl" title="Texte très grand">A++</button>
        </span>
        ${
          offline || queueCount
            ? `<span class="badge warn">Hors ligne${queueCount ? ` · ${queueCount} en attente` : ''}</span>`
            : `<span class="badge">Enregistré</span>`
        }
        <button type="button" class="badge" id="btn-debug" title="Afficher les zones tactiles (tests)">
          ${debug ? 'Debug ON' : 'Debug'}
        </button>
      </span>
    </div>
  `;

  container.querySelectorAll('[data-text]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.documentElement.classList.remove('text-lg', 'text-xl');
      const mode = btn.getAttribute('data-text');
      if (mode === 'lg') document.documentElement.classList.add('text-lg');
      if (mode === 'xl') document.documentElement.classList.add('text-xl');
    });
  });

  const dbg = container.querySelector('#btn-debug');
  if (dbg && typeof onToggleDebug === 'function') {
    dbg.addEventListener('click', () => onToggleDebug());
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
