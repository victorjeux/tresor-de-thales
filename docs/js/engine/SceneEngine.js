/**
 * Moteur de scènes réutilisable (data-driven).
 *
 * - Hotspots invisibles hors mode debug
 * - Interaction obligatoire avant dialogues
 * - Plusieurs indices avant déblocage d'un hotspot
 * - Dialogues avec portraits, {{playerName}}, choix tactiles
 * - Pause cahier multipages
 * - Overlays / transitions
 */
import { checkNumericAnswer } from '/tresor-de-thales/shared/numericAnswer.js';
import { checkRadicalAnswer } from '/tresor-de-thales/shared/radicalAnswer.js';
import { checkClozeAnswers } from '/tresor-de-thales/shared/clozeAnswer.js';
import {
  completePart,
  setCurrentScene,
  canOpenPart,
} from '/tresor-de-thales/shared/progression.js';
import {
  getExerciseFromProgress,
  setExerciseInProgress,
  registerAttempt,
  useHint,
  isHintAvailable,
  neutralErrorMessage,
  MAX_HINTS,
} from '/tresor-de-thales/shared/exerciseHelp.js';
import {
  getVisualStage,
  setVisualStage,
  resolveDecorForStage,
} from '/tresor-de-thales/shared/visualStage.js';
import {
  getPhaseProgress,
  resolvePhaseClick,
  afterPhaseClosed,
  repairPhasedHotspotState,
} from '/tresor-de-thales/shared/hotspotPhases.js';
import {
  getNextQueueExerciseId,
  isQueueComplete,
  formatQueueStepLabel,
  repairTrainingQueueProgress,
  P1_TRAIN_EXERCISE_IDS,
} from '/tresor-de-thales/shared/trainingQueue.js';
import {
  getSilasDiscoveries,
  markSilasDiscoveryComplete,
  allSilasDiscoveriesCompleted,
  silasDiscoveryPrompt,
  migrateSilasDiscoveries,
  SILAS_HOTSPOT_IDS,
  SILAS_DISCOVERY_IDS,
} from '/tresor-de-thales/shared/silasDiscoveries.js';
import {
  ensureIndicesConsultes,
  recordHintConsulted,
  makeHintConsultId,
} from '/tresor-de-thales/shared/hintConsult.js';
import {
  renderMath,
  renderMathInContainer,
  rightTriangleSvg,
  figureSvg,
} from '../math/render.js';

/** Portraits par nom de locuteur (normalisé) */
const SPEAKER_PORTRAITS = {
  alizée: '/tresor-de-thales/assets/portraits/alizee.png',
  alizee: '/tresor-de-thales/assets/portraits/alizee.png',
  nérée: '/tresor-de-thales/assets/portraits/neree.png',
  neree: '/tresor-de-thales/assets/portraits/neree.png',
  'capitaine nérée': '/tresor-de-thales/assets/portraits/neree.png',
  euclide: '/tresor-de-thales/assets/portraits/euclide.png',
  'maître euclide': '/tresor-de-thales/assets/portraits/euclide.png',
  silas: '/tresor-de-thales/assets/portraits/silas.png',
  maki: '/tresor-de-thales/assets/portraits/maki.png',
  marin: null,
};

export class SceneEngine {
  /**
   * @param {object} options
   */
  constructor(options) {
    this.stageEl = options.stageEl;
    this.uiEl = options.uiEl;
    this.content = options.content;
    this.progress = options.progress || {};
    this.playerName = options.playerName || 'Aventurier';
    this.debug = Boolean(options.debug);
    this.onProgress = options.onProgress || (async () => {});
    this.onAnswer = options.onAnswer || (async () => {});
    this.onHint = options.onHint || (async () => {});
    this.onPartEnd = options.onPartEnd || (() => {});
    this.onStatus = options.onStatus || (() => {});

    this.scenesById = new Map(
      (this.content.scenes || []).map((s) => [s.id, s]),
    );
    this.currentScene = null;
    this.sceneState = {};
  }

  setDebug(on) {
    this.debug = Boolean(on);
    document.documentElement.classList.toggle('debug-hotspots', this.debug);
    this.renderHotspotsOnly();
  }

  /**
   * @param {string} [partId]
   * @param {string|null} [sceneId]
   */
  async start(partId, sceneId) {
    const part = partId || this.content.meta?.partId || 'prologue';
    if (!canOpenPart(part, this.progress) && !String(part).startsWith('demo')) {
      this.onStatus('Cette partie n’est pas encore débloquée.');
      return;
    }

    // Migration suivi prof : indices consultés (profils anciens sans la clé)
    {
      const migHints = ensureIndicesConsultes(this.progress);
      if (migHints.migrated) {
        this.progress = migHints.progress;
        await this.persist();
      }
    }

    // Réparation file d’entraînement (saves A+D sans B/C, etc.)
    if (part === 'part1' || this.content.meta?.partId === 'part1') {
      const fixed = repairTrainingQueueProgress(this.progress, {
        trainSceneId: 'p1_6_entrainement',
        finaleSceneId: 'p1_7_finale',
        partId: 'part1',
        queueIds: P1_TRAIN_EXERCISE_IDS,
      });
      if (fixed.repaired) {
        this.progress = fixed.progress;
        await this.persist();
      }
    }

    let targetId = sceneId;
    if (!targetId) {
      if (
        this.progress.currentPartId === part &&
        this.progress.currentSceneId &&
        this.scenesById.has(this.progress.currentSceneId)
      ) {
        targetId = this.progress.currentSceneId;
      } else {
        targetId =
          this.content.meta?.startSceneId || this.content.scenes?.[0]?.id;
      }
    }

    // Honorer p1_6 seulement si la réparation l’a laissé (migration n’a pas
    // renvoyé en arrière) et que la file n’est pas complète.
    if (
      part === 'part1' &&
      this.progress.currentSceneId === 'p1_6_entrainement' &&
      this.scenesById.has('p1_6_entrainement') &&
      !sceneId
    ) {
      const queue =
        this.scenesById.get('p1_6_entrainement')?.exerciseQueue?.ids ||
        P1_TRAIN_EXERCISE_IDS;
      if (!isQueueComplete(this.progress, queue)) {
        targetId = 'p1_6_entrainement';
      }
    }

    document.documentElement.classList.toggle('debug-hotspots', this.debug);
    await this.loadScene(targetId);
  }

  async loadScene(sceneId) {
    const scene = this.scenesById.get(sceneId);
    if (!scene) {
      this.onStatus(`Scène introuvable : ${sceneId}`);
      return;
    }

    this.currentScene = scene;
    const sceneCompleted = (this.progress.completedScenes || []).includes(
      scene.id,
    );
    // Répare les sauvegardes où un hotspot multi-phases a été marqué trop tôt
    let rawSceneHot = this.progress.sceneHotspots?.[scene.id] || {};
    for (const h of scene.hotspots || []) {
      if (h.phases?.length) {
        rawSceneHot = repairPhasedHotspotState(rawSceneHot, h, {
          sceneCompleted,
        });
      }
    }
    if (!this.progress.sceneHotspots) this.progress.sceneHotspots = {};
    this.progress.sceneHotspots = {
      ...this.progress.sceneHotspots,
      [scene.id]: rawSceneHot,
    };

    const savedInteracted = rawSceneHot.interacted || [];
    const savedExamined = rawSceneHot.examined || [];
    const savedPhaseIndex = rawSceneHot.phaseIndex || {};
    const savedPhaseCompleted = new Set(rawSceneHot.phaseCompleted || []);
    // Si la partie est déjà terminée, les hotspots de la scène restent rejouables
    // sans re-déclencher endPart / progression.
    const partAlreadyDone = (this.progress.completedParts || []).includes(
      this.content.meta?.partId,
    );
    this.sceneState = {
      interacted: new Set(savedInteracted),
      examined: new Set(savedExamined),
      phaseIndex: { ...savedPhaseIndex },
      phaseCompleted: savedPhaseCompleted,
      progressedHotspots: new Set(savedInteracted),
      flags: { ...(this.progress.flags || {}) },
      hintsShown: 0,
      activeStep: null,
      overlayOpen: false,
      uiModalOpen: false,
      _advanced: Boolean(partAlreadyDone || sceneCompleted),
    };

    const partId = this.content.meta?.partId || 'prologue';
    const updated = setCurrentScene(this.progress, partId, sceneId);
    if (updated.ok) {
      this.progress = updated.progress;
    } else {
      this.progress = {
        ...this.progress,
        currentPartId: partId,
        currentSceneId: sceneId,
      };
    }

    // Migration silas (profils bloqués / anciennes clés)
    if (scene.id === 'p1_7_finale' || this.progress.silasClues || this.progress.silasDiscoveries) {
      const mig = migrateSilasDiscoveries(this.progress);
      if (mig.migrated) this.progress = mig.progress;
    }

    await this.persist();
    this.renderDecor();
    this.uiEl.innerHTML = '';
    // Garantit qu’aucun bloqueur fantôme ne survit au chargement
    this.setUiBlocking(false);

    const requireInteraction = scene.requireInteraction !== false;
    // Les hotspots optionnels (ambiance, blagues) ne bloquent jamais le démarrage
    const hasStartGate = (scene.hotspots || []).some(
      (h) =>
        !h.optional &&
        (h.required ||
          h.queueMember ||
          h.stepId ||
          h.lines ||
          h.sequence ||
          h.phases ||
          h.silasDiscovery ||
          (h.stages || []).includes('silas')),
    );

    if (requireInteraction && hasStartGate) {
      let promptText = scene.prompt || 'Touchez un élément du décor pour continuer.';
      if (scene.exerciseQueue?.ids?.length) {
        const next = getNextQueueExerciseId(
          this.progress,
          scene.exerciseQueue.ids,
        );
        if (next) {
          promptText = `${formatQueueStepLabel(this.progress, scene.exerciseQueue.ids)} — touchez une balise.`;
        }
      }
      const stageId = this.getActiveVisualStage();
      if (stageId === 'silas') {
        await this.enterSilasStage();
      } else {
        if (stageId && scene.stagePrompts?.[stageId]) {
          promptText = scene.stagePrompts[stageId];
        }
        this.showPrompt(this.tpl(promptText));
      }
    } else if (this.shouldShowSceneStartButton(scene)) {
      // Scène à steps + interaction : bouton principal visible (ex. Partie 7)
      this.showSceneStartPanel(scene);
    } else if (scene.steps?.length) {
      await this.runStep(scene.steps[0]);
    } else if (this.getActiveVisualStage() === 'silas') {
      await this.enterSilasStage();
    }
  }

  /**
   * Bouton principal pour lancer les steps d’une scène (sans hotspot required).
   * Les hotspots optional restent cliquables pour l’ambiance.
   */
  shouldShowSceneStartButton(scene) {
    if (!scene?.steps?.length) return false;
    if (scene.startButton) return true;
    const requireInteraction = scene.requireInteraction !== false;
    if (!requireInteraction) return false;
    const hasNonOptionalGate = (scene.hotspots || []).some(
      (h) =>
        !h.optional &&
        (h.required ||
          h.queueMember ||
          h.stepId ||
          h.lines ||
          h.sequence ||
          h.phases ||
          h.silasDiscovery ||
          (h.stages || []).includes('silas')),
    );
    return !hasNonOptionalGate;
  }

  /**
   * Affiche le prompt de scène + un bouton pour lancer le premier step.
   * @param {object} scene
   */
  showSceneStartPanel(scene) {
    this.uiEl.innerHTML = '';
    this.setUiBlocking(false);
    const promptText = this.tpl(
      scene.prompt || 'Touchez un élément du décor pour continuer.',
    );
    const label =
      scene.startButton?.label ||
      scene.startButtonLabel ||
      'Continuer';
    const stepId =
      scene.startButton?.stepId ||
      scene.startStepId ||
      scene.steps?.[0]?.id;
    const panel = document.createElement('div');
    panel.className = 'dialogue-panel scene-start-panel';
    panel.innerHTML = `
      <div class="dialogue-body" style="padding:0.5rem">
        <p class="dialogue-text">${escapeHtml(promptText)}</p>
        <div class="btn-row" style="justify-content:center;margin-top:0.75rem;flex-wrap:wrap;gap:0.5rem">
          <button type="button" class="btn-primary btn-touch" id="btn-scene-start">
            ${escapeHtml(label)}
          </button>
        </div>
      </div>`;
    this.uiEl.appendChild(panel);
    panel.querySelector('#btn-scene-start')?.addEventListener('click', async () => {
      if (this.isUiBlocking()) return;
      const step =
        (scene.steps || []).find((s) => s.id === stepId) || scene.steps?.[0];
      if (step) {
        await this.runStep(step);
      }
    });
  }

  /**
   * UI d’exploration après un dialogue optionnel : bouton de démarrage ou prompt.
   */
  showExplorationUi() {
    const scene = this.currentScene;
    if (!scene) return;
    if (this.getActiveVisualStage() === 'silas') {
      const msg = silasDiscoveryPrompt(this.progress);
      if (msg) this.showPrompt(this.tpl(msg));
      else this.showPrompt(this.tpl(scene.prompt || 'Explorez le décor.'));
      return;
    }
    if (this.shouldShowSceneStartButton(scene)) {
      this.showSceneStartPanel(scene);
      return;
    }
    this.showPrompt(this.tpl(scene.prompt || 'Explorez le décor.'));
  }

  /**
   * Cadre de scène 16:9 : le décor et les hotspots partagent le même
   * conteneur (coordonnées en % de la taille native du décor).
   */
  getSceneFrame() {
    return this.stageEl.querySelector('.scene-frame');
  }

  /**
   * Applique un stade visuel (fond + objets) et le persiste pour reprise.
   * @param {string} stageId
   */
  async applyVisualStage(stageId) {
    if (!this.currentScene || !stageId) return;
    this.progress = setVisualStage(
      this.progress,
      this.currentScene.id,
      stageId,
    );
    await this.persist();
    // Reconstruit décor + hotspots du nouveau stade (détruit les anciens)
    this.renderDecor();
    // Jamais de dialogue final auto à l’entrée de silas
    if (!this.hasVisibleModal()) {
      if (stageId === 'silas') {
        await this.enterSilasStage();
      } else {
        const stagePrompt = this.currentScene.stagePrompts?.[stageId];
        if (stagePrompt) this.showPrompt(this.tpl(stagePrompt));
      }
    }
  }

  /**
   * Entrée / reprise du stade silas : 3 hotspots, pas de endPart auto.
   */
  async enterSilasStage() {
    const mig = migrateSilasDiscoveries(this.progress);
    if (mig.migrated) {
      this.progress = mig.progress;
      await this.persist();
    }
    this.setSilasHotspotsInteractive(true);
    // Si les 3 découvertes sont déjà faites et part1 non terminée → dialogue final
    const partDone = (this.progress.completedParts || []).includes('part1');
    const d = getSilasDiscoveries(this.progress);
    if (allSilasDiscoveriesCompleted(this.progress) && !partDone) {
      if (!d.completionDialogShown) {
        await this.openSilasFinalDialogue();
        return;
      }
    }
    const msg =
      silasDiscoveryPrompt(this.progress) ||
      this.currentScene.stagePrompts?.silas ||
      'Examinez les trois indices avant de poursuivre.';
    this.showPrompt(this.tpl(msg));
  }

  /** Active/désactive les 3 hotspots silas (pointer-events). */
  setSilasHotspotsInteractive(enabled) {
    const frame = this.getSceneFrame() || this.stageEl;
    if (!frame) return;
    for (const id of SILAS_HOTSPOT_IDS) {
      const btn = frame.querySelector(`[data-hotspot-id="${id}"]`);
      if (!btn) continue;
      if (enabled) {
        const done = this.isSilasDiscoveryDone(id);
        // Rejouables mais on peut laisser cliquables ; le final les coupe
        btn.classList.remove('hotspot-silas-disabled');
        btn.disabled = false;
        btn.style.pointerEvents = '';
        btn.removeAttribute('aria-hidden');
        if (done) btn.classList.add('done');
      } else {
        btn.classList.add('hotspot-silas-disabled');
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        btn.setAttribute('aria-hidden', 'true');
      }
    }
  }

  isSilasDiscoveryDone(hotspotId) {
    const field = SILAS_DISCOVERY_IDS[hotspotId];
    if (!field) return false;
    return Boolean(getSilasDiscoveries(this.progress)[field]);
  }

  /**
   * Enregistre la fin complète d’un dialogue de découverte silas,
   * puis ouvre le dialogue final si les 3 sont faits.
   */
  async onSilasDiscoveryDialogueClosed(hotspotId) {
    const res = markSilasDiscoveryComplete(this.progress, hotspotId);
    this.progress = res.progress;
    await this.persist();

    if (allSilasDiscoveriesCompleted(this.progress)) {
      this.setSilasHotspotsInteractive(false);
      this.uiEl.innerHTML = '';
      this.setUiBlocking(false);
      await this.openSilasFinalDialogue();
      return;
    }

    this.setSilasHotspotsInteractive(true);
    const msg = silasDiscoveryPrompt(this.progress);
    if (msg) this.showPrompt(this.tpl(msg));
  }

  /**
   * Dialogue final (endPart) — une seule fois, après les 3 découvertes.
   */
  async openSilasFinalDialogue() {
    const partDone = (this.progress.completedParts || []).includes('part1');
    if (partDone) return;

    const d = getSilasDiscoveries(this.progress);
    if (d.completionDialogShown) {
      // Déjà montré : rouvrir le panneau de fin sans double completePart
      await this.endPart({
        message: this.currentScene?.silasFinalDialogue?.message,
        announce: this.currentScene?.silasFinalDialogue?.announce,
      });
      return;
    }

    this.progress = {
      ...this.progress,
      silasDiscoveries: {
        ...getSilasDiscoveries(this.progress),
        completionDialogShown: true,
      },
    };
    await this.persist();

    const final =
      this.currentScene?.silasFinalDialogue || {
        lines: [],
        endPart: true,
        message:
          'Premier fragment récupéré. La Sécante des Vents poursuit sa route au-delà du récif.',
        announce:
          'À suivre : Partie 2 — La réciproque du théorème de Pythagore.',
      };

    this.setSilasHotspotsInteractive(false);

    if (final.lines?.length) {
      await this.runStep(
        {
          type: 'dialogue',
          lines: final.lines,
          endPart: true,
          message: final.message,
          announce: final.announce,
          completeScene: true,
        },
        { optional: false },
      );
    } else {
      await this.endPart({
        message: final.message,
        announce: final.announce,
      });
    }
  }

  resolveActiveDecor() {
    const decor = this.currentScene?.decor || {};
    const saved = getVisualStage(this.progress, this.currentScene?.id);
    return resolveDecorForStage(decor, saved);
  }

  renderDecor() {
    const scene = this.currentScene;
    const baseDecor = scene.decor || {};
    const resolved = this.resolveActiveDecor();
    this.stageEl.innerHTML = '';

    const frame = document.createElement('div');
    frame.className = 'scene-frame';
    frame.dataset.aspect = '16:9';
    if (resolved.stageId) frame.dataset.visualStage = resolved.stageId;

    const decorLayer = document.createElement('div');
    decorLayer.className = 'scene-decor';

    const bgUrl = resolved.background || baseDecor.background;
    const fallback =
      baseDecor.backgroundFallback ||
      '/tresor-de-thales/assets/backgrounds/part1/recif-angles-droits.png';

    if (bgUrl) {
      decorLayer.innerHTML = `
        <div class="scene-bg" id="scene-bg"
             role="img" aria-label="${escapeAttr(scene.title || '')}"></div>
        <div class="scene-objects" id="scene-objects"></div>
      `;
      const bgEl = decorLayer.querySelector('#scene-bg');
      const probe = new Image();
      probe.onload = () => {
        bgEl.style.backgroundImage = `url('${escapeAttr(bgUrl)}')`;
      };
      probe.onerror = () => {
        bgEl.style.backgroundImage = `url('${escapeAttr(fallback)}')`;
        bgEl.dataset.fallback = '1';
      };
      probe.src = bgUrl;
    } else if (baseDecor.svg) {
      decorLayer.innerHTML = baseDecor.svg;
    } else {
      decorLayer.innerHTML = defaultSeaDecor(
        baseDecor.sky || '#1a4a5c',
        baseDecor.label || scene.title || '',
      );
    }

    frame.appendChild(decorLayer);
    this.stageEl.appendChild(frame);

    const objectsHost = decorLayer.querySelector('#scene-objects') || decorLayer;
    for (const obj of resolved.objects || []) {
      this.placeObject(objectsHost, obj, false);
    }

    this.renderHotspotsOnly();
  }

  /** Stade visuel courant (finale part1, etc.) */
  getActiveVisualStage() {
    const decor = this.currentScene?.decor || {};
    const saved = getVisualStage(this.progress, this.currentScene?.id);
    if (saved) return saved;
    return decor.initialStage || null;
  }

  /**
   * Hotspot autorisé pour le stade visuel courant ?
   * stages: ["exterieur"] — absent = tous les stades
   */
  hotspotAllowedForStage(hotspot, stageId) {
    if (!hotspot.stages || !hotspot.stages.length) return true;
    const stage =
      stageId ||
      this.currentScene?.decor?.initialStage ||
      null;
    if (!stage) return true;
    return hotspot.stages.includes(stage);
  }

  renderHotspotsOnly() {
    if (!this.currentScene) return;
    const frame = this.getSceneFrame() || this.stageEl;
    // Détruire anciens hotspots + gestionnaires (retrait des nœuds)
    frame.querySelectorAll('.hotspot, .hotspot-object').forEach((n) => n.remove());

    const objectsHost =
      frame.querySelector('#scene-objects') ||
      frame.querySelector('.scene-decor') ||
      frame;

    const stageId = this.getActiveVisualStage();

    for (const hotspot of this.currentScene.hotspots || []) {
      if (!this.hotspotAllowedForStage(hotspot, stageId)) continue;
      if (hotspot.hiddenWhen && this.evalFlag(hotspot.hiddenWhen)) continue;
      if (hotspot.visibleWhen && !this.evalFlag(hotspot.visibleWhen)) continue;

      // PNG transparent seulement si l'objet n'est pas déjà dessiné dans le décor
      if (hotspot.image && !hotspot.inDecor) {
        this.placeObject(objectsHost, hotspot, true);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hotspot';
      if (this.sceneState.interacted.has(hotspot.id)) btn.classList.add('done');
      if (this.isHotspotLocked(hotspot)) btn.classList.add('locked');
      if (this.isSilasDiscoveryDone(hotspot.id)) btn.classList.add('done');
      // Coordonnées en % du cadre 16:9 :
      // x,y = centre du rectangle cliquable (pas le coin haut-gauche).
      // Le CSS applique transform: translate(-50%, -50%) pour centrer le bouton.
      // Si hotspot.anchor === 'topLeft', convertir en centre (x+w/2, y+h/2).
      let cx = Number(hotspot.x) || 0;
      let cy = Number(hotspot.y) || 0;
      const hw = Number(hotspot.w) || 0;
      const hh = Number(hotspot.h) || 0;
      if (hotspot.anchor === 'topLeft' || hotspot.coordMode === 'topLeft') {
        cx = cx + hw / 2;
        cy = cy + hh / 2;
      }
      btn.style.left = `${cx}%`;
      btn.style.top = `${cy}%`;
      if (hw) btn.style.width = `${hw}%`;
      if (hh) btn.style.height = `${hh}%`;
      // Garantit le centrage même si une règle CSS est surchargée
      btn.style.transform = 'translate(-50%, -50%)';
      btn.dataset.hotspotId = hotspot.id;
      if (stageId) btn.dataset.visualStage = stageId;
      btn.setAttribute('aria-label', hotspot.label || hotspot.id);

      const span = document.createElement('span');
      span.className = 'hotspot-label';
      span.textContent = hotspot.label || hotspot.id;
      btn.appendChild(span);

      btn.addEventListener('click', () => this.onHotspot(hotspot));
      frame.appendChild(btn);
    }

    // Pendant un dialogue, bloquer les hotspots (en plus du ui-blocker)
    if (this.isUiBlocking() || this.sceneState.uiModalOpen) {
      frame.querySelectorAll('.hotspot').forEach((btn) => {
        btn.style.pointerEvents = 'none';
      });
    } else if (stageId === 'silas') {
      const partDone = (this.progress.completedParts || []).includes('part1');
      const finalOpen = getSilasDiscoveries(this.progress).completionDialogShown;
      this.setSilasHotspotsInteractive(!(partDone || (finalOpen && allSilasDiscoveriesCompleted(this.progress) && this.hasVisibleModal())));
    }
  }

  placeObject(host, obj, isHotspot) {
    if (!host || !obj.image) return;
    // <img> pour alt text + object-fit: contain (proportions préservées)
    const el = document.createElement('img');
    el.className = isHotspot ? 'hotspot-object' : 'decor-object';
    const anchorBottom = Boolean(obj.grounded || obj.anchor === 'bottom');
    if (anchorBottom) {
      el.classList.add('grounded-object');
      el.classList.add('anchor-bottom');
      el.dataset.anchor = 'bottom';
    }
    el.src = obj.image;
    el.alt = obj.alt || obj.label || 'Élément du décor';
    el.draggable = false;
    el.style.left = `${obj.x}%`;
    // Ancrage bas exclusif : y = position des pieds (bas de l’image).
    // Pas de top + bottom simultanés, pas de translateY cumulé avec top.
    if (anchorBottom) {
      el.style.top = 'auto';
      el.style.bottom = `${Math.max(0, 100 - Number(obj.y || 0))}%`;
      el.style.transform = 'translateX(-50%)';
    } else {
      el.style.top = `${obj.y}%`;
      el.style.bottom = 'auto';
    }
    if (obj.w) el.style.width = `${obj.w}%`;
    if (obj.h) el.style.height = `${obj.h}%`;
    if (obj.z != null) el.style.zIndex = String(obj.z);
    host.appendChild(el);
  }

  /** Bulle « cahier » d’Euclide après chaque correction détaillée */
  euclideNotebookBubbleHtml() {
    return `<div class="euclide-notebook-bubble" role="note">
      Vérifie que tu as écrit exactement cette correction dans ton cahier.
      Si ce n’est pas le cas, prends-la en correction maintenant.
    </div>`;
  }

  isHotspotLocked(hotspot) {
    if (!hotspot.unlockAfterExamined) return false;
    return this.sceneState.examined.size < Number(hotspot.unlockAfterExamined);
  }

  evalFlag(expr) {
    if (!expr) return false;
    if (typeof expr === 'string') {
      return Boolean(this.sceneState.flags[expr] || this.progress.flags?.[expr]);
    }
    if (expr.flag) {
      const v = this.sceneState.flags[expr.flag] ?? this.progress.flags?.[expr.flag];
      if (expr.equals !== undefined) return v === expr.equals;
      return Boolean(v);
    }
    return false;
  }

  showPrompt(text) {
    this.uiEl.innerHTML = '';
    this.setUiBlocking(false);
    const p = document.createElement('div');
    p.className = 'prompt-touch';
    p.textContent = text;
    this.uiEl.appendChild(p);
  }

  /**
   * Bloque les clics sur le décor tant qu'une vraie modale (dialogue/exercice)
   * est ouverte. Ne doit jamais rester actif sans panneau visible.
   */
  setUiBlocking(on) {
    if (!this.sceneState) this.sceneState = {};
    this.sceneState.uiModalOpen = Boolean(on);
    const frame = this.getSceneFrame() || this.stageEl;
    if (!frame) return;
    // Nettoie tous les bloqueurs éventuels (fantômes inclus)
    frame.querySelectorAll('.ui-blocker').forEach((n) => n.remove());
    if (this.stageEl && this.stageEl !== frame) {
      this.stageEl.querySelectorAll('.ui-blocker').forEach((n) => n.remove());
    }
    if (on) {
      const blocker = document.createElement('div');
      blocker.className = 'ui-blocker';
      blocker.setAttribute('aria-hidden', 'true');
      frame.appendChild(blocker);
      // Empêche tout clic résiduel sur les hotspots pendant un dialogue
      frame.querySelectorAll('.hotspot').forEach((btn) => {
        btn.style.pointerEvents = 'none';
      });
    } else {
      // Réactiver les hotspots (sauf silas en mode final)
      const stageId = this.getActiveVisualStage();
      if (stageId === 'silas') {
        const d = getSilasDiscoveries(this.progress);
        if (allSilasDiscoveriesCompleted(this.progress) && d.completionDialogShown) {
          this.setSilasHotspotsInteractive(false);
        } else {
          this.setSilasHotspotsInteractive(true);
        }
      } else {
        frame.querySelectorAll('.hotspot').forEach((btn) => {
          btn.style.pointerEvents = '';
          btn.disabled = false;
        });
      }
    }
  }

  isUiBlocking() {
    return Boolean(this.sceneState?.uiModalOpen || this.sceneState?.overlayOpen);
  }

  /** True seulement si un panneau d’interaction occupe l’UI */
  hasVisibleModal() {
    if (!this.uiEl) return false;
    return Boolean(
      this.uiEl.querySelector(
        '.dialogue-panel, .quiz-panel, .exercise-panel, .notebook-panel, .end-panel',
      ),
    );
  }

  async onHotspot(hotspot) {
    // Ne jamais traverser une boîte de dialogue / exercice ouvert
    if (this.isUiBlocking()) {
      // Auto-réparation : flag bloquant sans panneau visible
      if (!this.hasVisibleModal() && !this.sceneState.overlayOpen) {
        this.setUiBlocking(false);
      } else {
        return;
      }
    }

    if (this.isHotspotLocked(hotspot)) {
      this.showPrompt(
        this.tpl(
          hotspot.lockedPrompt ||
            'Examinez encore d’autres indices avant d’ouvrir ceci.',
        ),
      );
      return;
    }

    // Hotspots multi-phases (lettre de Thalès) : chemin dédié
    if (hotspot.phases?.length) {
      await this.handlePhasedHotspot(hotspot);
      return;
    }

    // File pédagogique A→B→C→D (indépendante de la balise cliquée)
    if (
      hotspot.queueMember &&
      this.currentScene?.exerciseQueue?.ids?.length
    ) {
      await this.playTrainingQueueFromHotspot(hotspot);
      return;
    }

    // Découvertes silas : rejouables, validation seulement à la fin du dialogue
    if (hotspot.silasDiscovery || SILAS_HOTSPOT_IDS.includes(hotspot.id)) {
      await this.playSilasDiscovery(hotspot);
      return;
    }

    const isFirst = !this.sceneState.interacted.has(hotspot.id);
    const advancesStory =
      isFirst &&
      hotspot.advancesStory !== false &&
      !hotspot.optional &&
      Boolean(
        hotspot.required ||
          hotspot.nextSceneId ||
          hotspot.endPart ||
          hotspot.sequence ||
          hotspot.stepId,
      );

    // Rejeu (hotspot déjà utilisé) : rouvre le contenu sans re-progresser
    if (!isFirst) {
      await this.replayHotspot(hotspot);
      return;
    }

    // Première activation : on marque l’interaction tout de suite pour l’UI,
    // sauf pour les longues séquences d’exercices (marquage en fin — reprise possible).
    const deferInteracted = Boolean(
      hotspot.sequence?.some(
        (s) =>
          s.type === 'exercise' ||
          s.type === 'cloze' ||
          s.type === 'quiz' ||
          s.type === 'notebook',
      ),
    );
    if (!deferInteracted) {
      this.sceneState.interacted.add(hotspot.id);
      if (hotspot.exam) this.sceneState.examined.add(hotspot.id);
      await this.persistHotspotState();
    }

    if (hotspot.revealObject) {
      this.sceneState.flags[`revealed_${hotspot.revealObject}`] = true;
    }
    if (hotspot.setFlag && advancesStory) {
      this.sceneState.flags[hotspot.setFlag] =
        hotspot.flagValue !== undefined ? hotspot.flagValue : true;
    }

    this.renderHotspotsOnly();

    if (hotspot.overlay) await this.playOverlay(hotspot.overlay);

    if (hotspot.sequence && hotspot.sequence.length) {
      await this.runSequence(hotspot.sequence, {
        optional: Boolean(hotspot.optional) || !advancesStory,
      });
      this.sceneState.interacted.add(hotspot.id);
      if (hotspot.exam) this.sceneState.examined.add(hotspot.id);
      await this.persistHotspotState();
      this.renderHotspotsOnly();
      if (advancesStory) await this.tryAdvanceIfAllRequired();
      return;
    }

    if (hotspot.lines && hotspot.lines.length) {
      const endsScene =
        advancesStory &&
        Boolean(
          hotspot.nextSceneId ||
            hotspot.endPart ||
            hotspot.completeScene === true,
        );
      // runStep attend la fermeture complète du dialogue (évite d’avancer
      // pendant qu’un dialogue est encore ouvert, ex. 4e objet de la cabine).
      await this.runStep(
        {
          type: 'dialogue',
          lines: hotspot.lines,
          nextStepId: hotspot.nextStepId,
          nextSceneId: endsScene ? hotspot.nextSceneId : undefined,
          endPart: endsScene ? hotspot.endPart : undefined,
          message: hotspot.message,
          announce: hotspot.announce,
          completeScene:
            hotspot.completeScene !== undefined
              ? hotspot.completeScene
              : endsScene
                ? true
                : false,
        },
        { optional: Boolean(hotspot.optional) },
      );
      if (advancesStory && !endsScene) await this.tryAdvanceIfAllRequired();
      return;
    }

    if (hotspot.stepId) {
      const step = (this.currentScene.steps || []).find(
        (s) => s.id === hotspot.stepId,
      );
      if (step) {
        await this.runStep(step, { optional: Boolean(hotspot.optional) });
        return;
      }
    }

    if (advancesStory) await this.tryAdvanceIfAllRequired();
  }

  /**
   * Dialogue d’exploration silas : valide la découverte UNIQUEMENT
   * à la fermeture complète (dernière réplique + OK).
   */
  async playSilasDiscovery(hotspot) {
    if (this.isUiBlocking()) return;
    const lines = hotspot.lines || [];
    if (!lines.length && hotspot.sequence?.length) {
      // séquence → extraire lignes du premier dialogue
      const dlg = hotspot.sequence.find((s) => s.type === 'dialogue');
      if (dlg?.lines?.length) {
        await this.runStep(
          {
            type: 'dialogue',
            lines: dlg.lines,
            completeScene: false,
            _silasDiscoveryId: hotspot.id,
          },
          { optional: true },
        );
        return;
      }
    }
    if (!lines.length) {
      // pas de dialogue : ne compte pas comme lecture complète
      return;
    }
    await this.runStep(
      {
        type: 'dialogue',
        lines,
        completeScene: false,
        _silasDiscoveryId: hotspot.id,
      },
      { optional: true },
    );
  }

  /**
   * Hotspot multi-phases (lettre de Thalès).
   * Premier clic : toute la séquence en un seul dialogue (Continuer dans la
   * boîte entre répliques — plus de re-clic sur le parchemin).
   * Rejeu : relit tout sans re-progresser.
   */
  async handlePhasedHotspot(hotspot) {
    const total = hotspot.phases.length;
    const completed = this.sceneState.phaseCompleted?.has(hotspot.id);
    const allLines = hotspot.phases.flatMap((p) => p.lines || []);

    if (completed || this.sceneState.interacted.has(hotspot.id)) {
      await this.runStep(
        {
          type: 'dialogue',
          lines: allLines,
          completeScene: false,
        },
        { optional: true },
      );
      return;
    }

    if (hotspot.exam) this.sceneState.examined.add(hotspot.id);
    if (hotspot.revealObject) {
      this.sceneState.flags[`revealed_${hotspot.revealObject}`] = true;
    }

    const advancesStory =
      hotspot.advancesStory !== false &&
      !hotspot.optional &&
      Boolean(hotspot.required || hotspot.nextSceneId || hotspot.endPart);

    // Marquer toutes les phases comme lues à la fermeture (index = last)
    this.sceneState.phaseIndex[hotspot.id] = Math.max(0, total - 1);
    await this.persistHotspotState();
    this.renderHotspotsOnly();

    if (hotspot.overlay) await this.playOverlay(hotspot.overlay);

    await this.runStep(
      {
        type: 'dialogue',
        lines: allLines,
        completeScene: false,
        nextSceneId: advancesStory ? hotspot.nextSceneId : undefined,
        endPart: advancesStory ? hotspot.endPart : undefined,
        message: hotspot.message,
        announce: hotspot.announce,
        _phaseHotspot: hotspot.id,
        _phaseIsLast: true,
        _phaseTotal: total,
      },
      { optional: false },
    );
  }

  /**
   * Une séquence multi-exercices est « pédagogique terminée » si chaque
   * exercice progressif est réussi ou a débloqué la correction.
   */
  isSequencePedagogicallyDone(hotspot) {
    const exercises = (hotspot.sequence || []).filter(
      (s) =>
        (s.type === 'exercise' || s.type === 'cloze') &&
        s.progressiveHelp &&
        s.id,
    );
    if (!exercises.length) return this.sceneState.interacted.has(hotspot.id);
    return exercises.every((ex) => {
      const st = getExerciseFromProgress(this.progress, ex.id);
      return st.succeeded || st.correctionUnlocked;
    });
  }

  /**
   * Rejoue un hotspot déjà validé : dialogues / observations seulement,
   * sans double récompense ni second endPart.
   * Si la séquence d’exercices est incomplète (rechargement), la reprend.
   */
  async replayHotspot(hotspot) {
    if (
      hotspot.sequence?.length &&
      !this.isSequencePedagogicallyDone(hotspot)
    ) {
      // Reprise après rechargement : pas de second endPart si déjà fait
      const partId = this.content.meta?.partId || 'prologue';
      const partDone = (this.progress.completedParts || []).includes(partId);
      const steps = hotspot.sequence.map((s) => {
        const copy = { ...s };
        if (partDone) {
          delete copy.endPart;
          delete copy.nextSceneId;
        }
        return copy;
      });
      await this.runSequence(steps, { optional: partDone });
      this.sceneState.interacted.add(hotspot.id);
      await this.persistHotspotState();
      this.renderHotspotsOnly();
      if (!partDone) await this.tryAdvanceIfAllRequired();
      return;
    }

    if (hotspot.lines?.length) {
      await this.playDialogue(
        { type: 'dialogue', lines: hotspot.lines, completeScene: false },
        { optional: true },
      );
      return;
    }
    if (hotspot.sequence?.length) {
      const firstDlg = hotspot.sequence.find((s) => s.type === 'dialogue');
      if (firstDlg) {
        await this.playDialogue(
          {
            ...firstDlg,
            completeScene: false,
            nextSceneId: undefined,
            endPart: undefined,
            setVisualStage: undefined,
          },
          { optional: true },
        );
      }
      return;
    }
    if (hotspot.phases?.length) {
      // Rejeu d’un hotspot multi-phases déjà entièrement lu
      await this.handlePhasedHotspot(hotspot);
    }
  }

  async persistHotspotState() {
    if (!this.currentScene) return;
    const sceneId = this.currentScene.id;
    const prev = this.progress.sceneHotspots || {};
    this.progress = {
      ...this.progress,
      sceneHotspots: {
        ...prev,
        [sceneId]: {
          interacted: [...this.sceneState.interacted],
          examined: [...this.sceneState.examined],
          phaseIndex: { ...(this.sceneState.phaseIndex || {}) },
          phaseCompleted: [...(this.sceneState.phaseCompleted || [])],
        },
      },
    };
    await this.persist();
  }

  /**
   * Quand tous les hotspots marqués required sont examinés,
   * enchaîne next / nextSceneId de la scène.
   * Si exerciseQueue est définie, la sortie dépend UNIQUEMENT des exercices
   * (pas du nombre de hotspots cliqués).
   */
  async tryAdvanceIfAllRequired() {
    const scene = this.currentScene;
    if (!scene) return false;

    if (scene.exerciseQueue?.ids?.length) {
      if (!isQueueComplete(this.progress, scene.exerciseQueue.ids)) {
        return false;
      }
      // File complète : avancer une seule fois
      if (this.sceneState._advanced) return true;
      this.sceneState._advanced = true;
      if (scene.exerciseQueue.outro?.length) {
        await this.runStep(
          {
            type: 'dialogue',
            lines: scene.exerciseQueue.outro,
            completeScene: false,
          },
          { optional: true },
        );
      }
      const nextScene = scene.next || nextInOrder(this.content, scene.id);
      if (nextScene) {
        await this.completeCurrentScene(nextScene);
        await this.goto(nextScene);
        return true;
      }
      return false;
    }

    const required = (scene.hotspots || []).filter((h) => h.required);
    if (!required.length) return false;
    const allDone = required.every((h) => this.sceneState.interacted.has(h.id));
    if (!allDone) return false;

    // Évite double avance
    if (this.sceneState._advanced) return true;
    this.sceneState._advanced = true;

    if (scene.onAllRequired) {
      await this.runStep(scene.onAllRequired);
      return true;
    }

    const nextScene = scene.next || nextInOrder(this.content, scene.id);
    if (nextScene) {
      await this.completeCurrentScene(nextScene);
      await this.goto(nextScene);
      return true;
    }
    return false;
  }

  /**
   * Ouvre le prochain exercice de la file (A→B→C→D), quel que soit le hotspot.
   */
  async playTrainingQueueFromHotspot(_hotspot) {
    const scene = this.currentScene;
    const queue = scene.exerciseQueue;
    if (!queue?.ids?.length) return;

    const ids = queue.ids;
    const nextId = getNextQueueExerciseId(this.progress, ids);

    if (!nextId) {
      await this.tryAdvanceIfAllRequired();
      return;
    }

    const defs = queue.exercises || {};
    const def = defs[nextId];
    if (!def) {
      this.onStatus(`Exercice manquant dans la file : ${nextId}`);
      return;
    }

    const idx = ids.indexOf(nextId);
    const stepLabel = formatQueueStepLabel(this.progress, ids);

    // Intro une seule fois avant l’exercice A (flag configurable par file)
    const introFlag = queue.introFlag || 'p1_train_intro_shown';
    if (idx === 0 && queue.intro?.length && !this.progress.flags?.[introFlag]) {
      await this.runStep(
        {
          type: 'dialogue',
          lines: queue.intro,
          completeScene: false,
        },
        { optional: true },
      );
      this.progress = {
        ...this.progress,
        flags: { ...(this.progress.flags || {}), [introFlag]: true },
      };
      await this.persist();
    }

    // Conserver le type du contenu (exercise / cloze) — ne pas forcer exercise
    const step = {
      ...def,
      type: def.type || 'exercise',
      id: nextId,
      title: `${stepLabel}${def.title ? ` — ${def.title}` : ''}`,
      completeScene: false,
    };

    await this.runStep(step);

    // Après clôture de l’exercice (succès ou correction acquittée)
    if (isQueueComplete(this.progress, ids)) {
      await this.tryAdvanceIfAllRequired();
    } else {
      const remain = formatQueueStepLabel(this.progress, ids);
      this.showPrompt(
        this.tpl(
          scene.prompt ||
            `Touchez une balise pour ${remain.toLowerCase()}.`,
        ),
      );
    }
  }

  /**
   * Enchaîne plusieurs étapes (dialogues, QCM…) liées à un hotspot.
   * Chaque étape UI se termine via finishStep / afterDialogue.
   */
  async runSequence(steps, { optional = false } = {}) {
    for (let i = 0; i < steps.length; i += 1) {
      const step = { ...steps[i] };
      const isLast = i === steps.length - 1;
      step._holdAdvance = !isLast;
      if (!isLast) {
        delete step.nextSceneId;
        delete step.endPart;
        step.completeScene = false;
      } else if (optional) {
        step.completeScene = false;
      }
      await this.runStep(step, { optional: optional && isLast });
    }
  }

  /**
   * Lance une étape et attend sa fin (interaction utilisateur).
   */
  runStep(step, { optional = false } = {}) {
    if (!step) return Promise.resolve();
    this.sceneState.activeStep = step;

    return new Promise((resolve) => {
      this._stepDone = resolve;

      const done = () => this.completeStepPromise();

      switch (step.type) {
        case 'dialogue':
          this.playDialogue(step, { optional });
          break;
        case 'quiz':
          this.playQuiz(step, { optional });
          break;
        case 'exercise':
          this.playExercise(step);
          break;
        case 'cloze':
          this.playCloze(step);
          break;
        case 'notebook':
          this.playNotebook(step);
          break;
        case 'fragmentZoom':
          this.playFragmentZoom(step).then(async () => {
            if (step._holdAdvance) done();
            else await this.finishStep(step);
          });
          break;
        case 'fragmentBoard':
          this.playFragmentBoard(step).then(async () => {
            if (step._holdAdvance) done();
            else await this.finishStep(step);
          });
          break;
        case 'overlay':
          this.playOverlay(step).then(async () => {
            if (step.nextStepId) {
              const next = (this.currentScene.steps || []).find(
                (s) => s.id === step.nextStepId,
              );
              if (next) {
                await this.runStep(next);
                return;
              }
            }
            if (step._holdAdvance) {
              done();
              return;
            }
            await this.finishStep(step);
          });
          break;
        case 'transition':
          this.playTransition(step);
          break;
        case 'goto':
          this.goto(step.sceneId || step.next).then(done);
          break;
        case 'endPart':
          this.endPart(step).then(done);
          break;
        default:
          this.onStatus(`Type d’étape inconnu : ${step.type}`);
          done();
      }
    });
  }

  completeStepPromise() {
    const r = this._stepDone;
    this._stepDone = null;
    if (r) r();
  }

  tpl(text) {
    if (text == null) return '';
    return String(text).replaceAll('{{playerName}}', this.playerName);
  }

  portraitFor(speaker) {
    if (!speaker) return null;
    const key = String(speaker).trim().toLocaleLowerCase('fr-FR');
    if (Object.prototype.hasOwnProperty.call(SPEAKER_PORTRAITS, key)) {
      return SPEAKER_PORTRAITS[key];
    }
    // match partial
    for (const [k, v] of Object.entries(SPEAKER_PORTRAITS)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
  }

  /**
   * Enregistre un fragment de carte (idempotent).
   * @param {number} n
   */
  async registerFragment(n) {
    const id = Number(n) || 1;
    const prev = this.progress.fragmentsCollected || [];
    if (prev.includes(id)) {
      // Idempotent : s’assurer que les flags nommés existent (ex. fragment2Collected)
      const flags = { ...(this.progress.flags || {}) };
      let changed = false;
      if (!flags[`fragment_${id}`]) {
        flags[`fragment_${id}`] = true;
        changed = true;
      }
      if (id === 2 && !flags.fragment2Collected) {
        flags.fragment2Collected = true;
        changed = true;
      }
      if (id === 3 && !flags.fragment3Collected) {
        flags.fragment3Collected = true;
        changed = true;
      }
      if (id === 4 && !flags.fragment4Collected) {
        flags.fragment4Collected = true;
        changed = true;
      }
      if (id === 5 && !flags.fragment5Collected) {
        flags.fragment5Collected = true;
        changed = true;
      }
      if (id === 6 && !flags.fragment6Collected) {
        flags.fragment6Collected = true;
        changed = true;
      }
      if (changed) {
        this.progress = { ...this.progress, flags };
        await this.persist();
      }
      return false;
    }
    const flags = {
      ...(this.progress.flags || {}),
      [`fragment_${id}`]: true,
    };
    if (id === 1) flags.fragment1Collected = true;
    if (id === 2) flags.fragment2Collected = true;
    if (id === 3) flags.fragment3Collected = true;
    if (id === 4) flags.fragment4Collected = true;
    if (id === 5) flags.fragment5Collected = true;
    if (id === 6) flags.fragment6Collected = true;
    this.progress = {
      ...this.progress,
      fragmentsCollected: [...prev, id].sort((a, b) => a - b),
      flags,
    };
    await this.persist();
    return true;
  }

  hasFragment(n) {
    return (this.progress.fragmentsCollected || []).includes(Number(n));
  }

  async playOverlay(cfg) {
    if (cfg?.kind === 'fragmentZoom') {
      return this.playFragmentZoom(cfg);
    }
    if (cfg?.kind === 'fragmentBoard') {
      return this.playFragmentBoard(cfg);
    }
    return new Promise((resolve) => {
      this.sceneState.overlayOpen = true;
      const layer = document.createElement('div');
      layer.className = 'overlay-layer';
      layer.innerHTML = `
        <div class="overlay-card">
          ${
            cfg.image
              ? `<img src="${escapeAttr(cfg.image)}" alt="${escapeAttr(cfg.alt || '')}" class="overlay-image" />`
              : ''
          }
          ${cfg.text ? `<p class="overlay-text">${escapeHtml(this.tpl(cfg.text))}</p>` : ''}
          <button type="button" class="btn-primary btn-touch" id="overlay-ok">Continuer</button>
        </div>
      `;
      this.stageEl.appendChild(layer);
      layer.querySelector('#overlay-ok').addEventListener('click', () => {
        layer.remove();
        this.sceneState.overlayOpen = false;
        resolve();
      });
    });
  }

  /** Zoom centré d’un fragment (première découverte obligatoire avant Continuer) */
  async playFragmentZoom(cfg) {
    return new Promise((resolve) => {
      this.sceneState.overlayOpen = true;
      this.setUiBlocking(true);
      const layer = document.createElement('div');
      layer.className = 'fragment-zoom-overlay';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-label', cfg.alt || 'Fragment de carte');
      const img =
        cfg.image || '/tresor-de-thales/assets/objects/part1/fragment-carte-1.png';
      layer.innerHTML = `
        <img src="${escapeAttr(img)}" alt="${escapeAttr(cfg.alt || 'Premier fragment de la carte de Thalès')}" />
        <button type="button" class="btn-primary btn-touch" id="overlay-ok">Continuer</button>
      `;
      this.stageEl.appendChild(layer);
      layer.querySelector('#overlay-ok').addEventListener('click', () => {
        layer.remove();
        this.sceneState.overlayOpen = false;
        this.setUiBlocking(false);
        resolve();
      });
    });
  }

  /**
   * Image d’un fragment sur le plateau (1…n).
   * @param {number} i
   */
  fragmentBoardImageSrc(i) {
    const n = Number(i) || 1;
    if (n === 1) return '/tresor-de-thales/assets/objects/part1/fragment-carte-1.png';
    if (n === 2) return '/tresor-de-thales/assets/objects/part2/fragment-carte-2.png';
    if (n === 3) return '/tresor-de-thales/assets/objects/part3/fragment-carte-3.png';
    if (n === 4) return '/tresor-de-thales/assets/objects/part4/fragment-carte-4.png';
    if (n === 5) return '/tresor-de-thales/assets/objects/part5/fragment-carte-5.png';
    if (n === 6) return '/tresor-de-thales/assets/objects/part6/fragment-carte-6.png';
    // Placeholders pour les fragments suivants
    return '/tresor-de-thales/assets/objects/part1/fragment-carte-1.png';
  }

  /**
   * Plateau des fragments : places remplies + emplacements vides.
   * Idempotent : registerFragment n’ajoute qu’une fois.
   * total par défaut 6 (parcours complet) ; placeFragment = n° placé.
   */
  async playFragmentBoard(cfg) {
    const total = Number(cfg.total) || 6;
    const place = Number(cfg.placeFragment) || 1;
    // Enregistrer avant affichage (idempotent)
    await this.registerFragment(place);
    const collected = new Set(this.progress.fragmentsCollected || []);

    return new Promise((resolve) => {
      this.sceneState.overlayOpen = true;
      this.setUiBlocking(true);
      const layer = document.createElement('div');
      layer.className = 'fragment-zoom-overlay';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute(
        'aria-label',
        `Fragments récupérés : ${collected.size} / ${total}`,
      );

      const slots = [];
      for (let i = 1; i <= total; i += 1) {
        if (collected.has(i)) {
          const src = this.fragmentBoardImageSrc(i);
          slots.push(`
            <div class="fragment-board-slot filled" aria-label="Fragment ${i} placé">
              <img src="${escapeAttr(src)}" alt="Fragment ${i}" />
            </div>`);
        } else {
          slots.push(`
            <div class="fragment-board-slot" aria-label="Emplacement vide ${i}">
              <span class="slot-empty">${i}</span>
            </div>`);
        }
      }

      layer.innerHTML = `
        <p class="fragment-board-status">Fragments récupérés : ${collected.size} / ${total}</p>
        <div class="fragment-board">${slots.join('')}</div>
        <button type="button" class="btn-primary btn-touch" id="overlay-ok">Continuer</button>
      `;
      this.stageEl.appendChild(layer);
      layer.querySelector('#overlay-ok').addEventListener('click', () => {
        layer.remove();
        this.sceneState.overlayOpen = false;
        this.setUiBlocking(false);
        resolve();
      });
    });
  }

  playTransition(step) {
    const layer = document.createElement('div');
    layer.className = 'overlay-layer transition-layer';
    layer.innerHTML = `
      <div class="transition-card">
        ${
          step.image
            ? `<div class="transition-bg" style="background-image:url('${escapeAttr(step.image)}')"></div>`
            : ''
        }
        <div class="transition-text">
          <h2>${escapeHtml(this.tpl(step.title || ''))}</h2>
          <p>${escapeHtml(this.tpl(step.subtitle || ''))}</p>
        </div>
        <button type="button" class="btn-primary btn-touch" id="tr-ok">Continuer</button>
      </div>
    `;
    this.stageEl.appendChild(layer);
    layer.querySelector('#tr-ok').addEventListener('click', () => {
      layer.remove();
      if (step.lines && step.lines.length) {
        this.playDialogue(
          {
            type: 'dialogue',
            lines: step.lines,
            nextSceneId: step.nextSceneId,
            endPart: step.endPart,
            message: step.message,
            announce: step.announce,
            completeScene: step.completeScene,
            _holdAdvance: step._holdAdvance,
          },
          { optional: false },
        );
      } else {
        this.finishStep(step);
      }
    });
  }

  async playDialogue(step, { optional = false } = {}) {
    this.setUiBlocking(true);
    const lines = (step.lines || []).map((l) => ({ ...l }));
    let index = 0;

    const renderLine = () => {
      this.uiEl.innerHTML = '';
      if (index >= lines.length) {
        this.afterDialogue(step, optional);
        return;
      }

      const line = lines[index];
      const speaker = this.tpl(line.speaker || '');
      const text = this.tpl(line.text || '');
      const portrait = line.portrait || this.portraitFor(speaker);

      const panel = document.createElement('div');
      panel.className = 'dialogue-panel';
      panel.innerHTML = `
        <div class="dialogue-row">
          <div class="dialogue-portrait-wrap ${portrait ? '' : 'no-portrait'}">
            ${
              portrait
                ? `<img class="dialogue-portrait" src="${escapeAttr(portrait)}" alt="${escapeAttr(speaker)}" />`
                : `<div class="dialogue-portrait placeholder" aria-hidden="true"></div>`
            }
          </div>
          <div class="dialogue-body">
            <p class="dialogue-speaker">${escapeHtml(speaker)}</p>
            <p class="dialogue-text">${escapeHtml(text)}</p>
            <div class="dialogue-choices"></div>
          </div>
        </div>
      `;

      const choicesEl = panel.querySelector('.dialogue-choices');

      if (line.choices && line.choices.length) {
        for (const choice of line.choices) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn-choice btn-touch';
          b.textContent = this.tpl(choice.text);
          b.addEventListener('click', () => {
            if (choice.setFlag) {
              this.sceneState.flags[choice.setFlag] =
                choice.flagValue !== undefined ? choice.flagValue : true;
              this.progress.flags = {
                ...(this.progress.flags || {}),
                ...this.sceneState.flags,
              };
            }
            const replies = choice.replies || (choice.reply ? [choice.reply] : []);
            if (replies.length) {
              lines.splice(
                index + 1,
                0,
                ...replies.map((r) => ({
                  speaker: r.speaker,
                  text: r.text,
                  portrait: r.portrait,
                })),
              );
            }
            index += 1;
            renderLine();
          });
          choicesEl.appendChild(b);
        }
      } else {
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'btn-primary btn-touch';
        next.textContent = index < lines.length - 1 ? 'Continuer' : 'OK';
        next.addEventListener('click', () => {
          index += 1;
          renderLine();
        });
        choicesEl.appendChild(next);
      }

      this.uiEl.appendChild(panel);
      renderMathInContainer(panel);
    };

    renderLine();
  }

  async afterDialogue(step, optional) {
    if (optional) {
      this.uiEl.innerHTML = '';
      this.setUiBlocking(false);
      // Découverte silas : validation à la fermeture complète uniquement
      if (step._silasDiscoveryId) {
        await this.onSilasDiscoveryDialogueClosed(step._silasDiscoveryId);
        this.completeStepPromise();
        return;
      }
      // Restaure le bouton principal (ex. Affronter Silas) après une blague optionnelle
      this.showExplorationUi();
      this.completeStepPromise();
      return;
    }
    if (step._holdAdvance) {
      if (step.setVisualStage) {
        await this.applyVisualStage(step.setVisualStage);
      }
      this.uiEl.innerHTML = '';
      // Entre deux étapes d’une séquence le bloqueur reste volontairement
      // (prochaine étape s’ouvre tout de suite). S’il n’y a pas de suite, libérer.
      this.completeStepPromise();
      return;
    }
    // Phase de lecture multi-touch (lettre, etc.)
    if (step._phaseHotspot) {
      const id = step._phaseHotspot;
      const total =
        step._phaseTotal ||
        this.currentScene?.hotspots?.find((h) => h.id === id)?.phases?.length ||
        0;
      const currentIdx = Number(this.sceneState.phaseIndex[id]) || 0;
      const nextState = afterPhaseClosed({
        phaseIndex: currentIdx,
        totalPhases: total,
      });
      this.sceneState.phaseIndex[id] = nextState.phaseIndex;

      if (nextState.completed || step._phaseIsLast) {
        this.sceneState.phaseCompleted.add(id);
        this.sceneState.interacted.add(id);
        await this.persistHotspotState();
        if (step.nextSceneId || step.endPart) {
          this.setUiBlocking(false);
          await this.finishStep({
            ...step,
            completeScene: true,
          });
          return;
        }
        this.uiEl.innerHTML = '';
        this.setUiBlocking(false);
        const advanced = await this.tryAdvanceIfAllRequired();
        if (!advanced) {
          this.showPrompt(
            this.tpl(
              this.currentScene.prompt || 'Continuez d’explorer le décor.',
            ),
          );
        }
        this.completeStepPromise();
        return;
      }

      // Phase intermédiaire : libère l’UI et laisse le hotspot recliquable
      await this.persistHotspotState();
      this.uiEl.innerHTML = '';
      this.setUiBlocking(false);
      this.showPrompt(
        this.tpl(
          this.currentScene.prompt ||
            'Touchez à nouveau pour poursuivre la lecture.',
        ),
      );
      this.completeStepPromise();
      return;
    }

    // Interaction locale : ne termine pas la scène, vérifie le palier
    if (step.completeScene === false) {
      // Appliquer le stade (ex. fragment → silas) sans endPart
      if (step.setVisualStage) {
        await this.applyVisualStage(step.setVisualStage);
        this.completeStepPromise();
        return;
      }
      await this.persist();
      this.uiEl.innerHTML = '';
      this.setUiBlocking(false);
      if (this.getActiveVisualStage() === 'silas') {
        await this.enterSilasStage();
      } else {
        const advanced = await this.tryAdvanceIfAllRequired();
        if (!advanced) {
          this.showPrompt(
            this.tpl(this.currentScene.prompt || 'Continuez d’explorer le décor.'),
          );
        }
      }
      this.completeStepPromise();
      return;
    }
    await this.finishStep(step);
  }

  /**
   * QCM :
   * - noté : clic = évaluation immédiate ; erreur non bloquante
   * - narratif (allowAny) : toute réponse enchaîne (prologue) — inchangé
   * - progressiveHelp : indices Maki + correction Euclide selon exerciseHelp
   */
  playQuiz(step, { optional = false } = {}) {
    this.uiEl.innerHTML = '';
    this.setUiBlocking(true);
    const panel = document.createElement('div');
    panel.className = 'quiz-panel';
    const narrative = Boolean(step.allowAny || step.narrative);
    const progressive = Boolean(step.progressiveHelp) && !narrative;
    const exerciseId =
      step.id || step.exerciseId || `quiz_${this.currentScene.id}`;
    const hints = step.hints || [];
    const maxHints = Math.min(MAX_HINTS, hints.length);
    let pedState = progressive
      ? getExerciseFromProgress(this.progress, exerciseId)
      : null;

    const quizFig = step.figure
      ? figureSvg(step.figure, step.figureLabels || {})
      : '';
    panel.innerHTML = `
      <p class="quiz-question"><strong>${escapeHtml(this.tpl(step.question || 'Question'))}</strong></p>
      ${quizFig ? `<div class="figure-box">${quizFig}</div>` : ''}
      ${
        step.math
          ? `<div class="math-block" data-math="${escapeAttr(step.math)}" data-display="true"></div>`
          : ''
      }
      <div class="hint-buttons btn-row" id="quiz-hint-buttons"></div>
      <div class="hint-host" id="quiz-hint-host"></div>
      <div class="quiz-options"></div>
      <div class="feedback-host"></div>
      <div class="btn-row"></div>
    `;

    const optionsEl = panel.querySelector('.quiz-options');
    const feedback = panel.querySelector('.feedback-host');
    const btnRow = panel.querySelector('.btn-row');
    const hintButtons = panel.querySelector('#quiz-hint-buttons');
    const hintHost = panel.querySelector('#quiz-hint-host');
    const makiPortrait = '/tresor-de-thales/assets/portraits/maki.png';
    const euclidePortrait = '/tresor-de-thales/assets/portraits/euclide.png';
    let solved = false;

    const persistPed = async () => {
      if (!progressive || !pedState) return;
      this.progress = setExerciseInProgress(
        this.progress,
        exerciseId,
        pedState,
      );
      await this.persist();
    };

    const renderEuclide = () => {
      if (!step.correction) return '';
      const lines = String(step.correction)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      return `<div class="correction-box euclide-correction">
        <div class="correction-header">
          <img class="hint-portrait" src="${escapeAttr(euclidePortrait)}" alt="Maître Euclide" />
          <p class="dialogue-speaker">Maître Euclide</p>
        </div>
        ${lines.map((l) => `<p>${escapeHtml(this.tpl(l))}</p>`).join('')}
        ${this.euclideNotebookBubbleHtml()}
      </div>`;
    };

    const showMakiHint = (level) => {
      const raw = hints[level - 1];
      const body = typeof raw === 'string' ? raw : raw?.text || '';
      const reaction =
        (typeof raw === 'object' && raw?.reaction) || 'Krii !';
      return `<div class="hint-box maki-hint">
        <img class="hint-portrait" src="${escapeAttr(makiPortrait)}" alt="Maki" />
        <div class="hint-body">
          <p class="dialogue-speaker">Maki · indice ${level}</p>
          <p><em>${escapeHtml(reaction)}</em> ${escapeHtml(this.tpl(body))}</p>
        </div>
      </div>`;
    };

    const refreshHintButtons = () => {
      if (!progressive || maxHints === 0) {
        hintButtons.innerHTML = '';
        return;
      }
      hintButtons.innerHTML = '';
      for (let lvl = 1; lvl <= maxHints; lvl += 1) {
        const unlocked = isHintAvailable(pedState, lvl);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-secondary btn-touch hint-lock-btn';
        b.disabled = !unlocked;
        b.textContent = unlocked
          ? `Indice ${lvl} — Maki`
          : `Indice ${lvl} (verrouillé)`;
        b.addEventListener('click', async () => {
          if (!isHintAvailable(pedState, lvl)) return;
          const res = useHint(pedState, lvl);
          pedState = res.state;
          await persistPed();
          if (res.ok) {
            // Comptage prof uniquement à l’affichage réel de l’indice Maki
            hintHost.innerHTML = showMakiHint(lvl);
            await this.noteMakiHintDisplayed(exerciseId, lvl);
            refreshHintButtons();
          }
        });
        hintButtons.appendChild(b);
      }
    };

    const finishCorrect = (opt) => {
      solved = true;
      optionsEl.querySelectorAll('button').forEach((btn) => {
        btn.disabled = true;
      });
      let html = `<div class="feedback ok">${escapeHtml(
        this.tpl(step.success || opt.success || 'Bien joué !'),
      )}</div>`;
      if (progressive && step.correction) {
        html += renderEuclide();
      }
      feedback.innerHTML = html;
      btnRow.innerHTML = '';
      const cont = document.createElement('button');
      cont.type = 'button';
      cont.className = 'btn-primary btn-touch';
      cont.textContent = 'Continuer';
      cont.addEventListener('click', () => {
        this.setUiBlocking(false);
        this.finishStep(step);
      });
      btnRow.appendChild(cont);
    };

    const finishAfterFullCorrection = () => {
      solved = true;
      optionsEl.querySelectorAll('button').forEach((btn) => {
        btn.disabled = true;
      });
      feedback.innerHTML = renderEuclide();
      btnRow.innerHTML = '';
      const cont = document.createElement('button');
      cont.type = 'button';
      cont.className = 'btn-primary btn-touch';
      cont.textContent = 'J’ai compris';
      cont.addEventListener('click', () => {
        this.setUiBlocking(false);
        this.finishStep(step);
      });
      btnRow.appendChild(cont);
    };

    if (progressive && pedState.succeeded) {
      finishCorrect({ success: step.success });
      refreshHintButtons();
      this.uiEl.appendChild(panel);
      renderMathInContainer(panel);
      return;
    }
    if (progressive && pedState.correctionUnlocked && !pedState.succeeded) {
      finishAfterFullCorrection();
      refreshHintButtons();
      this.uiEl.appendChild(panel);
      renderMathInContainer(panel);
      return;
    }

    refreshHintButtons();

    (step.options || []).forEach((opt, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn-choice btn-touch';
      b.textContent = this.tpl(opt.text);
      b.dataset.optionIndex = String(i);

      b.addEventListener('click', async () => {
        if (solved) return;

        if (narrative) {
          solved = true;
          optionsEl.querySelectorAll('button').forEach((x) => {
            x.disabled = true;
          });
          b.classList.add('selected');
          await this.onAnswer({
            exerciseId,
            rawAnswer: opt.text,
            isCorrect: true,
          });
          const replies = opt.replies || (opt.reply ? [opt.reply] : []);
          if (replies.length) {
            this.playDialogue(
              {
                type: 'dialogue',
                lines: replies,
                nextSceneId: step.nextSceneId,
                nextStepId: step.nextStepId,
                completeScene: step.completeScene,
                endPart: step.endPart,
                message: step.message,
                announce: step.announce,
                _holdAdvance: step._holdAdvance,
                setVisualStage: step.setVisualStage,
              },
              { optional },
            );
            return;
          }
          finishCorrect(opt);
          return;
        }

        // QCM noté
        const correct = Boolean(opt.correct);
        await this.onAnswer({
          exerciseId,
          rawAnswer: opt.text,
          isCorrect: correct,
        });

        if (progressive) {
          pedState = registerAttempt(pedState, correct);
          await persistPed();
          refreshHintButtons();
          if (correct) {
            b.classList.add('selected');
            b.classList.add('correct');
            finishCorrect(opt);
            return;
          }
          b.classList.add('wrong');
          b.disabled = true;
          // Jamais la bonne réponse ni une correction « solution » avant seuil
          let ko = `<div class="feedback ko">${escapeHtml(
            neutralErrorMessage(pedState.wrongAttempts),
          )}</div>`;
          if (pedState.correctionUnlocked && step.correction) {
            ko += renderEuclide();
            feedback.innerHTML = ko;
            finishAfterFullCorrection();
            return;
          }
          feedback.innerHTML = ko;
          return;
        }

        // QCM noté simple (ex. coffre prologue) — explications courtes autorisées
        if (correct) {
          b.classList.add('selected');
          b.classList.add('correct');
          finishCorrect(opt);
          return;
        }
        b.classList.add('wrong');
        b.disabled = true;
        feedback.innerHTML = `<div class="feedback ko">${escapeHtml(
          this.tpl(
            opt.explanation ||
              step.failure ||
              'Ce n’est pas cela. Réessaie.',
          ),
        )}</div>`;
        if (step.wrongFlavor) {
          feedback.innerHTML += `<p class="flavor">${escapeHtml(
            this.tpl(step.wrongFlavor),
          )}</p>`;
        }
      });

      optionsEl.appendChild(b);
    });

    this.uiEl.appendChild(panel);
    renderMathInContainer(panel);
  }

  /**
   * Exercice numérique.
   * Si step.progressiveHelp === true : politique d'indices / correction progressive.
   * Sinon : indices libres (comportement simple, non utilisé par le prologue narratif).
   */
  playExercise(step) {
    this.uiEl.innerHTML = '';
    this.setUiBlocking(true);
    const panel = document.createElement('div');
    panel.className = 'exercise-panel';
    const illustrationPrimary = Boolean(
      step.illustrationPrimary || step.hidePromptDuplicate,
    );
    if (illustrationPrimary) panel.classList.add('illustration-primary');
    const exerciseId =
      step.id || step.exerciseId || `ex_${this.currentScene.id}`;
    const progressive = Boolean(step.progressiveHelp);
    const hints = step.hints || [];
    const maxHints = Math.min(MAX_HINTS, hints.length);
    const isRadical = step.answerType === 'radical';

    let pedState = progressive
      ? getExerciseFromProgress(this.progress, exerciseId)
      : null;

    // figure de recherche (peut être absente pour balises C/D)
    const figHtml = step.figure
      ? figureSvg(step.figure, step.figureLabels || {}) ||
        (step.figure === 'rightTriangle'
          ? rightTriangleSvg(step.figureLabels || {})
          : '')
      : '';
    const illustration = step.illustration
      ? `<img class="exercise-illustration" src="${escapeAttr(step.illustration)}" alt="${escapeAttr(step.illustrationAlt || 'Illustration de l’exercice')}" />`
      : '';
    // Accessible : sr-only si l’illustration porte déjà l’énoncé visible
    const accessHtml = step.accessibleData
      ? `<div class="${illustrationPrimary ? 'sr-only' : 'accessible-data'}" id="ex-accessible">${escapeHtml(this.tpl(step.accessibleData)).replace(/\n/g, '<br/>')}</div>`
      : '';

    const unitHint =
      step.unitHint ||
      (isRadical
        ? 'Saisis la forme radicale exacte (ex. √182,25).'
        : 'Saisis uniquement le nombre (sans unité). Virgule ou point acceptés.');

    const answerLabel =
      step.answerLabel ||
      (isRadical ? 'Votre réponse' : 'Votre réponse (nombre seul)');

    const titleHtml = step.hideTitle
      ? ''
      : illustrationPrimary && step.title
        ? `<p class="exercise-step-title"><strong>${escapeHtml(this.tpl(step.title))}</strong></p>`
        : illustrationPrimary
          ? ''
          : `<p><strong>${escapeHtml(this.tpl(step.title || 'Exercice'))}</strong></p>`;

    const promptHtml = illustrationPrimary
      ? step.prompt
        ? `<p class="sr-only">${escapeHtml(this.tpl(step.prompt))}</p>`
        : ''
      : `<p>${escapeHtml(this.tpl(step.prompt || ''))}</p>
      <p class="field-hint">${escapeHtml(this.tpl(unitHint))}</p>`;

    const hintSr = illustrationPrimary
      ? `<p class="sr-only">${escapeHtml(this.tpl(unitHint))}</p>`
      : '';

    const sqrtBtn = isRadical
      ? `<button type="button" class="btn-secondary btn-touch btn-sqrt-insert" id="btn-sqrt" title="Insérer √" aria-label="Insérer le symbole racine carrée">√</button>`
      : '';

    panel.innerHTML = `
      ${titleHtml}
      ${promptHtml}
      ${hintSr}
      ${illustration}
      ${accessHtml}
      ${figHtml ? `<div class="figure-box" id="ex-figure">${figHtml}</div>` : ''}
      ${
        step.math && !illustrationPrimary
          ? `<div class="math-block" data-math="${escapeAttr(step.math)}" data-display="true"></div>`
          : ''
      }
      <label class="field-label" for="ex-answer">${escapeHtml(answerLabel)}</label>
      <div class="exercise-answer-row">
        <input id="ex-answer" type="text" inputmode="${isRadical ? 'text' : 'decimal'}" autocomplete="off" aria-describedby="${accessHtml ? 'ex-accessible' : ''}" />
        ${sqrtBtn}
      </div>
      <div class="hint-buttons btn-row" id="hint-buttons"></div>
      <div class="hint-host"></div>
      <div class="feedback-host"></div>
      <div class="btn-row" id="ex-actions">
        <button type="button" class="btn-primary btn-touch" id="btn-ok">Valider</button>
      </div>
    `;

    const feedback = panel.querySelector('.feedback-host');
    const hintHost = panel.querySelector('.hint-host');
    const hintButtons = panel.querySelector('#hint-buttons');
    const actions = panel.querySelector('#ex-actions');
    const input = panel.querySelector('#ex-answer');
    const makiPortrait = '/tresor-de-thales/assets/portraits/maki.png';
    const euclidePortrait = '/tresor-de-thales/assets/portraits/euclide.png';

    // Restaurer la saisie précédente (radicaux / reprises)
    if (pedState?.lastAnswer != null && pedState.lastAnswer !== '') {
      input.value = String(pedState.lastAnswer);
    }

    const sqrtInsert = panel.querySelector('#btn-sqrt');
    if (sqrtInsert) {
      sqrtInsert.addEventListener('click', () => {
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const v = input.value;
        input.value = `${v.slice(0, start)}√${v.slice(end)}`;
        const pos = start + 1;
        input.setSelectionRange(pos, pos);
        input.focus();
      });
    }

    const persistPed = async () => {
      if (!progressive || !pedState) return;
      this.progress = setExerciseInProgress(
        this.progress,
        exerciseId,
        pedState,
      );
      await this.persist();
    };

    const renderEuclideCorrection = (opts = {}) => {
      if (!step.correction) return '';
      const corrLines = String(step.correction)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const corrFig = step.correctionFigure
        ? figureSvg(step.correctionFigure, step.correctionFigureLabels || {})
        : '';
      return `<div class="correction-box euclide-correction">
        <div class="correction-header">
          <img class="hint-portrait" src="${escapeAttr(euclidePortrait)}" alt="Maître Euclide" />
          <p class="dialogue-speaker">Maître Euclide</p>
        </div>
        ${corrLines.map((l) => `<p>${escapeHtml(this.tpl(l))}</p>`).join('')}
        ${
          step.correctionMath
            ? `<div class="math-block" data-math="${escapeAttr(step.correctionMath)}" data-display="true"></div>`
            : ''
        }
        ${corrFig ? `<div class="figure-box">${corrFig}</div>` : ''}
        ${this.euclideNotebookBubbleHtml()}
        ${
          opts.afterFiveErrors
            ? `<p class="field-hint">Lis attentivement, puis confirme.</p>`
            : ''
        }
      </div>`;
    };

    const showMakiHint = (level) => {
      const raw = hints[level - 1];
      const body = typeof raw === 'string' ? raw : raw?.text || '';
      const reaction =
        (typeof raw === 'object' && raw?.reaction) || 'Krii !';
      return `<div class="hint-box maki-hint">
        <img class="hint-portrait" src="${escapeAttr(makiPortrait)}" alt="Maki" />
        <div class="hint-body">
          <p class="dialogue-speaker">Maki · indice ${level}</p>
          <p><em>${escapeHtml(reaction)}</em> ${escapeHtml(this.tpl(body))}</p>
        </div>
      </div>`;
    };

    const refreshHintButtons = () => {
      if (!progressive) {
        // Mode simple : un bouton par indice déjà « libre » (peu utilisé)
        hintButtons.innerHTML = '';
        for (let lvl = 1; lvl <= maxHints; lvl += 1) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn-secondary btn-touch';
          b.textContent = `Indice ${lvl}`;
          b.addEventListener('click', async () => {
            hintHost.innerHTML = showMakiHint(lvl);
            await this.noteMakiHintDisplayed(exerciseId, lvl);
          });
          hintButtons.appendChild(b);
        }
        return;
      }

      hintButtons.innerHTML = '';
      for (let lvl = 1; lvl <= maxHints; lvl += 1) {
        const unlocked = isHintAvailable(pedState, lvl);
        const used = pedState.hintsUsed.includes(lvl);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-secondary btn-touch hint-lock-btn';
        if (!unlocked) {
          b.disabled = true;
          b.textContent = `Indice ${lvl} (verrouillé)`;
          b.title = 'Encore quelques tentatives pour débloquer cet indice.';
        } else if (used) {
          b.textContent = `Indice ${lvl} (relu)`;
        } else {
          b.textContent = `Indice ${lvl} — Maki`;
        }
        b.addEventListener('click', async () => {
          if (!isHintAvailable(pedState, lvl)) return;
          const res = useHint(pedState, lvl);
          pedState = res.state;
          await persistPed();
          if (!res.ok) return;
          // Comptage prof uniquement à l’affichage réel de l’indice Maki
          hintHost.innerHTML = showMakiHint(lvl);
          await this.noteMakiHintDisplayed(exerciseId, lvl);
          refreshHintButtons();
        });
        hintButtons.appendChild(b);
      }
    };

    const finishSuccess = async () => {
      input.disabled = true;
      panel.querySelector('#btn-ok').disabled = true;
      let okHtml = `<div class="feedback ok">${escapeHtml(
        this.tpl(step.success || 'Exact !'),
      )}</div>`;
      if (step.correction) {
        okHtml += renderEuclideCorrection();
      }
      feedback.innerHTML = okHtml;
      renderMathInContainer(feedback);
      actions.innerHTML = '';
      const cont = document.createElement('button');
      cont.type = 'button';
      cont.className = 'btn-primary btn-touch';
      cont.textContent = 'Continuer';
      cont.addEventListener('click', () => {
        this.setUiBlocking(false);
        this.finishStep(step);
      });
      actions.appendChild(cont);
    };

    const finishAfterCorrection = () => {
      input.disabled = true;
      panel.querySelector('#btn-ok').disabled = true;
      actions.innerHTML = '';
      const cont = document.createElement('button');
      cont.type = 'button';
      cont.className = 'btn-primary btn-touch';
      cont.textContent = 'J’ai compris';
      cont.addEventListener('click', () => {
        this.setUiBlocking(false);
        this.finishStep(step);
      });
      actions.appendChild(cont);
    };

    // Reprise : exercice déjà réussi
    if (progressive && pedState.succeeded) {
      finishSuccess();
      refreshHintButtons();
      this.uiEl.appendChild(panel);
      renderMathInContainer(panel);
      return;
    }

    // Reprise : correction déjà débloquée par 5 erreurs
    if (progressive && pedState.correctionUnlocked && !pedState.succeeded) {
      feedback.innerHTML = `${renderEuclideCorrection({ afterFiveErrors: true })}`;
      renderMathInContainer(feedback);
      finishAfterCorrection();
      refreshHintButtons();
      this.uiEl.appendChild(panel);
      renderMathInContainer(panel);
      return;
    }

    refreshHintButtons();

    panel.querySelector('#btn-ok').addEventListener('click', async () => {
      const tolerance = step.tolerance ?? 0;
      let result;
      if (isRadical) {
        const rad =
          step.expectedRadicand != null
            ? Number(step.expectedRadicand)
            : Number(step.expected);
        result = checkRadicalAnswer(input.value, rad, tolerance);
      } else {
        result = checkNumericAnswer(
          input.value,
          Number(step.expected),
          tolerance,
        );
      }

      if (progressive && pedState) {
        pedState = {
          ...pedState,
          lastAnswer: input.value,
        };
      }

      await this.onAnswer({
        exerciseId,
        rawAnswer: input.value,
        isCorrect: result.ok,
      });

      if (progressive) {
        pedState = registerAttempt(pedState, result.ok);
        pedState = { ...pedState, lastAnswer: input.value };
        await persistPed();
        refreshHintButtons();

        if (result.ok) {
          await finishSuccess();
          return;
        }

        // Erreur : message neutre, jamais la solution
        let ko = `<div class="feedback ko">${escapeHtml(
          result.reason && isRadical
            ? result.reason
            : neutralErrorMessage(pedState.wrongAttempts),
        )}</div>`;
        if (pedState.correctionUnlocked && step.correction) {
          ko += renderEuclideCorrection({ afterFiveErrors: true });
          feedback.innerHTML = ko;
          renderMathInContainer(feedback);
          finishAfterCorrection();
          return;
        }
        feedback.innerHTML = ko;
        return;
      }

      // Mode non progressif (simple)
      if (result.ok) {
        await finishSuccess();
      } else {
        feedback.innerHTML = `<div class="feedback ko">${escapeHtml(
          this.tpl(
            result.reason || step.failure || 'Ce n’est pas la bonne réponse. Réessaie.',
          ),
        )}</div>`;
      }
    });

    this.uiEl.appendChild(panel);
    renderMathInContainer(panel);
  }

  /**
   * Normalise un step cloze (format part2 objet + format pack part3 tableau).
   * @param {object} raw
   */
  normalizeClozeStep(raw = {}) {
    const step = { ...raw };
    // fields: [{id, expected, size}] → { id: { kind, expected, size } }
    if (Array.isArray(raw.fields)) {
      const map = {};
      for (const f of raw.fields) {
        if (!f?.id) continue;
        const expList = Array.isArray(f.expected)
          ? f.expected
          : f.expected != null
            ? [f.expected]
            : [];
        const size = f.size || 'short';
        // size "short" / kind text|select → texte ; sinon numérique
        let kind = f.kind;
        if (!kind) {
          if (size === 'short' || size === 'text') kind = 'text';
          else if (size === 'select' || Array.isArray(f.options)) kind = 'select';
          else kind = 'number';
        }
        const isNum = kind === 'number' || kind === 'numeric';
        const primaryNum = isNum
          ? (() => {
              const s = String(expList[0] ?? '').trim().replace(',', '.');
              const m = s.match(/-?\d+(?:\.\d+)?/);
              return m ? Number(m[0]) : Number(expList[0]);
            })()
          : null;
        const fieldDef = {
          kind,
          expected: isNum
            ? (Number.isFinite(primaryNum) ? primaryNum : expList[0])
            : expList.length === 1
              ? expList[0]
              : expList,
          accept: expList.map(String),
          size: size || (isNum ? 'num' : 'short'),
          label: f.label,
          options: f.options,
        };
        if (typeof f.tolerance === 'number') {
          fieldDef.tolerance = f.tolerance;
        }
        map[f.id] = fieldDef;
      }
      step.fields = map;
    } else {
      step.fields = raw.fields || {};
    }

    // lines: string[] avec {{field}} → { parts: [...] }[]
    if (
      Array.isArray(raw.lines) &&
      raw.lines.length &&
      typeof raw.lines[0] === 'string'
    ) {
      step.lines = raw.lines.map((line) => {
        const parts = [];
        const re = /\{\{(\w+)\}\}/g;
        let last = 0;
        let m = re.exec(line);
        while (m) {
          if (m.index > last) {
            parts.push({ type: 'text', text: line.slice(last, m.index) });
          }
          parts.push({ type: 'field', id: m[1] });
          last = m.index + m[0].length;
          m = re.exec(line);
        }
        if (last < line.length) {
          parts.push({ type: 'text', text: line.slice(last) });
        }
        return { parts };
      });
    }

    if (Array.isArray(raw.correction)) {
      step.correction = raw.correction.join('\n');
    }

    // Hints présents → politique progressive (indices Maki)
    if (Array.isArray(raw.hints) && raw.hints.length && raw.progressiveHelp == null) {
      step.progressiveHelp = true;
    }
    // Pas d’indices Maki si progressiveHelp: false explicitement
    if (raw.progressiveHelp === false) {
      step.progressiveHelp = false;
      step.hints = [];
    }
    if (Array.isArray(raw.unorderedNumericFields)) {
      step.unorderedNumericFields = raw.unorderedNumericFields;
    }
    if (Array.isArray(raw.unorderedNumericExpected)) {
      step.unorderedNumericExpected = raw.unorderedNumericExpected;
    }
    if (raw.coherentNumericGroups) {
      step.coherentNumericGroups = raw.coherentNumericGroups;
    }
    if (Array.isArray(raw.illustrations)) {
      step.illustrations = raw.illustrations;
    } else if (raw.illustration) {
      step.illustrations = [raw.illustration];
    }
    return step;
  }

  /**
   * Schémas d’un cloze : step.illustrations, sinon héritage scène / 1er cloze.
   * Permet d’afficher le schéma sur toutes les sous-questions d’un exercice.
   * @param {object} step
   * @returns {string[]}
   */
  resolveClozeIllustrations(step = {}) {
    if (Array.isArray(step.illustrations) && step.illustrations.length) {
      return step.illustrations.filter(Boolean);
    }
    if (step.illustration) return [step.illustration];

    const scene = this.currentScene;
    if (!scene) return [];

    if (scene.exerciseDiagram) return [scene.exerciseDiagram];
    if (scene.diagram) return [scene.diagram];
    if (Array.isArray(scene.illustrations) && scene.illustrations.length) {
      return scene.illustrations.filter(Boolean);
    }

    for (const s of scene.steps || []) {
      if (s.type !== 'cloze') continue;
      if (Array.isArray(s.illustrations) && s.illustrations.length) {
        return s.illustrations.filter(Boolean);
      }
      if (s.illustration) return [s.illustration];
    }
    return [];
  }

  /**
   * Zoom schéma (modale) — même famille que fragment-zoom / carnet.
   * N’altère pas le panneau cloze ni les saisies en cours.
   * @param {string} src
   * @param {{ alt?: string, closeLabel?: string }} [opts]
   * @returns {Promise<void>}
   */
  openDiagramZoom(src, opts = {}) {
    if (!src) return Promise.resolve();
    const alt = opts.alt || 'Schéma de l’exercice';
    const closeLabel = opts.closeLabel || 'Fermer';
    return new Promise((resolve) => {
      // Évite les superpositions
      try {
        document
          .querySelectorAll?.('.diagram-zoom-overlay')
          ?.forEach((n) => n.remove());
      } catch {
        /* ignore */
      }

      this.sceneState.overlayOpen = true;
      const layer = document.createElement('div');
      layer.className = 'fragment-zoom-overlay diagram-zoom-overlay';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-modal', 'true');
      layer.setAttribute('aria-label', alt);
      layer.innerHTML = `
        <img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" class="diagram-zoom-image" />
        <button type="button" class="btn-primary btn-touch" id="btn-zoom-close">
          ${escapeHtml(closeLabel)}
        </button>`;

      const host =
        this.uiEl?.closest?.('.game-shell') ||
        this.stageEl?.closest?.('.game-shell') ||
        this.uiEl ||
        this.stageEl;
      if (!host) {
        this.sceneState.overlayOpen = false;
        resolve();
        return;
      }
      host.appendChild(layer);

      const close = () => {
        layer.remove();
        // Ne pas toucher à uiModalOpen : le panneau cloze reste actif
        this.sceneState.overlayOpen = false;
        resolve();
      };
      layer.querySelector('#btn-zoom-close')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
      });
      layer.addEventListener('click', (ev) => {
        if (ev.target === layer) close();
      });
    });
  }

  /**
   * Rédaction à trous (cloze) : champs courts + choix ( = / ≠ , est / n’est pas…).
   * Même politique d’aide progressive que les exercices numériques (indices Maki).
   */
  playCloze(rawStep) {
    const step = this.normalizeClozeStep(rawStep);
    // Héritage schéma (toutes les sous-questions d’un même exercice)
    const illustrations = this.resolveClozeIllustrations(step);
    if (illustrations.length) {
      step.illustrations = illustrations;
    }
    this.uiEl.innerHTML = '';
    this.setUiBlocking(true);
    const panel = document.createElement('div');
    panel.className = 'exercise-panel cloze-panel';
    const exerciseId =
      step.id || step.exerciseId || `cloze_${this.currentScene?.id || 'x'}`;
    const progressive = Boolean(step.progressiveHelp);
    const hints = step.hints || [];
    const maxHints = Math.min(MAX_HINTS, hints.length);
    const fields = step.fields || {};
    const fieldIds = Object.keys(fields);
    let pedState = progressive
      ? getExerciseFromProgress(this.progress, exerciseId)
      : null;

    const figHtml = step.figure
      ? figureSvg(step.figure, step.figureLabels || {}) || ''
      : '';
    const illustrationsHtml = illustrations.length
      ? `<div class="cloze-illustrations">
          ${illustrations
            .map(
              (src) =>
                `<img class="cloze-illustration" src="${escapeAttr(src)}" alt="Schéma de l’exercice" />`,
            )
            .join('')}
          <div class="btn-row cloze-zoom-row">
            <button type="button" class="btn-secondary btn-touch" id="btn-zoom-schema">
              Agrandir le schéma
            </button>
          </div>
        </div>`
      : '';

    const makiPortrait = '/tresor-de-thales/assets/portraits/maki.png';
    const euclidePortrait = '/tresor-de-thales/assets/portraits/euclide.png';

    /**
     * KaTeX pour \widehat{ABC}, \(...\), $...$ dans textes élève / corrections.
     * @param {string} raw
     * @param {{ wrap?: 'p'|'span'|'none' }} [opts]
     */
    const formatInlineMathHtml = (raw, opts = {}) => {
      const wrap = opts.wrap || 'p';
      const t = this.tpl(raw ?? '');
      // Ligne purement math : fractions, égalités de rapports, ×, etc.
      const trimmed = t.trim();
      const pureMath =
        /^\$[^$]+\$\s*$/.test(trimmed) ||
        /^\\\(.+\\\)\s*$/.test(trimmed) ||
        (/\\dfrac|\\frac|\\times/.test(trimmed) &&
          !/[a-zàâäéèêëïîôùûüç]{4,}/i.test(
            trimmed.replace(/\\[a-zA-Z]+|[{}]/g, ' '),
          ));
      if (pureMath) {
        const tex = trimmed
          .replace(/^\$+|\$+$/g, '')
          .replace(/^\\\(|\\\)$/g, '');
        return `<div class="math-block" data-math="${escapeAttr(tex)}" data-display="true"></div>`;
      }
      let html = '';
      let i = 0;
      const s = String(t);
      while (i < s.length) {
        const hat = s.slice(i).match(/^\\widehat\{([A-Za-z]{1,4})\}/);
        const paren = s.slice(i).match(/^\\\((.+?)\\\)/);
        const dollar = s.slice(i).match(/^\$([^$]+)\$/);
        if (hat) {
          html += `<span class="math-inline" data-math="${escapeAttr(
            `\\widehat{${hat[1]}}`,
          )}" data-display="false"></span>`;
          i += hat[0].length;
        } else if (paren) {
          html += `<span class="math-inline" data-math="${escapeAttr(
            paren[1],
          )}" data-display="false"></span>`;
          i += paren[0].length;
        } else if (dollar) {
          html += `<span class="math-inline" data-math="${escapeAttr(
            dollar[1],
          )}" data-display="false"></span>`;
          i += dollar[0].length;
        } else {
          let j = i + 1;
          while (j < s.length) {
            if (
              s.startsWith('\\widehat{', j) ||
              s.startsWith('\\(', j) ||
              (s[j] === '$' && s.indexOf('$', j + 1) > j)
            ) {
              break;
            }
            j += 1;
          }
          html += escapeHtml(s.slice(i, j));
          i = j;
        }
      }
      if (wrap === 'none' || wrap === 'span') {
        return wrap === 'span' ? `<span>${html}</span>` : html;
      }
      return `<p>${html}</p>`;
    };

    const formatCorrectionLineHtml = (line) => formatInlineMathHtml(line);

    const fieldSizeClass = (def) => {
      const size = def.size || '';
      if (size === 'num' || size === 'short' || size === 'medium') {
        return `cloze-input--${size}`;
      }
      const kind = def.kind || 'text';
      if (kind === 'number' || kind === 'numeric') return 'cloze-input--num';
      if (kind === 'select' || kind === 'choice') return 'cloze-input--short';
      return 'cloze-input--short';
    };

    const buildFieldControl = (id, def) => {
      const kind = def.kind || 'text';
      const fieldWrap = document.createElement('span');
      fieldWrap.className = 'cloze-field';
      fieldWrap.dataset.clozeFieldWrap = id;

      if (kind === 'select' || kind === 'choice') {
        const opts = (def.options || []).map((o) => {
          if (typeof o === 'string') return { value: o, label: o };
          return {
            value: o.value != null ? String(o.value) : String(o.label || ''),
            label: o.label != null ? String(o.label) : String(o.value || ''),
          };
        });
        const wrap = document.createElement('span');
        wrap.className = 'cloze-seg';
        wrap.dataset.clozeField = id;
        for (const opt of opts) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn-secondary btn-touch cloze-seg-btn';
          b.textContent = opt.label;
          b.dataset.value = opt.value;
          b.addEventListener('click', () => {
            wrap.querySelectorAll('.cloze-seg-btn').forEach((x) => {
              x.classList.remove('selected');
            });
            b.classList.add('selected');
            wrap.dataset.value = opt.value;
            fieldWrap.classList.remove('is-error');
            panel.querySelectorAll(`[data-cloze-echo="${id}"]`).forEach((echo) => {
              echo.textContent = opt.value || '…';
            });
          });
          wrap.appendChild(b);
        }
        fieldWrap.appendChild(wrap);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = `cloze-input ${fieldSizeClass(def)}`.trim();
        input.dataset.clozeField = id;
        input.setAttribute('autocomplete', 'off');
        input.setAttribute(
          'inputmode',
          kind === 'number' || kind === 'numeric' ? 'decimal' : 'text',
        );
        input.setAttribute(
          'aria-label',
          String(def.label || id)
            .replace(/\\widehat\{([A-Za-z]+)\}/g, 'angle $1')
            .replace(/\\[()]/g, ''),
        );
        if (def.placeholder) input.placeholder = def.placeholder;
        input.addEventListener('input', () => {
          fieldWrap.classList.remove('is-error');
          panel.querySelectorAll(`[data-cloze-echo="${id}"]`).forEach((echo) => {
            echo.textContent = input.value ? input.value : '…';
          });
        });
        fieldWrap.appendChild(input);
      }

      const errMsg = document.createElement('span');
      errMsg.className = 'cloze-field-error-msg';
      errMsg.textContent = 'Erreur ici';
      fieldWrap.appendChild(errMsg);
      return fieldWrap;
    };

    const clearFieldErrors = () => {
      panel.querySelectorAll('.cloze-field.is-error').forEach((el) => {
        el.classList.remove('is-error');
      });
    };

    const markFieldErrors = (wrongIds = []) => {
      clearFieldErrors();
      for (const id of wrongIds) {
        const wrap = panel.querySelector(`[data-cloze-field-wrap="${id}"]`);
        if (wrap) wrap.classList.add('is-error');
      }
    };

    const renderLines = (host) => {
      host.innerHTML = '';
      const lines = step.lines || step.blocks || [];
      const placedInteractive = new Set();
      for (const line of lines) {
        if (!line) continue;
        if (line.type === 'heading' || line.type === 'label') {
          const h = document.createElement('p');
          h.className = 'cloze-heading';
          h.textContent = this.tpl(line.text || '');
          host.appendChild(h);
          continue;
        }
        if (line.type === 'text' && !line.parts) {
          const p = document.createElement('p');
          p.className = 'cloze-text';
          p.textContent = this.tpl(line.text || '');
          host.appendChild(p);
          continue;
        }
        const row = document.createElement('p');
        row.className = 'cloze-line';
        const parts = line.parts || [];
        if (!parts.length && line.text) {
          row.textContent = this.tpl(line.text);
          host.appendChild(row);
          continue;
        }
        const appendFieldPart = (fieldId) => {
          if (!fieldId || !fields[fieldId]) return;
          if (placedInteractive.has(fieldId)) {
            const echo = document.createElement('span');
            echo.className = 'cloze-field-echo';
            echo.dataset.clozeEcho = fieldId;
            echo.textContent = '…';
            return echo;
          }
          placedInteractive.add(fieldId);
          return buildFieldControl(fieldId, fields[fieldId]);
        };

        const appendFractionPart = (part) => {
          const frac = document.createElement('span');
          frac.className = 'cloze-frac';
          const num = document.createElement('span');
          num.className = 'cloze-frac-num';
          const bar = document.createElement('span');
          bar.className = 'cloze-frac-bar';
          bar.setAttribute('aria-hidden', 'true');
          const den = document.createElement('span');
          den.className = 'cloze-frac-den';

          // Numérateur : numParts[] composite, numField, ou texte fixe
          if (Array.isArray(part.numParts) && part.numParts.length) {
            for (const np of part.numParts) {
              if (typeof np === 'string') {
                num.appendChild(document.createTextNode(this.tpl(np)));
              } else if (np.type === 'text') {
                num.appendChild(
                  document.createTextNode(this.tpl(np.text || '')),
                );
              } else if (np.type === 'field' && np.id && fields[np.id]) {
                const el = appendFieldPart(np.id);
                if (el) num.appendChild(el);
              }
            }
          } else if (part.numField && fields[part.numField]) {
            const el = appendFieldPart(part.numField);
            if (el) num.appendChild(el);
          } else {
            num.textContent = this.tpl(part.numText || part.num || '');
          }
          // Dénominateur
          if (part.denField && fields[part.denField]) {
            const el = appendFieldPart(part.denField);
            if (el) den.appendChild(el);
          } else {
            den.textContent = this.tpl(part.denText || part.den || '');
          }
          frac.appendChild(num);
          frac.appendChild(bar);
          frac.appendChild(den);
          return frac;
        };

        for (const part of parts) {
          if (typeof part === 'string') {
            row.appendChild(document.createTextNode(this.tpl(part)));
          } else if (part.type === 'text') {
            row.appendChild(document.createTextNode(this.tpl(part.text || '')));
          } else if (part.type === 'fraction' || part.type === 'frac') {
            row.appendChild(appendFractionPart(part));
          } else if (part.type === 'field' && part.id && fields[part.id]) {
            const el = appendFieldPart(part.id);
            if (el) row.appendChild(el);
          }
        }
        host.appendChild(row);
      }
      // Champs non placés dans lines : les lister en bas
      for (const id of fieldIds) {
        if (placedInteractive.has(id)) continue;
        const row = document.createElement('p');
        row.className = 'cloze-line';
        const lab = document.createElement('span');
        lab.className = 'cloze-field-label';
        const rawLabel = `${fields[id].label || id} : `;
        if (/\\widehat\{|\\\(|\$/.test(rawLabel)) {
          lab.innerHTML = formatInlineMathHtml(rawLabel, { wrap: 'none' });
        } else {
          lab.textContent = rawLabel;
        }
        row.appendChild(lab);
        row.appendChild(buildFieldControl(id, fields[id]));
        placedInteractive.add(id);
        host.appendChild(row);
      }
    };

    const syncFieldEchos = () => {
      const answers = {};
      for (const id of fieldIds) {
        const el = panel.querySelector(`[data-cloze-field="${id}"]`);
        if (!el) {
          answers[id] = '';
          continue;
        }
        if (el.tagName === 'INPUT') answers[id] = el.value;
        else if (el.classList.contains('cloze-seg')) {
          answers[id] = el.dataset.value || '';
        } else answers[id] = el.value || '';
      }
      panel.querySelectorAll('[data-cloze-echo]').forEach((echo) => {
        const id = echo.dataset.clozeEcho;
        const v = answers[id];
        echo.textContent = v ? String(v) : '…';
      });
    };

    // formatInlineMathHtml / formatCorrectionLineHtml définis plus bas via
    // une première passe de construction : on pose d’abord le squelette,
    // puis on injecte le prompt avec math après déclaration des helpers.
    panel.innerHTML = `
      <p><strong>${escapeHtml(this.tpl(step.title || 'Rédaction'))}</strong></p>
      <div class="cloze-prompt" id="cloze-prompt-host"></div>
      ${figHtml ? `<div class="figure-box" id="cloze-figure">${figHtml}</div>` : ''}
      ${illustrationsHtml}
      <div class="cloze-body" id="cloze-body"></div>
      <div class="hint-buttons btn-row" id="hint-buttons"></div>
      <div class="hint-host"></div>
      <div class="feedback-host"></div>
      <div class="btn-row" id="ex-actions">
        <button type="button" class="btn-primary btn-touch" id="btn-ok">Valider</button>
      </div>
    `;

    // Zoom schéma : overlay non destructif (saisies conservées)
    const zoomSchemaBtn = panel.querySelector('#btn-zoom-schema');
    if (zoomSchemaBtn && illustrations[0]) {
      zoomSchemaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Ne pas valider, ne pas changer d’étape
        this.openDiagramZoom(illustrations[0], {
          alt: 'Schéma de l’exercice',
          closeLabel: 'Fermer',
        });
      });
    }

    const body = panel.querySelector('#cloze-body');
    renderLines(body);

    const feedback = panel.querySelector('.feedback-host');
    const hintHost = panel.querySelector('.hint-host');
    const hintButtons = panel.querySelector('#hint-buttons');
    const actions = panel.querySelector('#ex-actions');

    const readAnswers = () => {
      const answers = {};
      for (const id of fieldIds) {
        const el = panel.querySelector(`[data-cloze-field="${id}"]`);
        if (!el) {
          answers[id] = '';
          continue;
        }
        if (el.tagName === 'INPUT') answers[id] = el.value;
        else if (el.classList.contains('cloze-seg')) {
          answers[id] = el.dataset.value || '';
        } else answers[id] = el.value || '';
      }
      return answers;
    };

    const restoreAnswers = (raw) => {
      if (!raw) return;
      let data = raw;
      if (typeof raw === 'string') {
        try {
          data = JSON.parse(raw);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;
      for (const id of fieldIds) {
        if (data[id] == null || data[id] === '') continue;
        const el = panel.querySelector(`[data-cloze-field="${id}"]`);
        if (!el) continue;
        if (el.tagName === 'INPUT') {
          el.value = String(data[id]);
        } else if (el.classList.contains('cloze-seg')) {
          el.dataset.value = String(data[id]);
          el.querySelectorAll('.cloze-seg-btn').forEach((b) => {
            b.classList.toggle(
              'selected',
              b.dataset.value === String(data[id]),
            );
          });
        }
      }
    };

    if (pedState?.lastAnswer) restoreAnswers(pedState.lastAnswer);

    const persistPed = async () => {
      if (!progressive || !pedState) return;
      this.progress = setExerciseInProgress(
        this.progress,
        exerciseId,
        pedState,
      );
      await this.persist();
    };

    // Énoncé avec angles chapeautés (KaTeX)
    const promptHost = panel.querySelector('#cloze-prompt-host');
    if (promptHost) {
      promptHost.innerHTML = formatInlineMathHtml(step.prompt || '');
    }

    const renderEuclideCorrection = (opts = {}) => {
      if (!step.correction) return '';
      const corrLines = String(step.correction)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const corrImgs = Array.isArray(step.correctionIllustrations)
        ? step.correctionIllustrations
        : step.correctionIllustration
          ? [step.correctionIllustration]
          : [];
      return `<div class="correction-box euclide-correction">
        <div class="correction-header">
          <img class="hint-portrait" src="${escapeAttr(euclidePortrait)}" alt="Maître Euclide" />
          <p class="dialogue-speaker">Maître Euclide</p>
        </div>
        ${corrLines.map((l) => formatCorrectionLineHtml(l)).join('')}
        ${
          step.correctionMath
            ? `<div class="math-block" data-math="${escapeAttr(step.correctionMath)}" data-display="true"></div>`
            : ''
        }
        ${
          corrImgs.length
            ? `<div class="cloze-illustrations">${corrImgs
                .map(
                  (src) =>
                    `<img class="cloze-illustration" src="${escapeAttr(src)}" alt="Schéma de correction" />`,
                )
                .join('')}</div>`
            : ''
        }
        ${this.euclideNotebookBubbleHtml()}
        ${
          opts.afterFiveErrors
            ? `<p class="field-hint">Lis attentivement, puis confirme.</p>`
            : ''
        }
      </div>`;
    };

    const showMakiHint = (level) => {
      const raw = hints[level - 1];
      const bodyText = typeof raw === 'string' ? raw : raw?.text || '';
      const reaction =
        (typeof raw === 'object' && raw?.reaction) || 'Krii !';
      return `<div class="hint-box maki-hint">
        <img class="hint-portrait" src="${escapeAttr(makiPortrait)}" alt="Maki" />
        <div class="hint-body">
          <p class="dialogue-speaker">Maki · indice ${level}</p>
          <p><em>${escapeHtml(reaction)}</em> ${escapeHtml(this.tpl(bodyText))}</p>
        </div>
      </div>`;
    };

    const refreshHintButtons = () => {
      if (!progressive || maxHints === 0) {
        hintButtons.innerHTML = '';
        return;
      }
      hintButtons.innerHTML = '';
      for (let lvl = 1; lvl <= maxHints; lvl += 1) {
        const unlocked = isHintAvailable(pedState, lvl);
        const used = pedState.hintsUsed.includes(lvl);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-secondary btn-touch hint-lock-btn';
        if (!unlocked) {
          b.disabled = true;
          b.textContent = `Indice ${lvl} (verrouillé)`;
        } else if (used) {
          b.textContent = `Indice ${lvl} (relu)`;
        } else {
          b.textContent = `Indice ${lvl} — Maki`;
        }
        b.addEventListener('click', async () => {
          if (!isHintAvailable(pedState, lvl)) return;
          const res = useHint(pedState, lvl);
          pedState = res.state;
          await persistPed();
          if (!res.ok) return;
          hintHost.innerHTML = showMakiHint(lvl);
          await this.noteMakiHintDisplayed(exerciseId, lvl);
          refreshHintButtons();
        });
        hintButtons.appendChild(b);
      }
    };

    const lockControls = () => {
      panel.querySelectorAll('input, button.cloze-seg-btn').forEach((el) => {
        el.disabled = true;
      });
      const ok = panel.querySelector('#btn-ok');
      if (ok) ok.disabled = true;
    };

    const finishSuccess = async () => {
      lockControls();
      let okHtml = `<div class="feedback ok">${escapeHtml(
        this.tpl(step.success || 'Rédaction correcte !'),
      )}</div>`;
      if (step.correction) okHtml += renderEuclideCorrection();
      feedback.innerHTML = okHtml;
      renderMathInContainer(feedback);
      actions.innerHTML = '';
      const cont = document.createElement('button');
      cont.type = 'button';
      cont.className = 'btn-primary btn-touch';
      cont.textContent = 'Continuer';
      cont.addEventListener('click', () => {
        this.setUiBlocking(false);
        this.finishStep(step);
      });
      actions.appendChild(cont);
    };

    const finishAfterCorrection = () => {
      lockControls();
      actions.innerHTML = '';
      const cont = document.createElement('button');
      cont.type = 'button';
      cont.className = 'btn-primary btn-touch';
      cont.textContent = 'J’ai compris';
      cont.addEventListener('click', () => {
        this.setUiBlocking(false);
        this.finishStep(step);
      });
      actions.appendChild(cont);
    };

    if (progressive && pedState?.succeeded) {
      finishSuccess();
      refreshHintButtons();
      this.uiEl.appendChild(panel);
      renderMathInContainer(panel);
      return;
    }
    if (progressive && pedState?.correctionUnlocked && !pedState?.succeeded) {
      feedback.innerHTML = `${renderEuclideCorrection({ afterFiveErrors: true })}`;
      renderMathInContainer(feedback);
      finishAfterCorrection();
      refreshHintButtons();
      this.uiEl.appendChild(panel);
      return;
    }

    panel.querySelector('#btn-ok').addEventListener('click', async () => {
      const answers = readAnswers();
      const check = checkClozeAnswers(answers, fields, {
        unorderedNumericFields: step.unorderedNumericFields,
        unorderedNumericExpected: step.unorderedNumericExpected,
        coherentNumericGroups: step.coherentNumericGroups,
      });
      if (progressive) {
        pedState = registerAttempt(pedState, check.ok);
        pedState.lastAnswer = JSON.stringify(answers);
        await persistPed();
        await this.onAnswer({
          exerciseId,
          rawAnswer: JSON.stringify(answers),
          isCorrect: check.ok,
        });
        if (check.ok) {
          clearFieldErrors();
          await finishSuccess();
          refreshHintButtons();
          return;
        }
        // Signaler précisément chaque champ faux (sans révéler la solution)
        markFieldErrors(check.wrongIds || []);
        // Message Maki dédié (ex. rapports dans des sens différents)
        const mixedMsg = Object.values(check.results || {})
          .map((r) => r?.reason)
          .find(
            (reason) =>
              typeof reason === 'string' &&
              /changé de sens|meme sens|même sens/i.test(reason),
          );
        let ko = `<div class="feedback ko">${escapeHtml(
          mixedMsg || neutralErrorMessage(pedState.wrongAttempts),
        )}</div>`;
        if (pedState.correctionUnlocked && step.correction) {
          ko += renderEuclideCorrection({ afterFiveErrors: true });
          feedback.innerHTML = ko;
          renderMathInContainer(feedback);
          finishAfterCorrection();
          refreshHintButtons();
          return;
        }
        feedback.innerHTML = ko;
        refreshHintButtons();
        return;
      }
      // Non progressif : simple validation
      await this.onAnswer({
        exerciseId,
        rawAnswer: JSON.stringify(answers),
        isCorrect: check.ok,
      });
      if (check.ok) {
        clearFieldErrors();
        await finishSuccess();
      } else {
        markFieldErrors(check.wrongIds || []);
        feedback.innerHTML = `<div class="feedback ko">${escapeHtml(
          'Ce n’est pas encore exact. Relis la méthode puis réessaie.',
        )}</div>`;
      }
    });

    refreshHintButtons();
    this.uiEl.appendChild(panel);
    renderMathInContainer(panel);
  }

  /**
   * Pause cahier multipages : Précédent / Suivant,
   * « J’ai terminé de recopier » uniquement sur la dernière page.
   */
  async playNotebook(step) {
    this.setUiBlocking(true);
    const pages =
      step.pages && step.pages.length
        ? step.pages
        : [
            {
              title: step.title || 'Pause cahier',
              blocks: step.blocks || [],
              figure: step.figure,
              figureLabels: step.figureLabels,
            },
          ];

    let pageIndex = 0;

    const render = () => {
      this.uiEl.innerHTML = '';
      const page = pages[pageIndex];
      const isLast = pageIndex === pages.length - 1;
      const panel = document.createElement('div');
      panel.className = 'notebook-panel';
      // Schéma codé (figure SVG moteur) ou image générique (figureImage / diagramImage / illustration)
      const pageImage =
        page.figureImage ||
        page.diagramImage ||
        page.illustration ||
        page.image ||
        null;
      const hasFigure = Boolean(page.figure || pageImage);

      panel.innerHTML = `
        <div class="notebook-header">
          <h2>${escapeHtml(this.tpl(page.title || step.title || 'Pause cahier'))}</h2>
          <span class="notebook-page-ind">${pageIndex + 1} / ${pages.length}</span>
        </div>
        <div class="notebook-body"></div>
        <div class="figure-box ${hasFigure ? '' : 'hidden'}" id="nb-figure"></div>
        <div class="notebook-nav btn-row">
          <button type="button" class="btn-secondary btn-touch" id="btn-prev" ${pageIndex === 0 ? 'disabled' : ''}>Précédent</button>
          ${
            hasFigure
              ? `<button type="button" class="btn-secondary btn-touch" id="btn-zoom">Agrandir la figure</button>`
              : ''
          }
          ${
            !isLast
              ? `<button type="button" class="btn-primary btn-touch" id="btn-next">Suivant</button>`
              : `<button type="button" class="btn-primary btn-touch" id="btn-copied">J’ai terminé de recopier</button>`
          }
        </div>
        <div class="verify-host"></div>
      `;

      const body = panel.querySelector('.notebook-body');
      for (const block of page.blocks || []) {
        if (block.type === 'text') {
          const p = document.createElement('p');
          p.textContent = this.tpl(block.text);
          body.appendChild(p);
        } else if (block.type === 'math') {
          const div = document.createElement('div');
          div.className = 'math-block';
          body.appendChild(div);
          renderMath(div, block.tex || '', true);
        } else if (
          block.type === 'image' ||
          block.type === 'diagram' ||
          block.src ||
          block.figureImage
        ) {
          const img = document.createElement('img');
          img.className = 'notebook-diagram';
          img.src = block.src || block.figureImage || block.diagramImage || '';
          img.alt = block.alt || 'Schéma du carnet';
          body.appendChild(img);
        }
      }

      const fig = panel.querySelector('#nb-figure');
      if (page.figure) {
        const svg =
          figureSvg(page.figure, page.figureLabels || {}) ||
          (page.figure === 'rightTriangle'
            ? rightTriangleSvg(page.figureLabels || {})
            : '');
        if (svg) {
          fig.innerHTML = svg;
          fig.classList.remove('hidden');
        } else {
          fig.classList.add('hidden');
        }
      } else if (pageImage) {
        fig.innerHTML = `<img class="notebook-diagram" src="${escapeAttr(pageImage)}" alt="${escapeAttr(page.figureAlt || page.diagramAlt || 'Schéma de la leçon')}" />`;
        fig.classList.remove('hidden');
      } else {
        fig.classList.add('hidden');
      }

      let enlarged = false;
      const zoomBtn = panel.querySelector('#btn-zoom');
      if (zoomBtn) {
        zoomBtn.addEventListener('click', () => {
          enlarged = !enlarged;
          fig.classList.toggle('enlarged', enlarged);
          zoomBtn.textContent = enlarged ? 'Réduire la figure' : 'Agrandir la figure';
        });
      }

      panel.querySelector('#btn-prev')?.addEventListener('click', () => {
        if (pageIndex > 0) {
          pageIndex -= 1;
          render();
        }
      });
      panel.querySelector('#btn-next')?.addEventListener('click', () => {
        if (pageIndex < pages.length - 1) {
          pageIndex += 1;
          render();
        }
      });
      panel.querySelector('#btn-copied')?.addEventListener('click', async () => {
        if (step.verify && step.verify.length) {
          panel.querySelector('.notebook-nav').classList.add('hidden');
          await this.playNotebookVerify(step, panel.querySelector('.verify-host'));
        } else {
          this.setUiBlocking(false);
          await this.finishStep(step);
        }
      });

      this.uiEl.appendChild(panel);
    };

    render();
  }

  async playNotebookVerify(step, host) {
    host.innerHTML = '';
    let qi = 0;
    const questions = step.verify;

    const showQ = () => {
      host.innerHTML = '';
      if (qi >= questions.length) {
        this.finishStep(step);
        return;
      }
      const q = questions[qi];
      const box = document.createElement('div');
      box.innerHTML = `
        <p><strong>Vérification</strong> — ${escapeHtml(this.tpl(q.question))}</p>
        <div class="quiz-options"></div>
        <div class="feedback-host"></div>
      `;
      const opts = box.querySelector('.quiz-options');
      const feedback = box.querySelector('.feedback-host');
      (q.options || []).forEach((opt) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-choice btn-touch';
        b.textContent = this.tpl(opt.text);
        b.addEventListener('click', () => {
          if (opt.correct) {
            feedback.innerHTML = `<div class="feedback ok">Oui !</div>`;
            setTimeout(() => {
              qi += 1;
              showQ();
            }, 350);
          } else {
            feedback.innerHTML = `<div class="feedback ko">${escapeHtml(
              this.tpl(opt.explanation || 'Relis la leçon dans ton cahier.'),
            )}</div>`;
          }
        });
        opts.appendChild(b);
      });
      host.appendChild(box);
    };
    showQ();
  }

  async finishStep(step = {}) {
    // endPart / nextSceneId ne doivent s'exécuter qu'une fois (idempotent)
    if (step.endPart) {
      const partId = this.content.meta?.partId || 'prologue';
      if ((this.progress.completedParts || []).includes(partId)) {
        this.setUiBlocking(false);
        this.uiEl.innerHTML = '';
        this.showPrompt(
          this.tpl(this.currentScene?.prompt || 'Explorez le décor.'),
        );
        this.completeStepPromise();
        return;
      }
    }

    if (step.setVisualStage) {
      await this.applyVisualStage(step.setVisualStage);
    }
    if (step.decorPatch?.background) {
      const bg = this.stageEl.querySelector('.scene-bg');
      if (bg) bg.style.backgroundImage = `url('${step.decorPatch.background}')`;
    }
    if (step.setFlags) {
      Object.assign(this.sceneState.flags, step.setFlags);
      // Réafficher les hotspots conditionnels (ex. fragment carte 2)
      this.renderHotspotsOnly();
    }

    this.progress = {
      ...this.progress,
      flags: { ...(this.progress.flags || {}), ...this.sceneState.flags },
    };

    // Enchaînement dans la même scène
    if (step.nextStepId) {
      await this.persist();
      const next = (this.currentScene.steps || []).find((s) => s.id === step.nextStepId);
      if (next) {
        await this.runStep(next);
        return;
      }
    }

    if (step.endPart) {
      await this.completeCurrentScene();
      await this.endPart(step);
      this.completeStepPromise();
      return;
    }

    if (step.nextSceneId) {
      await this.completeCurrentScene(step.nextSceneId);
      await this.goto(step.nextSceneId);
      this.completeStepPromise();
      return;
    }

    if (step.completeScene === false || step._holdAdvance) {
      await this.persist();
      this.uiEl.innerHTML = '';
      if (!step._holdAdvance) {
        // Après setVisualStage silas (fragment) : ne pas endPart
        if (this.getActiveVisualStage() === 'silas') {
          await this.enterSilasStage();
        } else {
          const advanced = await this.tryAdvanceIfAllRequired();
          if (!advanced) {
            this.showPrompt(
              this.tpl(this.currentScene.prompt || 'Continuez d’explorer.'),
            );
          }
        }
      }
      this.completeStepPromise();
      return;
    }

    // setVisualStage silas sans completeScene false (sécurité anti-endPart)
    if (step.setVisualStage === 'silas' && !step.endPart) {
      await this.persist();
      this.uiEl.innerHTML = '';
      await this.enterSilasStage();
      this.completeStepPromise();
      return;
    }

    const nextScene =
      step.next ||
      this.currentScene.next ||
      nextInOrder(this.content, this.currentScene.id);

    if (nextScene) {
      await this.completeCurrentScene(nextScene);
      await this.goto(nextScene);
      this.completeStepPromise();
    } else if (step.endPart) {
      await this.completeCurrentScene();
      await this.endPart(step);
      this.completeStepPromise();
    } else {
      // Ne plus appeler endPart automatiquement en fin de scène sans endPart
      await this.persist();
      this.uiEl.innerHTML = '';
      if (this.getActiveVisualStage() === 'silas') {
        await this.enterSilasStage();
      } else {
        this.showPrompt(
          this.tpl(this.currentScene.prompt || 'Continuez d’explorer.'),
        );
      }
      this.completeStepPromise();
    }
  }

  async completeCurrentScene(nextSceneId = null) {
    const completed = new Set(this.progress.completedScenes || []);
    completed.add(this.currentScene.id);
    this.progress = {
      ...this.progress,
      completedScenes: [...completed],
      currentSceneId: nextSceneId || this.currentScene.id,
      flags: { ...(this.progress.flags || {}), ...this.sceneState.flags },
    };
    await this.persist();
  }

  async goto(sceneId) {
    this.uiEl.innerHTML = '';
    await this.loadScene(sceneId);
  }

  async endPart(step = {}) {
    const partId = this.content.meta?.partId || 'prologue';
    // Idempotent : completePart une seule fois
    const alreadyDone = (this.progress.completedParts || []).includes(partId);
    if (!alreadyDone) {
      this.progress = completePart(this.progress, partId);
      await this.persist();
    }

    this.setUiBlocking(false);
    this.uiEl.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'dialogue-panel end-panel';
    const message = this.tpl(
      step.message ||
        this.content.meta?.endMessage ||
        'Fin de la partie.',
    );
    const announce = this.tpl(
      step.announce || this.content.meta?.announceNext || '',
    );
    const nextPart = step.nextPartId || this.content.meta?.nextPartId || null;
    const nextTitle =
      step.nextPartTitle ||
      this.content.meta?.announceNext ||
      'Partie suivante';

    let actionsHtml = '';
    if (partId === 'part1' || nextPart === 'part2') {
      actionsHtml = `
        <div class="part-transition-card">
          <h2 class="part-transition-title">Partie 2 — La réciproque du théorème de Pythagore</h2>
          <button type="button" class="btn-primary btn-touch" id="btn-go-part2">
            Continuer vers la partie 2
          </button>
        </div>`;
    } else if (partId === 'part2' || nextPart === 'part3') {
      actionsHtml = `
        <div class="part-transition-card">
          <h2 class="part-transition-title">Partie 3 — Triangles semblables</h2>
          <button type="button" class="btn-primary btn-touch" id="btn-go-part3">
            Continuer vers la partie 3
          </button>
        </div>`;
    } else if (partId === 'part3' || nextPart === 'part4') {
      actionsHtml = `
        <div class="part-transition-card">
          <h2 class="part-transition-title">Partie 4 — Théorème de Thalès : configuration emboîtée</h2>
          <button type="button" class="btn-primary btn-touch" id="btn-go-part4">
            Continuer vers la partie 4
          </button>
        </div>`;
    } else if (partId === 'part4' || nextPart === 'part5') {
      actionsHtml = `
        <div class="part-transition-card">
          <h2 class="part-transition-title">Partie 5 — Thalès : configuration papillon</h2>
          <button type="button" class="btn-primary btn-touch" id="btn-go-part5">
            Continuer vers la partie 5
          </button>
        </div>`;
    } else if (partId === 'part5' || nextPart === 'part6') {
      actionsHtml = `
        <div class="part-transition-card">
          <h2 class="part-transition-title">Partie 6 — Réciproque du théorème de Thalès</h2>
          <button type="button" class="btn-primary btn-touch" id="btn-go-part6">
            Continuer vers la partie 6
          </button>
        </div>`;
    } else if (partId === 'part6' || nextPart === 'part7') {
      actionsHtml = `
        <div class="part-transition-card">
          <h2 class="part-transition-title">Partie 7 — Bilan final</h2>
          <button type="button" class="btn-primary btn-touch" id="btn-go-part7">
            Continuer vers la partie 7
          </button>
        </div>`;
    } else if (partId === 'part7') {
      actionsHtml = `
        <div class="part-transition-card">
          <h2 class="part-transition-title">Le trésor de Thalès</h2>
          <button type="button" class="btn-primary btn-touch" id="btn-finish-adventure">
            Terminer l’aventure
          </button>
        </div>`;
    }

    panel.innerHTML = `
      <div class="dialogue-body" style="padding:0.5rem">
        <p class="dialogue-speaker">Navigation</p>
        <p class="dialogue-text">${escapeHtml(message)}</p>
        ${announce ? `<p class="dialogue-text"><em>${escapeHtml(announce)}</em></p>` : ''}
        ${actionsHtml}
      </div>
    `;
    this.uiEl.appendChild(panel);

    const goBtn =
      panel.querySelector('#btn-go-part2') ||
      panel.querySelector('#btn-go-part3') ||
      panel.querySelector('#btn-go-part4') ||
      panel.querySelector('#btn-go-part5') ||
      panel.querySelector('#btn-go-part6') ||
      panel.querySelector('#btn-go-part7');
    const finishBtn = panel.querySelector('#btn-finish-adventure');
    if (goBtn) {
      goBtn.addEventListener('click', () => {
        // Progression déjà marquée ; le chargeur ouvre la suite ou l’attente
        this.onPartEnd({
          partId,
          progress: this.progress,
          step,
          goToNextPart: true,
          nextPartId: nextPart || null,
        });
      });
    } else if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        this.onPartEnd({
          partId,
          progress: this.progress,
          step,
          goToNextPart: false,
          gameCompleted: true,
        });
        // Retour accueil (fin de l’aventure)
        try {
          window.location.href = '/tresor-de-thales';
        } catch {
          /* ignore */
        }
      });
    } else {
      this.onPartEnd({ partId, progress: this.progress, step });
    }
  }

  /**
   * Enregistre un indice Maki réellement affiché (pas seulement débloqué).
   * Met à jour progress.indicesConsultes (uniques) puis persiste si nouveau.
   * Appelle aussi onHint (journal serveur) à chaque affichage.
   *
   * @param {string} exerciseId
   * @param {number} hintLevel
   */
  async noteMakiHintDisplayed(exerciseId, hintLevel) {
    const lvl = Number(hintLevel);
    const id = makeHintConsultId(exerciseId, lvl);
    const result = recordHintConsulted(this.progress, {
      id,
      exerciseId,
      hintLevel: lvl,
      sceneId: this.currentScene?.id || null,
      partId:
        this.progress.currentPartId ||
        this.content?.meta?.partId ||
        null,
      label: 'Indice de Maki',
    });
    this.progress = result.progress;
    if (result.changed) {
      await this.persist();
    }
    await this.onHint({ exerciseId, hintLevel: lvl });
  }

  async persist() {
    await this.onProgress(this.progress);
  }
}

function nextInOrder(content, currentId) {
  const order =
    content.meta?.sceneOrder || content.scenes?.map((s) => s.id) || [];
  const i = order.indexOf(currentId);
  if (i === -1 || i >= order.length - 1) return null;
  return order[i + 1];
}

function defaultSeaDecor(sky, label) {
  return `
<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sky}"/>
      <stop offset="100%" stop-color="#0f2833"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#sky)"/>
  <ellipse cx="650" cy="80" rx="40" ry="40" fill="#f0e6c8" opacity="0.85"/>
  <path d="M0 300 Q200 260 400 300 T800 300 V450 H0 Z" fill="#1a5f7a"/>
  <path d="M0 330 Q200 300 400 335 T800 330 V450 H0 Z" fill="#0f3d4f" opacity="0.7"/>
  <text x="400" y="40" text-anchor="middle" fill="#f4e9d8" font-size="22" font-family="Segoe UI, sans-serif">${escapeXml(label)}</text>
</svg>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, '&#96;');
}

function escapeXml(s) {
  return escapeHtml(s);
}
