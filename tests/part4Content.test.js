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
import { buildTestProgressPart4 } from '../shared/testPartBoot.js';
import { checkClozeAnswers } from '../shared/clozeAnswer.js';
import {
  P4_BALISE_EXERCISE_IDS,
  P4_BALISE_SCENE_ID,
  P4_AFTER_BALISE_SCENE_ID,
  getNextQueueExerciseId,
  isQueueComplete,
  formatQueueStepLabel,
  simulateQueueOpenings,
  permutations,
} from '../shared/trainingQueue.js';
import { setExerciseInProgress, initialExerciseState } from '../shared/exerciseHelp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const part4Path = path.join(root, 'client', 'content', 'part4', 'scenes.json');

function readContent() {
  return JSON.parse(fs.readFileSync(part4Path, 'utf8'));
}

function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectStrings(v, out));
  }
  return out;
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
    if (scene.exerciseQueue?.outro) {
      steps.push({ type: 'dialogue', lines: scene.exerciseQueue.outro });
    }
    if (scene.onAllRequired) steps.push(scene.onAllRequired);
  }
  return steps;
}

describe('contenu partie 4 - Thales triangles emboites', () => {
  const content = readContent();
  const raw = JSON.stringify(content);
  const strings = collectStrings(content);

  it('declare la partie 4 et ses scenes dans l ordre', () => {
    assert.equal(content.meta.partId, 'part4');
    assert.deepEqual(content.meta.sceneOrder, [
      'p4_0_arrivee_ile_paralleles',
      'p4_1_activite_mats_paralleles',
      'p4_2_carnet_thales',
      'p4_3_verification_cours',
      'p4_4_balises_thales',
      'p4_5_finale_compas_marin',
      'p4_6_fragment_paralleles',
      'p4_7_conclusion',
    ]);
    assert.equal(content.scenes.length, 8);
  });

  it('conserve la formulation professeur du theoreme de Thales', () => {
    assert.match(
      raw,
      /Si les points A, B, M et A, C, N sont align[eé]s dans cet ordre/,
    );
    assert.match(raw, /\(BC\).*\(MN\).*parall/i);
  });

  it('place la phrase obligatoire avant les egalites de rapports', () => {
    const occurrences = raw.match(/D'après le théorème de Thalès/g) || [];
    assert.ok(
      occurrences.length >= 8,
      `occurrences trouvees: ${occurrences.length}`,
    );
    assert.match(
      raw,
      /D'après le théorème de Thalès[\s\S]*AM[\s\S]*AB[\s\S]*AN[\s\S]*AC[\s\S]*MN[\s\S]*BC/,
    );
  });

  it('ne stocke pas les rapports principaux sous forme lineaire avec barre oblique', () => {
    assert.doesNotMatch(raw, /AM\s*\/\s*AB/);
    assert.doesNotMatch(raw, /AN\s*\/\s*AC/);
    assert.doesNotMatch(raw, /MN\s*\/\s*BC/);
  });

  it('contient quatre exercices progressifs et le compas final', () => {
    for (const expected of ['balise_a', 'balise_b', 'balise_c', 'balise_d']) {
      assert.match(raw, new RegExp(expected));
    }
    assert.match(raw, /compas marin/i);
  });

  it('garde les schemas eleves seulement pour les premieres situations', () => {
    assert.match(raw, /p4-exercice-a-schema/);
    assert.match(raw, /p4-exercice-b-schema/);
    assert.match(raw, /p4-exercice-c-correction/);
    assert.match(raw, /p4-exercice-d-correction/);
    assert.match(raw, /p4-compas-correction/);
  });

  it('p4_5 : schéma d’énoncé affiché, plus de « Fais le schéma sur ton cahier »', () => {
    const scene = content.scenes.find((s) => s.id === 'p4_5_finale_compas_marin');
    assert.ok(scene);
    const steps = [];
    for (const h of scene.hotspots || []) {
      if (h.sequence) steps.push(...h.sequence);
    }
    const compas = steps.find((s) => s.id === 'p4_compas_marin');
    assert.ok(compas);
    assert.equal(compas.type, 'cloze');
    // Schéma d’énoncé fourni juste après l’énoncé (illustrations cloze)
    assert.ok(Array.isArray(compas.illustrations));
    assert.ok(
      compas.illustrations.some((src) =>
        /p4-compas-enonce\.(png|svg)$/.test(src),
      ),
      'illustrations doit contenir p4-compas-enonce',
    );
    const enoncePath = path.join(
      root,
      'client',
      compas.illustrations
        .find((src) => /p4-compas-enonce\.(png|svg)$/.test(src))
        .replace(/^\//, ''),
    );
    assert.ok(fs.existsSync(enoncePath), enoncePath);
    // Nouvelle consigne
    assert.match(
      compas.prompt,
      /Observe le schéma ci-dessous, puis réponds aux questions/,
    );
    assert.doesNotMatch(compas.prompt, /Fais le schéma sur ton cahier/);
    assert.doesNotMatch(raw, /Fais le schéma sur ton cahier/);
    // Valeurs attendues inchangées
    assert.equal(compas.fields.ouverture.expected, 6);
    assert.equal(compas.fields.x.expected, 2);
    // Correction détaillée conservée
    assert.ok(compas.correctionIllustration);
    assert.match(compas.correctionIllustration, /p4-compas-correction/);
  });

  it('contient les resultats attendus', () => {
    for (const expected of ['9', '20', '12', '5', '6', '2']) {
      assert.ok(
        strings.some((s) => s.includes(expected)) ||
          raw.includes(`"${expected}"`) ||
          raw.includes(expected),
        expected,
      );
    }
  });

  it('exercices A/B/C/D et compas : reponses correctes', () => {
    const steps = walkSteps(content);
    const a = steps.find((s) => s.id === 'p4_balise_a');
    const b = steps.find((s) => s.id === 'p4_balise_b');
    const c = steps.find((s) => s.id === 'p4_balise_c');
    const d = steps.find((s) => s.id === 'p4_balise_d');
    const compas = steps.find((s) => s.id === 'p4_compas_marin');
    assert.equal(
      checkClozeAnswers({ answer: '12' }, a.fields).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers({ answer: '12' }, b.fields).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers({ answer: '5' }, c.fields).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers({ answer: '6' }, d.fields).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers({ ouverture: '6', x: '2' }, compas.fields).ok,
      true,
    );
    // C/D sans schéma élève, schéma en correction
    assert.ok(!c.illustrations || c.illustrations.length === 0);
    assert.ok(c.correctionIllustration || /correction/.test(c.correctionIllustration || ''));
    assert.ok(c.correctionIllustration);
    assert.ok(d.correctionIllustration);
    assert.ok(compas.correctionIllustration);
  });

  it('recupere le fragment 4 avec plateau 4 sur 6', () => {
    const scene = content.scenes.find((s) => s.id === 'p4_6_fragment_paralleles');
    assert.ok(scene);
    const fragment = scene.hotspots.find((h) => h.id === 'fragment_4');
    assert.ok(fragment);
    assert.equal(fragment.image, '/assets/objects/part4/fragment-carte-4.png');
    const board = fragment.sequence.find((s) => s.type === 'fragmentBoard');
    assert.equal(board.placeFragment, 4);
    assert.equal(board.total, 6);
    assert.ok(
      fragment.sequence.some((s) => s.setFlags?.fragment4Collected),
    );
  });

  it('termine part4 vers part5', () => {
    assert.match(content.meta.announceNext, /Partie 5/i);
    assert.equal(content.meta.nextPartId, 'part5');
    const conclusion = content.scenes.find((s) => s.id === 'p4_7_conclusion');
    assert.ok(conclusion.steps.some((s) => s.endPart === true));
  });

  it('progression part3 → part4 → part5', () => {
    assert.ok(AVAILABLE_PART_IDS.includes('part4'));
    let p = completePart(initialProgress(), 'prologue');
    p = completePart(p, 'part1');
    p = completePart(p, 'part2');
    p = completePart(p, 'part3');
    assert.equal(canOpenPart('part4', p), true);
    assert.equal(resolvePartToPlay(p), 'part4');
    p = completePart(p, 'part4');
    assert.ok(p.completedParts.includes('part4'));
    assert.equal(canOpenPart('part5', p), true);
    assert.equal(resolvePartToPlay(p), 'part5');
  });

  it('assets part4 présents', () => {
    const refs = new Set(
      raw.match(
        /\/assets\/(?:backgrounds|objects|diagrams)\/part4\/[a-z0-9_.-]+\.(?:png|svg)/gi,
      ) || [],
    );
    assert.ok(refs.size >= 8);
    for (const ref of refs) {
      const rel = path.join(root, 'client', ref.replace(/^\//, ''));
      assert.ok(fs.existsSync(rel), ref);
    }
  });

  it('mode test Partie 4', () => {
    const p = buildTestProgressPart4();
    assert.equal(p.currentPartId, 'part4');
    assert.equal(p.currentSceneId, 'p4_0_arrivee_ile_paralleles');
    assert.deepEqual(p.completedParts, [
      'prologue',
      'part1',
      'part2',
      'part3',
    ]);
    assert.deepEqual(p.fragmentsCollected, [1, 2, 3]);
    assert.equal(p.flags._testBoot, 'part4');
    assert.equal(resolvePartToPlay(p), 'part4');
  });

  it('branchement main + moteur part4/part5', () => {
    const main = fs.readFileSync(path.join(root, 'client/js/main.js'), 'utf8');
    assert.ok(main.includes("url: '/content/part4/scenes.json'"));
    assert.match(main, /playPart\('part4'/);
    assert.match(main, /Partie 5 — Thalès/);
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /btn-go-part5/);
    assert.match(engine, /fragment-carte-4/);
    assert.match(engine, /fragment4Collected/);
    assert.match(engine, /figureImage|diagramImage/);
  });

  it('p4_4 : file pédagogique A→B→C→D (queueMember + exerciseQueue)', () => {
    const balises = content.scenes.find((s) => s.id === P4_BALISE_SCENE_ID);
    assert.ok(balises);
    assert.ok(balises.exerciseQueue);
    assert.deepEqual(balises.exerciseQueue.ids, P4_BALISE_EXERCISE_IDS);
    assert.equal(balises.next, P4_AFTER_BALISE_SCENE_ID);

    const members = balises.hotspots.filter((h) => h.queueMember);
    assert.equal(members.length, 4);
    assert.deepEqual(
      members.map((h) => h.id).sort(),
      ['balise_a', 'balise_b', 'balise_c', 'balise_d'],
    );
    // Plus d’ordre lié à la balise cliquée : pas de sequence par hotspot
    assert.ok(members.every((h) => !h.sequence));
    assert.ok(members.every((h) => h.advancesStory === false));
    assert.ok(members.every((h) => !h.required));
    // Toujours visibles / cliquables
    assert.ok(members.every((h) => h.repeatable === true));
    assert.ok(members.every((h) => h.inDecor === true));

    for (const id of P4_BALISE_EXERCISE_IDS) {
      const ex = balises.exerciseQueue.exercises[id];
      assert.ok(ex, id);
      assert.equal(ex.type, 'cloze');
      assert.equal(ex.id, id);
    }
    // Outro de clôture avant compas
    assert.ok(balises.exerciseQueue.outro?.length >= 2);
    assert.match(
      JSON.stringify(balises.exerciseQueue.outro),
      /quatre balises|compas marin/i,
    );
  });

  it('p4_4 : 24 permutations de clics → toujours A,B,C,D', () => {
    const balisesHotspots = ['balise_a', 'balise_b', 'balise_c', 'balise_d'];
    const perms = permutations(balisesHotspots);
    assert.equal(perms.length, 24);
    for (const order of perms) {
      const opened = simulateQueueOpenings(order, P4_BALISE_EXERCISE_IDS);
      assert.deepEqual(
        opened,
        P4_BALISE_EXERCISE_IDS,
        `ordre clics ${order.join('→')}`,
      );
    }
  });

  it('p4_4 : clics répétés sur la même balise ne sautent pas d’exercice', () => {
    const order = [
      'balise_d',
      'balise_d',
      'balise_d',
      'balise_d',
      'balise_a',
      'balise_a',
    ];
    const opened = simulateQueueOpenings(order, P4_BALISE_EXERCISE_IDS);
    assert.deepEqual(opened, P4_BALISE_EXERCISE_IDS);
  });

  it('p4_4 : ordre D→A→C→B affiche quand même A→B→C→D', () => {
    const opened = simulateQueueOpenings(
      ['balise_d', 'balise_a', 'balise_c', 'balise_b'],
      P4_BALISE_EXERCISE_IDS,
    );
    assert.deepEqual(opened, P4_BALISE_EXERCISE_IDS);
  });

  it('p4_4 : aucune sortie après 1, 2 ou 3 balises ; sortie seulement après D', () => {
    function progressWithDone(idsDone) {
      let p = { exercises: {} };
      for (const id of idsDone) {
        p = setExerciseInProgress(p, id, {
          ...initialExerciseState(),
          succeeded: true,
          correctionUnlocked: true,
          correctionShown: true,
        });
      }
      return p;
    }

    assert.equal(isQueueComplete(progressWithDone([]), P4_BALISE_EXERCISE_IDS), false);
    assert.equal(
      getNextQueueExerciseId(progressWithDone([]), P4_BALISE_EXERCISE_IDS),
      'p4_balise_a',
    );
    assert.equal(
      isQueueComplete(progressWithDone(['p4_balise_a']), P4_BALISE_EXERCISE_IDS),
      false,
    );
    assert.equal(
      getNextQueueExerciseId(
        progressWithDone(['p4_balise_a']),
        P4_BALISE_EXERCISE_IDS,
      ),
      'p4_balise_b',
    );
    assert.equal(
      isQueueComplete(
        progressWithDone(['p4_balise_a', 'p4_balise_b']),
        P4_BALISE_EXERCISE_IDS,
      ),
      false,
    );
    assert.equal(
      getNextQueueExerciseId(
        progressWithDone(['p4_balise_a', 'p4_balise_b']),
        P4_BALISE_EXERCISE_IDS,
      ),
      'p4_balise_c',
    );
    assert.equal(
      isQueueComplete(
        progressWithDone(['p4_balise_a', 'p4_balise_b', 'p4_balise_c']),
        P4_BALISE_EXERCISE_IDS,
      ),
      false,
    );
    assert.equal(
      getNextQueueExerciseId(
        progressWithDone(['p4_balise_a', 'p4_balise_b', 'p4_balise_c']),
        P4_BALISE_EXERCISE_IDS,
      ),
      'p4_balise_d',
    );
    // A + D seulement ne suffit pas
    assert.equal(
      isQueueComplete(
        progressWithDone(['p4_balise_a', 'p4_balise_d']),
        P4_BALISE_EXERCISE_IDS,
      ),
      false,
    );
    assert.equal(
      getNextQueueExerciseId(
        progressWithDone(['p4_balise_a', 'p4_balise_d']),
        P4_BALISE_EXERCISE_IDS,
      ),
      'p4_balise_b',
    );

    const allDone = progressWithDone(P4_BALISE_EXERCISE_IDS);
    assert.equal(isQueueComplete(allDone, P4_BALISE_EXERCISE_IDS), true);
    assert.equal(getNextQueueExerciseId(allDone, P4_BALISE_EXERCISE_IDS), null);

    // Scène : next = p4_5 uniquement après file complète (tryAdvanceIfAllRequired)
    const balises = content.scenes.find((s) => s.id === P4_BALISE_SCENE_ID);
    assert.equal(balises.next, P4_AFTER_BALISE_SCENE_ID);
  });

  it('p4_4 : rechargement au milieu de la file reprend le prochain non terminé', () => {
    function progressWithDone(idsDone) {
      let p = {
        exercises: {},
        currentPartId: 'part4',
        currentSceneId: P4_BALISE_SCENE_ID,
      };
      for (const id of idsDone) {
        p = setExerciseInProgress(p, id, {
          ...initialExerciseState(),
          succeeded: true,
          correctionUnlocked: true,
          correctionShown: true,
        });
      }
      return p;
    }

    // Après A seulement → B
    let p = progressWithDone(['p4_balise_a']);
    assert.equal(p.currentSceneId, P4_BALISE_SCENE_ID);
    assert.equal(getNextQueueExerciseId(p, P4_BALISE_EXERCISE_IDS), 'p4_balise_b');
    assert.equal(formatQueueStepLabel(p, P4_BALISE_EXERCISE_IDS), 'Exercice 2 sur 4');

    // Après A+B → C
    p = progressWithDone(['p4_balise_a', 'p4_balise_b']);
    assert.equal(getNextQueueExerciseId(p, P4_BALISE_EXERCISE_IDS), 'p4_balise_c');
    assert.equal(formatQueueStepLabel(p, P4_BALISE_EXERCISE_IDS), 'Exercice 3 sur 4');

    // Après A+B+C → D
    p = progressWithDone(['p4_balise_a', 'p4_balise_b', 'p4_balise_c']);
    assert.equal(getNextQueueExerciseId(p, P4_BALISE_EXERCISE_IDS), 'p4_balise_d');
    assert.equal(formatQueueStepLabel(p, P4_BALISE_EXERCISE_IDS), 'Exercice 4 sur 4');
  });

  it('moteur : playTrainingQueueFromHotspot conserve le type cloze', () => {
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /playTrainingQueueFromHotspot/);
    // Ne force plus type: 'exercise' en écrasant le cloze
    assert.match(engine, /type:\s*def\.type\s*\|\|\s*['"]exercise['"]/);
    assert.match(engine, /introFlag/);
  });

  it('carnet affiche le schéma de leçon ; vérif en fractions verticales', () => {
    const carnet = content.scenes.find((s) => s.id === 'p4_2_carnet_thales');
    const nb = carnet.hotspots[0].sequence.find((s) => s.type === 'notebook');
    const schema = nb.pages.find((p) => /Sch[eé]ma/i.test(p.title || ''));
    assert.ok(schema);
    assert.match(
      schema.figureImage || schema.diagramImage || '',
      /p4-lecon-thales-emboites\.(svg|png)/,
    );
    const verif = walkSteps(content).find((s) => s.id === 'p4_verif_redaction');
    assert.ok(verif);
    // Plus de champ « D'après »
    assert.equal(verif.fields.phrase, undefined);
    assert.equal(verif.fields.n1, undefined);
    // Phrase affichée en texte fixe
    assert.match(
      JSON.stringify(verif.lines),
      /D'après le théorème de Thalès,/,
    );
    // Pas de « sur » dans les rapports à trous
    assert.doesNotMatch(JSON.stringify(verif.lines), /\bsur\b/);
    // Fractions verticales (type fraction) avec numérateur placé
    const fracParts = [];
    for (const line of verif.lines || []) {
      for (const p of line.parts || []) {
        if (p.type === 'fraction' || p.type === 'frac') fracParts.push(p);
      }
    }
    assert.ok(fracParts.length >= 3, 'au moins 3 fractions');
    // Trois fractions du théorème : numérateur placé + dénominateur à trou
    const theoremFracs = fracParts.filter(
      (f) =>
        (f.numText === 'AM' || f.numText === 'AN' || f.numText === 'MN') &&
        f.denField,
    );
    assert.equal(theoremFracs.length, 3);
    assert.deepEqual(
      theoremFracs.map((f) => f.numText).sort(),
      ['AM', 'AN', 'MN'],
    );
    assert.equal(verif.fields.d1.expected, 'AB');
    assert.equal(verif.fields.d2.expected, 'AC');
    assert.equal(verif.fields.d3.expected, 'BC');
    assert.equal(verif.fields.final.expected, 20);
    // Moteur : rendu fraction
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /cloze-frac|type === 'fraction'/);
    const css = fs.readFileSync(path.join(root, 'client/css/scenes.css'), 'utf8');
    assert.match(css, /\.cloze-frac-bar/);
  });
});
