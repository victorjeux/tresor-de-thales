import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolvePartToPlay,
  AVAILABLE_PART_IDS,
} from '../shared/partLoader.js';
import {
  completePart,
  initialProgress,
  canOpenPart,
} from '../shared/progression.js';
import { buildTestProgressPart6 } from '../shared/testPartBoot.js';
import { checkClozeAnswers } from '../shared/clozeAnswer.js';
import {
  P6_BALISE_EXERCISE_IDS,
  P6_BALISE_SCENE_ID,
  P6_AFTER_BALISE_SCENE_ID,
  P6_FRAGMENT_SCENE_ID,
  getNextQueueExerciseId,
  isQueueComplete,
  simulateQueueOpenings,
  permutations,
} from '../shared/trainingQueue.js';
import { setExerciseInProgress, initialExerciseState } from '../shared/exerciseHelp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const part6Path = path.join(root, 'client', 'content', 'part6', 'scenes.json');

function readContent() {
  return JSON.parse(fs.readFileSync(part6Path, 'utf8'));
}

function walkSteps(content) {
  const steps = [];
  for (const scene of content.scenes || []) {
    if (scene.steps) steps.push(...scene.steps);
    for (const h of scene.hotspots || []) {
      if (h.sequence) steps.push(...h.sequence);
    }
    if (scene.exerciseQueue?.exercises) {
      steps.push(...Object.values(scene.exerciseQueue.exercises));
    }
  }
  return steps;
}

describe('contenu partie 6 - reciproque de Thales', () => {
  const content = readContent();
  const raw = JSON.stringify(content);

  it('declare la partie 6 et ses scenes', () => {
    assert.equal(content.meta.partId, 'part6');
    assert.deepEqual(content.meta.sceneOrder, [
      'p6_0_cabinet_routes',
      'p6_1_activite_cordages',
      'p6_2_carnet_reciproque',
      'p6_3_exercice_guide',
      'p6_4_balises_verification',
      'p6_5_table_capitaine',
      'p6_6_fragment_final',
      'p6_7_conclusion',
    ]);
    assert.equal(content.meta.nextPartId, 'part7');
  });

  it('chaque scene a un dialogue gratuit optionnel qui ne debloque rien', () => {
    for (const scene of content.scenes) {
      if (scene.id === 'p6_7_conclusion') continue;
      const free = (scene.hotspots || []).filter(
        (h) => h.optional && h.advancesStory === false && h.id === 'ambiance_chat',
      );
      assert.ok(
        free.length >= 1,
        `dialogue gratuit manquant sur ${scene.id}`,
      );
      assert.ok(free.every((h) => !h.required));
      assert.ok(free.every((h) => !h.nextSceneId));
    }
  });

  it('file A→B→C→D fixe sur p6_4', () => {
    const balises = content.scenes.find((s) => s.id === P6_BALISE_SCENE_ID);
    assert.ok(balises.exerciseQueue);
    assert.deepEqual(balises.exerciseQueue.ids, P6_BALISE_EXERCISE_IDS);
    assert.equal(balises.next, P6_AFTER_BALISE_SCENE_ID);
    assert.equal(balises.hotspots.filter((h) => h.queueMember).length, 4);
    const perms = permutations(['balise_a', 'balise_b', 'balise_c', 'balise_d']);
    assert.equal(perms.length, 24);
    for (const order of perms) {
      assert.deepEqual(
        simulateQueueOpenings(order, P6_BALISE_EXERCISE_IDS),
        P6_BALISE_EXERCISE_IDS,
      );
    }
    // Pas de sortie avant D
    function done(ids) {
      let p = { exercises: {} };
      for (const id of ids) {
        p = setExerciseInProgress(p, id, {
          ...initialExerciseState(),
          succeeded: true,
          correctionUnlocked: true,
        });
      }
      return p;
    }
    assert.equal(
      isQueueComplete(done(['p6_balise_a', 'p6_balise_b', 'p6_balise_c']), P6_BALISE_EXERCISE_IDS),
      false,
    );
    assert.equal(
      getNextQueueExerciseId(
        done(['p6_balise_a', 'p6_balise_b', 'p6_balise_c']),
        P6_BALISE_EXERCISE_IDS,
      ),
      'p6_balise_d',
    );
    assert.equal(
      isQueueComplete(done(P6_BALISE_EXERCISE_IDS), P6_BALISE_EXERCISE_IDS),
      true,
    );
  });

  it('exercices A/B/C/D : configs et conclusions attendues', () => {
    const steps = walkSteps(content);
    const a = steps.find((s) => s.id === 'p6_balise_a');
    const b = steps.find((s) => s.id === 'p6_balise_b');
    const c = steps.find((s) => s.id === 'p6_balise_c');
    const d = steps.find((s) => s.id === 'p6_balise_d');
    assert.ok(a && b && c && d);
    // A emboîtée parallèle
    assert.match(a.prompt, /emboît/i);
    assert.equal(a.fields.conclusion.expected, 'Oui');
    assert.equal(checkClozeAnswers({ r1: '2,5', r2: '2.5', conclusion: 'Oui' }, a.fields).ok, true);
    // B papillon non parallèle
    assert.match(b.prompt, /papillon/i);
    assert.equal(b.fields.conclusion.expected, 'Non');
    // C emboîtée non parallèle
    assert.match(c.prompt, /emboît/i);
    assert.equal(c.fields.conclusion.expected, 'Non');
    // D classique papillon (plus la table) — valeurs 5, 8, 7,5, 12 → 1,6
    assert.doesNotMatch(d.prompt, /42|70|32,4|54/);
    assert.match(d.prompt, /5 m|8 m|7,5 m|12 m/);
    assert.equal(d.fields.r1.expected, 1.6);
    assert.equal(d.fields.r2.expected, 1.6);
    assert.equal(d.fields.conclusion.expected, 'Oui');
    assert.equal(
      checkClozeAnswers({ r1: '1,6', r2: '1.6', conclusion: 'Oui' }, d.fields).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers({ r1: '0.625', r2: '0,625', conclusion: 'Oui' }, d.fields).ok,
      true,
    );
    // Pas de schéma d’énoncé ; schéma en correction
    assert.ok(!d.illustrations || d.illustrations.length === 0);
    assert.match(
      d.correctionIllustration || '',
      /p6-exercice-d-classique-schema\.png$/,
    );
    assert.match(d.correction, /1,6/);
    assert.match(d.correction, /parall/i);
    // Indices Maki
    for (const ex of [a, b, c, d]) {
      assert.ok(ex.hints?.length >= 2);
      assert.ok(ex.hints.every((h) => h.reaction || h.text));
    }
  });

  it('scene p6_5_table_capitaine : fond, schema complet, valeurs table', () => {
    const table = content.scenes.find((s) => s.id === 'p6_5_table_capitaine');
    assert.ok(table);
    assert.match(table.decor.background, /p6-5-table-capitaine\.png$/);
    const steps = walkSteps({ scenes: [table] });
    const cloze = steps.find((s) => s.id === 'p6_table_capitaine');
    assert.ok(cloze);
    assert.ok(
      cloze.illustrations?.some((s) =>
        /p6-exercice-d-table-carte-pirate-complet\.png$/.test(s),
      ),
    );
    assert.ok(
      !cloze.illustrations?.some((s) => /p6-exercice-d-table-schema\.png$/.test(s)),
    );
    assert.match(cloze.prompt, /42|70|32,4|54/);
    assert.equal(cloze.fields.r1.expected, 0.6);
    assert.equal(cloze.fields.r2.expected, 0.6);
    assert.equal(cloze.fields.conclusion.expected, 'Oui');
    assert.ok(cloze.coherentNumericGroups);
    const cohOpts = { coherentNumericGroups: cloze.coherentNumericGroups };
    // 1–4 : 0.6 / 0,6 / 1.67 / 1,67
    assert.equal(
      checkClozeAnswers(
        { r1: '0.6', r2: '0.6', conclusion: 'Oui' },
        cloze.fields,
        cohOpts,
      ).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers(
        { r1: '0,6', r2: '0,6', conclusion: 'Oui' },
        cloze.fields,
        cohOpts,
      ).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers(
        { r1: '1.67', r2: '1.67', conclusion: 'Oui' },
        cloze.fields,
        cohOpts,
      ).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers(
        { r1: '1,67', r2: '1,67', conclusion: 'Oui' },
        cloze.fields,
        cohOpts,
      ).ok,
      true,
    );
    // 5 : mélange incohérent refusé
    const mixed = checkClozeAnswers(
      { r1: '0,6', r2: '1,67', conclusion: 'Oui' },
      cloze.fields,
      cohOpts,
    );
    assert.equal(mixed.ok, false);
    assert.match(
      mixed.results.r1.reason || mixed.results.r2.reason || '',
      /changé de sens|meme sens|même sens/i,
    );
    const mixed2 = checkClozeAnswers(
      { r1: '1.67', r2: '0.6', conclusion: 'Oui' },
      cloze.fields,
      cohOpts,
    );
    assert.equal(mixed2.ok, false);
    assert.equal(cloze.setFlags?.p6TableCaptainCompleted, true);
    assert.ok(!cloze.setFlags?.fragment6Collected);
    // Assets disque
    for (const rel of [
      'client/assets/backgrounds/part6/p6-5-table-capitaine.png',
      'client/assets/diagrams/part6/p6-exercice-d-classique-schema.png',
      'client/assets/diagrams/part6/p6-exercice-d-classique-schema.svg',
      'client/assets/diagrams/part6/p6-exercice-d-table-carte-pirate-complet.png',
    ]) {
      assert.ok(fs.existsSync(path.join(root, rel)), rel);
    }
  });

  it('fragment 6 apres table capitaine (pas apres balise D) ; placeFragment 6/6', () => {
    const frag = content.scenes.find((s) => s.id === P6_FRAGMENT_SCENE_ID);
    assert.ok(frag);
    assert.equal(frag.id, 'p6_6_fragment_final');
    const h = frag.hotspots.find((x) => x.id === 'fragment_6');
    assert.ok(h);
    assert.equal(h.image, '/assets/objects/part6/fragment-carte-6.png');
    const board = h.sequence.find((s) => s.type === 'fragmentBoard');
    assert.equal(board.placeFragment, 6);
    assert.equal(board.total, 6);
    assert.ok(h.sequence.some((s) => s.setFlags?.fragment6Collected));
    const order = content.meta.sceneOrder;
    assert.ok(
      order.indexOf('p6_4_balises_verification') <
        order.indexOf('p6_5_table_capitaine'),
    );
    assert.ok(
      order.indexOf('p6_5_table_capitaine') <
        order.indexOf('p6_6_fragment_final'),
    );
    // Balise D ne donne pas le fragment
    const d = walkSteps(content).find((s) => s.id === 'p6_balise_d');
    assert.ok(!d.setFlags?.fragment6Collected);
    assert.ok(!d.setFlags?.fragment_6);
    assert.equal(d.setFlags?.p6ExerciseDCompleted, true);
  });

  it('bouton partie 7 seulement en conclusion endPart', () => {
    const conclusion = content.scenes.find((s) => s.id === 'p6_7_conclusion');
    assert.ok(conclusion.steps.some((s) => s.endPart === true && s.nextPartId === 'part7'));
    // Pas de endPart / next part7 avant
    for (const scene of content.scenes) {
      if (scene.id === 'p6_7_conclusion') continue;
      const steps = walkSteps({ scenes: [scene] });
      assert.ok(
        !steps.some((s) => s.endPart === true || s.nextPartId === 'part7'),
        `pas de sortie part7 anticipée sur ${scene.id}`,
      );
    }
  });

  it('progression part5 → part6 → part7', () => {
    assert.ok(AVAILABLE_PART_IDS.includes('part6'));
    let p = completePart(initialProgress(), 'prologue');
    for (const id of ['part1', 'part2', 'part3', 'part4', 'part5']) {
      p = completePart(p, id);
    }
    assert.equal(canOpenPart('part6', p), true);
    assert.equal(resolvePartToPlay(p), 'part6');
    p = completePart(p, 'part6');
    assert.ok(p.completedParts.includes('part6'));
    assert.equal(canOpenPart('part7', p), true);
    assert.equal(resolvePartToPlay(p), 'part7');
  });

  it('assets part6 presents', () => {
    const refs = new Set(
      raw.match(
        /\/assets\/(?:backgrounds|objects|diagrams)\/part6\/[a-z0-9_.-]+\.(?:png|svg)/gi,
      ) || [],
    );
    assert.ok(refs.size >= 8, `refs=${refs.size}`);
    for (const ref of refs) {
      const rel = path.join(root, 'client', ref.replace(/^\//, ''));
      assert.ok(fs.existsSync(rel), ref);
    }
  });

  it('mode test Partie 6', () => {
    const p = buildTestProgressPart6();
    assert.equal(p.currentPartId, 'part6');
    assert.equal(p.currentSceneId, 'p6_0_cabinet_routes');
    assert.deepEqual(p.fragmentsCollected, [1, 2, 3, 4, 5]);
    assert.equal(p.flags._testBoot, 'part6');
    assert.equal(resolvePartToPlay(p), 'part6');
  });

  it('branchement main + moteur part6/part7', () => {
    const main = fs.readFileSync(path.join(root, 'client/js/main.js'), 'utf8');
    assert.ok(main.includes("url: '/content/part6/scenes.json'"));
    assert.match(main, /playPart\('part6'/);
    assert.ok(main.includes("url: '/content/part7/scenes.json'"));
    assert.match(main, /playPart\('part7'/);
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /btn-go-part7/);
    assert.match(engine, /fragment-carte-6/);
    assert.match(engine, /fragment6Collected/);
  });

  it('indices attribues a Maki (reaction)', () => {
    const steps = walkSteps(content).filter((s) => s.type === 'cloze' && s.hints);
    assert.ok(steps.length >= 5);
    for (const s of steps) {
      for (const h of s.hints) {
        assert.ok(h.reaction || /Krii/i.test(h.reaction || h.text || ''));
      }
    }
  });

  it('utilise les assets du pack complet (p6-7, p6-8, fragment 6, schemas)', () => {
    const must = [
      'client/assets/backgrounds/part6/p6-5-table-capitaine.png',
      'client/assets/backgrounds/part6/p6-7-table-cartes-pirate.png',
      'client/assets/backgrounds/part6/p6-8-fragment-final.png',
      'client/assets/objects/part6/fragment-carte-6.png',
      'client/assets/objects/part6/fragment-carte-6-large.png',
      'client/assets/diagrams/part6/p6-exercice-d-classique-schema.png',
      'client/assets/diagrams/part6/p6-exercice-d-table-carte-pirate-complet.png',
      'client/assets/diagrams/part6/p6-activite-cordages-schema.png',
    ];
    for (const rel of must) {
      const p = path.join(root, rel);
      assert.ok(fs.existsSync(p), rel);
      assert.ok(fs.statSync(p).size > 5000, `${rel} trop petit`);
    }
    // Fragment RGBA
    const frag = fs.readFileSync(
      path.join(root, 'client/assets/objects/part6/fragment-carte-6.png'),
    );
    assert.equal(frag[25], 6, 'fragment-carte-6 doit être RGBA');
    // Fragment scene uses real final bg
    const fragScene = content.scenes.find((s) => s.id === 'p6_6_fragment_final');
    assert.match(fragScene.decor.background, /p6-8-fragment-final/);
  });

  it('p6_1 activite : accepte 0.4 / 0,4 (rapports inverses) et 2,5', () => {
    const steps = walkSteps(content);
    const act = steps.find((s) => s.id === 'p6_activite_cordages');
    assert.ok(act, 'cloze p6_activite_cordages');
    // Grand / petit
    assert.equal(
      checkClozeAnswers(
        { r1: '2,5', r2: '2.5', conclusion: 'Oui' },
        act.fields,
      ).ok,
      true,
    );
    // Petit / grand (notation US)
    assert.equal(
      checkClozeAnswers(
        { r1: '0.4', r2: '0.4', conclusion: 'Oui' },
        act.fields,
      ).ok,
      true,
    );
    // Petit / grand (notation FR)
    assert.equal(
      checkClozeAnswers(
        { r1: '0,4', r2: '0,4', conclusion: 'Oui' },
        act.fields,
      ).ok,
      true,
    );
    // Variantes 0.40 / 0,40
    assert.equal(
      checkClozeAnswers(
        { r1: '0.40', r2: '0,40', conclusion: 'Oui' },
        act.fields,
      ).ok,
      true,
    );
    // Conclusion parallèle conservée
    assert.equal(act.fields.conclusion.expected, 'Oui');
  });

  it('pack-data source disponible et coherent A-D', () => {
    const packPath = path.join(root, 'client/content/part6/pack-data.json');
    assert.ok(fs.existsSync(packPath));
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const ids = pack.exercises.slice(2).map((e) => e.id);
    assert.deepEqual(ids, ['A', 'B', 'C', 'D']);
    assert.deepEqual(
      pack.exercises.find((e) => e.id === 'D').values,
      ['42 cm', '70 cm', '32,4 cm', '54 cm'],
    );
    for (const sceneId of pack.meta.sceneOrder) {
      assert.ok(pack.dialogueButtons[sceneId], sceneId);
    }
  });
});
