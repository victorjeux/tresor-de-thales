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
import { buildTestProgressPart5 } from '../shared/testPartBoot.js';
import { checkClozeAnswers } from '../shared/clozeAnswer.js';
import {
  P5_BALISE_EXERCISE_IDS,
  P5_BALISE_SCENE_ID,
  P5_AFTER_BALISE_SCENE_ID,
  getNextQueueExerciseId,
  isQueueComplete,
  simulateQueueOpenings,
  permutations,
} from '../shared/trainingQueue.js';
import { setExerciseInProgress, initialExerciseState } from '../shared/exerciseHelp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const part5Path = path.join(root, 'client', 'content', 'part5', 'scenes.json');

function readContent() {
  return JSON.parse(fs.readFileSync(part5Path, 'utf8'));
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

describe('contenu partie 5 - Thales triangle papillon', () => {
  const content = readContent();
  const raw = JSON.stringify(content);
  const strings = collectStrings(content);

  it('declare la partie 5 et ses scenes dans l ordre', () => {
    assert.equal(content.meta.partId, 'part5');
    assert.deepEqual(content.meta.sceneOrder, [
      'p5_0_arrivee_crique_vents_croises',
      'p5_1_activite_cordages_papillon',
      'p5_2_carnet_thales_papillon',
      'p5_3_verification_cours',
      'p5_4_balises_thales_papillon',
      'p5_5_finale_citerne',
      'p5_6_fragment_papillon',
      'p5_7_conclusion',
    ]);
    assert.equal(content.scenes.length, 8);
  });

  it('conserve la formulation courte professeur du theoreme papillon', () => {
    assert.match(
      raw,
      /Si les points M, A, B et N, A, C sont align[eé]s dans cet ordre/,
    );
    assert.match(raw, /\(MN\).*\(BC\).*parall/i);
  });

  it('place la phrase obligatoire avant les egalites de rapports', () => {
    const occurrences = raw.match(/D'après le théorème de Thalès/g) || [];
    assert.ok(
      occurrences.length >= 6,
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

  it('carnet : theoreme exact + schema papillon (pas emboîté)', () => {
    const carnet = content.scenes.find(
      (s) => s.id === 'p5_2_carnet_thales_papillon',
    );
    const nb = carnet.hotspots[0].sequence.find((s) => s.type === 'notebook');
    assert.ok(nb);
    assert.equal(nb.id, 'p5_cours_thales_papillon');

    // Deux premières pages : schéma leçon papillon (PNG pack)
    const firstTwo = nb.pages.slice(0, 2);
    assert.equal(firstTwo.length, 2);
    for (const page of firstTwo) {
      const img =
        page.figureImage ||
        page.diagramImage ||
        page.illustration ||
        page.figureImagePng ||
        '';
      assert.equal(
        img,
        '/assets/diagrams/part5/p5-lecon-thales-papillon.png',
        `page « ${page.title} » doit utiliser p5-lecon-thales-papillon.png`,
      );
      // Ne pas confondre avec l’activité d’intro
      assert.doesNotMatch(
        img,
        /activite-papillon-triangles-semblables/,
      );
      const rel = path.join(root, 'client', img.replace(/^\//, ''));
      assert.ok(fs.existsSync(rel), rel);
    }

    // Page théorème : formulation courte + fractions
    const theorem = nb.pages.find(
      (p) =>
        /Th[eé]or[eè]me/i.test(p.title || '') ||
        JSON.stringify(p.blocks || []).includes('dfrac'),
    );
    assert.ok(theorem);
    const txt = JSON.stringify(nb.pages);
    assert.match(
      txt,
      /Si les points M, A, B et N, A, C sont align[eé]s dans cet ordre/,
    );
    assert.match(txt, /dfrac\{AM\}\{AB\}/);

    // SVG leçon = vraie config papillon (X autour de A, triangles opposés)
    const svgPath = path.join(
      root,
      'client/assets/diagrams/part5/p5-lecon-thales-papillon.svg',
    );
    assert.ok(fs.existsSync(svgPath));
    const svg = fs.readFileSync(svgPath, 'utf8');
    assert.match(svg, /papillon/i);
    assert.match(svg, />M</);
    assert.match(svg, />A</);
    assert.match(svg, />B</);
    assert.match(svg, />N</);
    assert.match(svg, />C</);
    assert.match(svg, />AM</);
    assert.match(svg, />AB</);
    assert.match(svg, />AN</);
    assert.match(svg, />AC</);
    assert.match(svg, />MN</);
    assert.match(svg, />BC</);
    assert.match(svg, /Triangle AMN/);
    assert.match(svg, /Triangle ABC/);
    // Deux sécantes croisées en A (forme en X) — pas un emboîté
    assert.match(
      svg,
      /line[^>]+x1="250"[^>]+y1="160"[^>]+x2="830"[^>]+y2="540"/,
    );
    assert.match(
      svg,
      /line[^>]+x1="250"[^>]+y1="540"[^>]+x2="830"[^>]+y2="160"/,
    );
    // Deux triangles opposés colorés
    assert.match(svg, /polygon points="250,160 540,350 250,540"/);
    assert.match(svg, /polygon points="830,540 540,350 830,160"/);
    // Le carnet n’utilise pas le schéma de l’activité d’intro
    const carnetRaw = JSON.stringify(nb);
    assert.doesNotMatch(
      carnetRaw,
      /p5-activite-papillon-triangles-semblables/,
    );
  });

  it('verification : phrase fixe + fractions verticales + reponses 20', () => {
    const steps = walkSteps(content);
    const verif = steps.find((s) => s.id === 'p5_verif_redaction');
    assert.ok(verif);
    assert.equal(verif.fields.phrase, undefined);
    assert.match(
      JSON.stringify(verif.lines),
      /D'après le théorème de Thalès,/,
    );
    const fracParts = [];
    for (const line of verif.lines || []) {
      for (const p of line.parts || []) {
        if (p.type === 'fraction' || p.type === 'frac') fracParts.push(p);
      }
    }
    assert.ok(fracParts.length >= 3, 'au moins 3 fractions');
    assert.equal(verif.fields.d1.expected, 'AB');
    assert.equal(verif.fields.d2.expected, 'AC');
    assert.equal(verif.fields.d3.expected, 'BC');
    assert.equal(verif.fields.final.expected, 20);
  });

  it('p5_4 : file pedagogique A→B→C→D (queueMember + exerciseQueue)', () => {
    const balises = content.scenes.find((s) => s.id === P5_BALISE_SCENE_ID);
    assert.ok(balises);
    assert.ok(balises.exerciseQueue);
    assert.deepEqual(balises.exerciseQueue.ids, P5_BALISE_EXERCISE_IDS);
    assert.equal(balises.next, P5_AFTER_BALISE_SCENE_ID);
    const members = balises.hotspots.filter((h) => h.queueMember);
    assert.equal(members.length, 4);
    assert.ok(members.every((h) => !h.sequence));
    assert.ok(members.every((h) => h.advancesStory === false));
    for (const id of P5_BALISE_EXERCISE_IDS) {
      const ex = balises.exerciseQueue.exercises[id];
      assert.ok(ex, id);
      assert.equal(ex.type, 'cloze');
    }
  });

  it('p5_4 : 24 permutations de clics → toujours A,B,C,D', () => {
    const hs = ['balise_a', 'balise_b', 'balise_c', 'balise_d'];
    const perms = permutations(hs);
    assert.equal(perms.length, 24);
    for (const order of perms) {
      const opened = simulateQueueOpenings(order, P5_BALISE_EXERCISE_IDS);
      assert.deepEqual(opened, P5_BALISE_EXERCISE_IDS, order.join('→'));
    }
  });

  it('p5_4 : aucune sortie apres 1-3 ; sortie apres D', () => {
    function progressWithDone(idsDone) {
      let p = { exercises: {} };
      for (const id of idsDone) {
        p = setExerciseInProgress(p, id, {
          ...initialExerciseState(),
          succeeded: true,
          correctionUnlocked: true,
        });
      }
      return p;
    }
    assert.equal(
      isQueueComplete(progressWithDone(['p5_balise_a']), P5_BALISE_EXERCISE_IDS),
      false,
    );
    assert.equal(
      getNextQueueExerciseId(
        progressWithDone(['p5_balise_a', 'p5_balise_b', 'p5_balise_c']),
        P5_BALISE_EXERCISE_IDS,
      ),
      'p5_balise_d',
    );
    assert.equal(
      isQueueComplete(progressWithDone(P5_BALISE_EXERCISE_IDS), P5_BALISE_EXERCISE_IDS),
      true,
    );
  });

  it('exercices A/B/C/D et citerne : reponses correctes', () => {
    const steps = walkSteps(content);
    const a = steps.find((s) => s.id === 'p5_balise_a');
    const b = steps.find((s) => s.id === 'p5_balise_b');
    const c = steps.find((s) => s.id === 'p5_balise_c');
    const d = steps.find((s) => s.id === 'p5_balise_d');
    const cit = steps.find((s) => s.id === 'p5_citerne');
    assert.equal(checkClozeAnswers({ answer: '12' }, a.fields).ok, true);
    assert.equal(checkClozeAnswers({ answer: '12' }, b.fields).ok, true);
    assert.equal(checkClozeAnswers({ answer: '5' }, c.fields).ok, true);
    assert.equal(checkClozeAnswers({ answer: '6' }, d.fields).ok, true);
    assert.equal(checkClozeAnswers({ p: '1,80' }, cit.fields).ok, true);
    assert.equal(checkClozeAnswers({ p: '1.8' }, cit.fields).ok, true);
    assert.equal(cit.fields.p.expected, 1.8);
    assert.ok(
      cit.illustrations?.some((s) => /p5-citerne-enonce/.test(s)),
    );
    assert.match(cit.prompt, /Observe le schéma ci-dessous/);
    assert.ok(cit.correctionIllustration);
    // C/D sans schéma élève
    assert.ok(!c.illustrations || c.illustrations.length === 0);
    assert.ok(c.correctionIllustration);
    assert.ok(d.correctionIllustration);
  });

  it('activite intro p5_1 : triangles semblables en configuration papillon, AC = 9 m', () => {
    const scene = content.scenes.find(
      (s) => s.id === 'p5_1_activite_cordages_papillon',
    );
    assert.ok(scene);
    assert.match(scene.prompt, /papillon/i);
    assert.match(scene.prompt, /semblables/i);

    const steps = walkSteps(content);
    const act = steps.find((s) => s.id === 'p5_intro_triangles_semblables');
    assert.ok(act, 'cloze p5_intro_triangles_semblables');
    assert.equal(act.type, 'cloze');

    // Schéma pack corrigé
    assert.ok(
      act.illustrations?.some((s) =>
        /p5-activite-papillon-triangles-semblables-schema\.(png|svg)$/.test(s),
      ),
      'schéma papillon triangles semblables',
    );
    const schemaRel = act.illustrations
      .find((s) => /p5-activite-papillon-triangles-semblables-schema/.test(s))
      .replace(/^\//, '');
    assert.ok(
      fs.existsSync(path.join(root, 'client', schemaRel)),
      schemaRel,
    );

    // Consigne : triangles semblables + papillon, pas Thalès direct
    assert.match(act.prompt, /triangles semblables/i);
    assert.match(act.prompt, /configuration papillon/i);
    assert.match(act.prompt, /AMN/);
    assert.match(act.prompt, /ABC/);
    assert.match(act.prompt, /AM.*AB/s);
    assert.match(act.prompt, /AN.*AC/s);
    assert.doesNotMatch(act.prompt, /D'après le théorème de Thalès/);
    assert.doesNotMatch(act.prompt, /théorème de Thalès/i);

    // Valeurs et réponses
    assert.equal(act.fields.coef.expected, 3);
    assert.equal(act.fields.ac.expected, 9);
    assert.equal(
      checkClozeAnswers({ coef: '3', ac: '9' }, act.fields).ok,
      true,
    );

    // Schéma SVG : libellés obligatoires
    const svgPath = path.join(
      root,
      'client/assets/diagrams/part5/p5-activite-papillon-triangles-semblables-schema.svg',
    );
    assert.ok(fs.existsSync(svgPath));
    const svg = fs.readFileSync(svgPath, 'utf8');
    assert.match(svg, /Triangles semblables en configuration papillon/);
    assert.match(svg, /AMN\s*~\s*ABC/);
    assert.match(svg, /AM\s*↔\s*AB\s*:\s*×3/);
    assert.match(svg, /AN\s*↔\s*AC\s*:\s*×3/);
  });

  it('recupere le fragment 5 avec plateau 5 sur 6', () => {
    const scene = content.scenes.find((s) => s.id === 'p5_6_fragment_papillon');
    const fragment = scene.hotspots.find((h) => h.id === 'fragment_5');
    assert.ok(fragment);
    assert.equal(fragment.image, '/assets/objects/part5/fragment-carte-5.png');
    const board = fragment.sequence.find((s) => s.type === 'fragmentBoard');
    assert.equal(board.placeFragment, 5);
    assert.equal(board.total, 6);
    assert.ok(fragment.sequence.some((s) => s.setFlags?.fragment5Collected));
  });

  it('termine part5 vers part6', () => {
    assert.match(content.meta.announceNext, /Partie 6|r[eé]ciproque/i);
    assert.equal(content.meta.nextPartId, 'part6');
    const conclusion = content.scenes.find((s) => s.id === 'p5_7_conclusion');
    assert.ok(conclusion.steps.some((s) => s.endPart === true));
  });

  it('progression part4 → part5 → part6', () => {
    assert.ok(AVAILABLE_PART_IDS.includes('part5'));
    let p = completePart(initialProgress(), 'prologue');
    p = completePart(p, 'part1');
    p = completePart(p, 'part2');
    p = completePart(p, 'part3');
    p = completePart(p, 'part4');
    assert.equal(canOpenPart('part5', p), true);
    assert.equal(resolvePartToPlay(p), 'part5');
    p = completePart(p, 'part5');
    assert.ok(p.completedParts.includes('part5'));
    assert.equal(canOpenPart('part6', p), true);
    assert.equal(resolvePartToPlay(p), 'part6');
  });

  it('assets part5 presents', () => {
    const refs = new Set(
      raw.match(
        /\/assets\/(?:backgrounds|objects|diagrams)\/part5\/[a-z0-9_.-]+\.(?:png|svg)/gi,
      ) || [],
    );
    assert.ok(refs.size >= 8, `refs=${refs.size}`);
    for (const ref of refs) {
      const rel = path.join(root, 'client', ref.replace(/^\//, ''));
      assert.ok(fs.existsSync(rel), ref);
    }
  });

  it('mode test Partie 5', () => {
    const p = buildTestProgressPart5();
    assert.equal(p.currentPartId, 'part5');
    assert.equal(p.currentSceneId, 'p5_0_arrivee_crique_vents_croises');
    assert.deepEqual(p.completedParts, [
      'prologue',
      'part1',
      'part2',
      'part3',
      'part4',
    ]);
    assert.deepEqual(p.fragmentsCollected, [1, 2, 3, 4]);
    assert.equal(p.flags._testBoot, 'part5');
    assert.equal(resolvePartToPlay(p), 'part5');
  });

  it('branchement main + moteur part5/part6', () => {
    const main = fs.readFileSync(path.join(root, 'client/js/main.js'), 'utf8');
    assert.ok(main.includes("url: '/content/part5/scenes.json'"));
    assert.match(main, /playPart\('part5'/);
    assert.ok(main.includes("url: '/content/part6/scenes.json'"));
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /btn-go-part6/);
    assert.match(engine, /fragment-carte-5/);
    assert.match(engine, /fragment5Collected/);
  });

  it('contient les resultats attendus (9, 12, 5, 6, 20, 1,80)', () => {
    for (const expected of ['9', '12', '5', '6', '20', '1.8', '1,80']) {
      assert.ok(
        strings.some((s) => s.includes(expected)) ||
          raw.includes(`"${expected}"`) ||
          raw.includes(expected),
        expected,
      );
    }
  });
});
