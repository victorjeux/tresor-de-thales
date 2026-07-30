import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getSilasDiscoveries,
  markSilasDiscoveryComplete,
  allSilasDiscoveriesCompleted,
  silasDiscoveryPrompt,
  migrateSilasDiscoveries,
  silasDiscoveryOrders,
  SILAS_HOTSPOT_IDS,
  countSilasDiscoveriesCompleted,
} from '../shared/silasDiscoveries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const content = JSON.parse(
  fs.readFileSync(path.join(root, 'client/content/part1/scenes.json'), 'utf8'),
);
const engineSrc = fs.readFileSync(
  path.join(root, 'client/js/engine/SceneEngine.js'),
  'utf8',
);
const fin = content.scenes.find((s) => s.id === 'p1_7_finale');

describe('silas — trois découvertes + dialogue final', () => {
  it('arrivée silas : pas d’endPart sur les 3 hotspots', () => {
    for (const id of SILAS_HOTSPOT_IDS) {
      const h = fin.hotspots.find((x) => x.id === id);
      assert.ok(h, id);
      assert.ok(h.silasDiscovery || h.lines?.length, id);
      assert.ok(!JSON.stringify(h).includes('"endPart": true'), id);
    }
  });

  it('dialogue final stocké sur la scène avec endPart', () => {
    assert.ok(fin.silasFinalDialogue?.endPart);
    assert.ok(fin.silasFinalDialogue.lines.length >= 1);
  });

  it('fragment last step : completeScene false (anti endPart auto)', () => {
    const frag = fin.hotspots.find((h) => h.id === 'fragment_1');
    const last = frag.sequence[frag.sequence.length - 1];
    assert.equal(last.setVisualStage, 'silas');
    assert.equal(last.completeScene, false);
    assert.ok(!last.endPart);
  });

  it('clic sans fermeture ne valide rien (mark seulement à la fin)', () => {
    const p0 = {};
    assert.equal(countSilasDiscoveriesCompleted(p0), 0);
    // mark n’est appelé qu’à la fermeture — simuler
    assert.equal(allSilasDiscoveriesCompleted(p0), false);
  });

  it('validation après fermeture complète seulement', () => {
    let p = {};
    const r = markSilasDiscoveryComplete(p, 'opt_empreintes_p7');
    assert.equal(r.changed, true);
    assert.equal(r.discoveries.footprintsCompleted, true);
    assert.equal(allSilasDiscoveriesCompleted(r.progress), false);
  });

  it('six ordres possibles des trois interactions', () => {
    const orders = silasDiscoveryOrders();
    assert.equal(orders.length, 6);
    for (const order of orders) {
      let p = {};
      for (const id of order) {
        p = markSilasDiscoveryComplete(p, id).progress;
      }
      assert.equal(allSilasDiscoveriesCompleted(p), true, order.join('→'));
    }
  });

  it('prompts : 0 → 3 indices, 1 → deux restent, 2 → un reste', () => {
    assert.match(silasDiscoveryPrompt({}), /trois/i);
    let p = markSilasDiscoveryComplete({}, 'opt_empreintes_p7').progress;
    assert.match(silasDiscoveryPrompt(p), /Deux/i);
    p = markSilasDiscoveryComplete(p, 'silas_passage').progress;
    assert.match(silasDiscoveryPrompt(p), /encore un/i);
    p = markSilasDiscoveryComplete(p, 'silas_traces').progress;
    assert.equal(silasDiscoveryPrompt(p), null);
  });

  it('moteur : openSilasFinalDialogue / onSilasDiscoveryDialogueClosed', () => {
    assert.match(engineSrc, /openSilasFinalDialogue/);
    assert.match(engineSrc, /onSilasDiscoveryDialogueClosed/);
    assert.match(engineSrc, /playSilasDiscovery/);
    assert.match(engineSrc, /_silasDiscoveryId/);
    assert.match(engineSrc, /enterSilasStage/);
    // Plus d’endPart auto en fin de scène sans flag
    assert.match(engineSrc, /Ne plus appeler endPart automatiquement/);
  });

  it('silas_passage ne porte plus endPart', () => {
    const pass = fin.hotspots.find((h) => h.id === 'silas_passage');
    assert.ok(pass.lines?.length);
    assert.ok(!pass.sequence);
    assert.ok(!JSON.stringify(pass).includes('endPart'));
  });

  it('endPart uniquement via silasFinalDialogue', () => {
    assert.equal(fin.silasFinalDialogue.endPart, true);
    for (const h of fin.hotspots.filter((x) =>
      (x.stages || []).includes('silas'),
    )) {
      assert.ok(!JSON.stringify(h).includes('"endPart": true'), h.id);
    }
  });

  it('F5 : 0/1/2/3 découvertes', () => {
    assert.equal(countSilasDiscoveriesCompleted({}), 0);
    let p = markSilasDiscoveryComplete({}, 'silas_traces').progress;
    assert.equal(countSilasDiscoveriesCompleted(p), 1);
    p = markSilasDiscoveryComplete(p, 'opt_empreintes_p7').progress;
    assert.equal(countSilasDiscoveriesCompleted(p), 2);
    p = markSilasDiscoveryComplete(p, 'silas_passage').progress;
    assert.equal(countSilasDiscoveriesCompleted(p), 3);
    assert.equal(allSilasDiscoveriesCompleted(p), true);
  });

  it('migration profil bloqué : silasClues retiré, discoveries à false, pas de final auto', () => {
    const { progress: p, migrated } = migrateSilasDiscoveries({
      currentSceneId: 'p1_7_finale',
      visualStages: { p1_7_finale: 'silas' },
      completedParts: ['prologue'],
      silasClues: { footprintsViewed: true, tracesViewed: true },
      silasDiscoveries: {
        footprintsCompleted: true,
        passageCompleted: true,
        tracesCompleted: true,
        completionDialogShown: true,
      },
    });
    assert.equal(migrated, true);
    assert.ok(!p.silasClues);
    assert.equal(p.silasDiscoveries.completionDialogShown, false);
    assert.equal(p.silasDiscoveries.footprintsCompleted, false);
    assert.equal(p.silasDiscoveries.passageCompleted, false);
    assert.equal(p.silasDiscoveries.tracesCompleted, false);
  });

  it('migration n’efface pas un profil part1 réellement terminé', () => {
    const { progress: p, migrated } = migrateSilasDiscoveries({
      completedParts: ['prologue', 'part1'],
      currentPartId: 'part2',
      silasDiscoveries: {
        footprintsCompleted: true,
        passageCompleted: true,
        tracesCompleted: true,
        completionDialogShown: true,
      },
    });
    assert.equal(migrated, false);
    assert.equal(p.silasDiscoveries.completionDialogShown, true);
  });

  it('idempotence mark : pas de double comptage', () => {
    let p = markSilasDiscoveryComplete({}, 'opt_empreintes_p7').progress;
    const r2 = markSilasDiscoveryComplete(p, 'opt_empreintes_p7');
    assert.equal(r2.changed, false);
    assert.equal(countSilasDiscoveriesCompleted(r2.progress), 1);
  });
});
