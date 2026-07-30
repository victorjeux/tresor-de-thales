import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getPhaseProgress,
  resolvePhaseClick,
  afterPhaseClosed,
  repairPhasedHotspotState,
} from '../shared/hotspotPhases.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const prologue = JSON.parse(
  fs.readFileSync(
    path.join(root, 'client', 'content', 'prologue', 'scenes.json'),
    'utf8',
  ),
);
const engineSrc = fs.readFileSync(
  path.join(root, 'client', 'js', 'engine', 'SceneEngine.js'),
  'utf8',
);

const lettreScene = prologue.scenes.find((s) => s.id === 'p4_lettre');
const lettreHotspot = lettreScene.hotspots.find((h) => h.id === 'lettre');
const TOTAL = lettreHotspot.phases.length;

describe('lettre de Thalès — multi-phases (régression bloquante)', () => {
  it('la lettre a plusieurs phases et un nextSceneId', () => {
    assert.ok(TOTAL >= 2);
    assert.equal(lettreHotspot.nextSceneId, 'p5_serment');
    assert.equal(lettreHotspot.required, true);
  });

  it('chargement sans modale : clic accepté (phase 0 play, isUiBlocking false)', () => {
    // isUiBlocking false au chargement ⇒ resolvePhaseClick play
    const action = resolvePhaseClick({
      phaseIndex: 0,
      completed: false,
      totalPhases: TOTAL,
    });
    assert.equal(action.kind, 'play');
    assert.equal(action.phaseIndex, 0);
    assert.equal(action.isLast, false);
    // Moteur : pas de bloqueur au load
    assert.match(engineSrc, /setUiBlocking\(false\)/);
    assert.match(engineSrc, /handlePhasedHotspot/);
  });

  it('ouverture puis fermeture d’une partie → hotspot encore actif (phase suivante)', () => {
    const after0 = afterPhaseClosed({ phaseIndex: 0, totalPhases: TOTAL });
    assert.equal(after0.completed, false);
    assert.equal(after0.phaseIndex, 1);
    const nextClick = resolvePhaseClick({
      phaseIndex: after0.phaseIndex,
      completed: after0.completed,
      totalPhases: TOTAL,
    });
    assert.equal(nextClick.kind, 'play');
    assert.equal(nextClick.phaseIndex, 1);
  });

  it('lecture complète de toutes les parties → progression possible', () => {
    let idx = 0;
    let completed = false;
    for (let i = 0; i < TOTAL; i += 1) {
      const action = resolvePhaseClick({
        phaseIndex: idx,
        completed,
        totalPhases: TOTAL,
      });
      assert.equal(action.kind, 'play', `phase ${i}`);
      assert.equal(action.phaseIndex, i);
      assert.equal(action.isLast, i === TOTAL - 1);
      const after = afterPhaseClosed({
        phaseIndex: action.phaseIndex,
        totalPhases: TOTAL,
      });
      idx = after.phaseIndex;
      completed = after.completed;
    }
    assert.equal(completed, true);
    assert.equal(idx, TOTAL);
    // Rejeu : plus de progression
    const replay = resolvePhaseClick({
      phaseIndex: idx,
      completed,
      totalPhases: TOTAL,
    });
    assert.equal(replay.kind, 'replay');
  });

  it('sauvegarde partielle puis rechargement → reprise à l’étape courante', () => {
    // Après 2 parties lues, phaseIndex = 2
    const saved = {
      interacted: [],
      phaseIndex: { lettre: 2 },
      phaseCompleted: [],
    };
    const { phaseIndex, completed } = getPhaseProgress(saved, 'lettre');
    assert.equal(phaseIndex, 2);
    assert.equal(completed, false);
    const action = resolvePhaseClick({
      phaseIndex,
      completed,
      totalPhases: TOTAL,
    });
    assert.equal(action.kind, 'play');
    assert.equal(action.phaseIndex, 2);
  });

  it('ancienne sauvegarde bugguée (interacted trop tôt) est réparée', () => {
    // Régression : 1er clic a marqué interacted sans terminer les phases
    const broken = {
      interacted: ['lettre'],
      phaseIndex: { lettre: 0 },
      phaseCompleted: [],
    };
    const fixed = repairPhasedHotspotState(broken, lettreHotspot, {
      sceneCompleted: false,
    });
    assert.ok(!fixed.interacted.includes('lettre'));
    assert.equal(fixed.phaseIndex.lettre, 0);
    const action = resolvePhaseClick({
      phaseIndex: fixed.phaseIndex.lettre,
      completed: fixed.phaseCompleted.includes('lettre'),
      totalPhases: TOTAL,
    });
    assert.equal(action.kind, 'play');
    assert.equal(action.phaseIndex, 0);
  });

  it('ancienne sauvegarde bugguée avec phaseIndex partiel reprend correctement', () => {
    const broken = {
      interacted: ['lettre'],
      phaseIndex: { lettre: 2 },
      phaseCompleted: [],
    };
    const fixed = repairPhasedHotspotState(broken, lettreHotspot, {
      sceneCompleted: false,
    });
    assert.ok(!fixed.interacted.includes('lettre'));
    assert.equal(fixed.phaseIndex.lettre, 2);
    const action = resolvePhaseClick({
      phaseIndex: 2,
      completed: false,
      totalPhases: TOTAL,
    });
    assert.equal(action.kind, 'play');
    assert.equal(action.phaseIndex, 2);
  });

  it('scène déjà complétée : rejeu seulement, pas de re-progression', () => {
    const done = repairPhasedHotspotState(
      { interacted: ['lettre'], phaseIndex: {}, phaseCompleted: [] },
      lettreHotspot,
      { sceneCompleted: true },
    );
    assert.ok(done.phaseCompleted.includes('lettre'));
    assert.ok(done.interacted.includes('lettre'));
    const action = resolvePhaseClick({
      phaseIndex: done.phaseIndex.lettre,
      completed: true,
      totalPhases: TOTAL,
    });
    assert.equal(action.kind, 'replay');
  });
});

describe('ui-blocker — état libre', () => {
  it('le moteur libère le bloqueur au chargement et après phase intermédiaire', () => {
    assert.match(engineSrc, /Garantit qu’aucun bloqueur fantôme/);
    assert.match(engineSrc, /hasVisibleModal/);
    assert.match(engineSrc, /querySelectorAll\('\.ui-blocker'\)/);
    // Phase intermédiaire : setUiBlocking(false) avant showPrompt recliquable
    assert.match(engineSrc, /Phase intermédiaire : libère l’UI/);
  });

  it('isUiBlocking ne dépend que des flags modale/overlay', () => {
    assert.match(
      engineSrc,
      /return Boolean\(this\.sceneState\?\.uiModalOpen \|\| this\.sceneState\?\.overlayOpen\)/,
    );
  });
});

describe('non-régression hotspots rejouables part1', () => {
  it('SceneEngine conserve replayHotspot et advancesStory false pour optionnels', () => {
    assert.match(engineSrc, /async replayHotspot\(hotspot\)/);
    assert.match(engineSrc, /isSequencePedagogicallyDone/);
    const part1 = JSON.parse(
      fs.readFileSync(
        path.join(root, 'client', 'content', 'part1', 'scenes.json'),
        'utf8',
      ),
    );
    for (const s of part1.scenes) {
      const opts = (s.hotspots || []).filter((h) => h.optional);
      assert.ok(opts.length >= 1, s.id);
      assert.ok(opts.every((h) => h.advancesStory === false));
    }
  });
});
