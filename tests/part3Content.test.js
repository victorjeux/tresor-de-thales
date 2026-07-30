import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkClozeAnswers } from '../shared/clozeAnswer.js';
import {
  resolvePartToPlay,
  AVAILABLE_PART_IDS,
} from '../shared/partLoader.js';
import {
  completePart,
  initialProgress,
  canOpenPart,
} from '../shared/progression.js';
import { buildTestProgressPart3 } from '../shared/testPartBoot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const part3Path = path.join(root, 'client', 'content', 'part3', 'scenes.json');

function readContent() {
  return JSON.parse(fs.readFileSync(part3Path, 'utf8'));
}

function walkSteps(content) {
  const steps = [];
  for (const scene of content.scenes || []) {
    if (scene.steps) steps.push(...scene.steps);
    for (const h of scene.hotspots || []) {
      if (h.sequence) steps.push(...h.sequence);
    }
    if (scene.onAllRequired) steps.push(scene.onAllRequired);
  }
  return steps;
}

function fieldsToMap(fields) {
  if (!Array.isArray(fields)) return fields || {};
  const map = {};
  for (const f of fields) {
    if (!f?.id) continue;
    const expList = Array.isArray(f.expected) ? f.expected : [f.expected];
    map[f.id] = {
      kind: f.kind || 'number',
      expected: Number(expList[0]),
      accept: expList.map(String),
      size: f.size || 'num',
    };
  }
  return map;
}

describe('contenu partie 3 - triangles semblables', () => {
  const content = readContent();
  const raw = JSON.stringify(content);

  it('scenes.json Partie 3 valide avec p3_0 à p3_6', () => {
    assert.equal(content.meta.partId, 'part3');
    assert.deepEqual(content.meta.sceneOrder, [
      'p3_0_arrivee_moulin',
      'p3_1_decouverte_gabarits',
      'p3_2_carnet_euclide',
      'p3_3_exercices_application',
      'p3_4_finale_roue_a_aube',
      'p3_5_fragment_moulin',
      'p3_6_conclusion',
    ]);
    assert.equal(content.scenes.length, 7);
  });

  it('p3_1 : pas d’objets triangles superposés, hotspots sur le fond', () => {
    const sc = content.scenes.find((s) => s.id === 'p3_1_decouverte_gabarits');
    assert.deepEqual(sc.decor.objects || [], []);
    const petit = sc.hotspots.find((h) => h.id === 'petit_gabarit');
    const grand = sc.hotspots.find((h) => h.id === 'grande_piece');
    assert.ok(petit && grand);
    assert.equal(petit.inDecor, true);
    assert.equal(grand.inDecor, true);
    // Grande pièce (centre) à gauche, petit gabarit (centre) à droite
    assert.ok(grand.x < petit.x, 'grande pièce plus à gauche');
    assert.ok(grand.x < 50 && petit.x > 50, 'centres de part et d’autre du milieu');
    assert.match(sc.prompt, /même forme|meme forme/i);
    assert.match(JSON.stringify(sc.hotspots), /orientation|tourné|tourne/i);
    const q = sc.onAllRequired;
    assert.equal(q.type, 'quiz');
    assert.ok(q.options.some((o) => o.correct && /angles/i.test(o.text)));
  });

  it('p3_2 : livret / cahier avant le notebook de leçon', () => {
    const sc = content.scenes.find((s) => s.id === 'p3_2_carnet_euclide');
    const hs = sc.hotspots.find((h) => h.id === 'livret_euclide');
    assert.ok(hs);
    const types = hs.sequence.map((s) => s.type);
    assert.ok(types.includes('dialogue'));
    assert.ok(types.includes('notebook'));
    const dlg = hs.sequence.find((s) => s.type === 'dialogue');
    assert.match(JSON.stringify(dlg.lines), /cahier|livret/i);
    const neree = (dlg.lines || []).find((l) => /Nér/i.test(l.speaker || ''));
    assert.ok(neree);
    assert.match(neree.text, /ou la même orientation\./);
    assert.match(
      raw,
      /c[oô]t[eé]s correspondants \(c[oô]t[eé]s qui jouent le m[êe]me r[oô]le/,
    );
  });

  it('p3_3 : trois mini-moulins inDecor, sans image superposée', () => {
    const sc = content.scenes.find((s) => s.id === 'p3_3_exercices_application');
    assert.match(sc.title, /trois/i);
    const ids = sc.hotspots.map((h) => h.id);
    assert.ok(ids.includes('mini_moulin_a'));
    assert.ok(ids.includes('mini_moulin_b'));
    assert.ok(ids.includes('mini_moulin_c'));
    const mills = sc.hotspots.filter((h) => h.id.startsWith('mini_moulin_'));
    assert.equal(mills.length, 3);
    assert.ok(mills.every((h) => h.required && h.inDecor));
    assert.ok(mills.every((h) => !h.image));
    assert.deepEqual(sc.decor.objects || [], []);
  });

  it('exercice C : Non + justification 2, 2, 2,4', () => {
    const steps = walkSteps(content);
    const c = steps.find((s) => s.id === 'p3_app_c');
    assert.ok(c);
    assert.match(JSON.stringify(c.illustrations || c), /p3-exercice-c-non-semblables/);
    const fields = fieldsToMap(c.fields);
    // fields may already be object
    const fmap =
      c.fields && !Array.isArray(c.fields) ? c.fields : fields;
    assert.equal(
      checkClozeAnswers({ conclusion: 'Non' }, fmap).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers({ conclusion: 'Oui' }, fmap).ok,
      false,
    );
    const corr = Array.isArray(c.correction)
      ? c.correction.join('\n')
      : c.correction;
    assert.match(corr, /6\s*\/\s*3\s*=\s*2/);
    assert.match(corr, /8\s*\/\s*4\s*=\s*2/);
    assert.match(corr, /12\s*\/\s*5\s*=\s*2[,.]4/);
    assert.equal(c.setFlags?.p3_app_c_done, true);
  });

  it('exercices A/B corrects ; accès finale après les 3', () => {
    const steps = walkSteps(content);
    const a = steps.find((s) => s.id === 'p3_app_a');
    const b = steps.find((s) => s.id === 'p3_app_b');
    assert.equal(
      checkClozeAnswers(
        { coef: '2', missing: '10' },
        fieldsToMap(a.fields),
      ).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers(
        { coef: '3', missing: '21' },
        fieldsToMap(b.fields),
      ).ok,
      true,
    );
    const sc = content.scenes.find((s) => s.id === 'p3_3_exercices_application');
    assert.equal(sc.next, 'p3_4_finale_roue_a_aube');
    assert.equal(sc.hotspots.filter((h) => h.required).length, 3);
  });

  it('finale non guidée : 2 schémas, 12 et 16 dans n’importe quel ordre, sans indices', () => {
    const steps = walkSteps(content);
    const f = steps.find((s) => s.id === 'p3_finale_roue');
    assert.ok(f);
    assert.equal(f.progressiveHelp, false);
    assert.ok(!f.hints || f.hints.length === 0);
    assert.ok(Array.isArray(f.illustrations));
    assert.equal(f.illustrations.length, 2);
    assert.match(f.illustrations[0], /p3-finale-petite-piece/);
    assert.match(f.illustrations[1], /p3-finale-grande-piece-a-trouver/);
    assert.ok(f.unorderedNumericFields);
    const fields = f.fields;
    assert.equal(
      checkClozeAnswers(
        { longueur_1: '12', longueur_2: '16' },
        fields,
        {
          unorderedNumericFields: f.unorderedNumericFields,
          unorderedNumericExpected: f.unorderedNumericExpected,
        },
      ).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers(
        { longueur_1: '16', longueur_2: '12' },
        fields,
        {
          unorderedNumericFields: f.unorderedNumericFields,
          unorderedNumericExpected: f.unorderedNumericExpected,
        },
      ).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers(
        { longueur_1: '12', longueur_2: '12' },
        fields,
        {
          unorderedNumericFields: f.unorderedNumericFields,
          unorderedNumericExpected: f.unorderedNumericExpected,
        },
      ).ok,
      false,
    );
  });

  it('fragment 3 après finale, plateau 3/6', () => {
    const finale = content.scenes.find((s) => s.id === 'p3_4_finale_roue_a_aube');
    assert.equal(finale.next, 'p3_5_fragment_moulin');
    const fragSc = content.scenes.find((s) => s.id === 'p3_5_fragment_moulin');
    const frag = fragSc.hotspots.find((h) => h.id === 'fragment_3');
    const board = frag.sequence.find((s) => s.type === 'fragmentBoard');
    assert.equal(board.placeFragment, 3);
    assert.equal(board.total, 6);
    assert.match(JSON.stringify(frag), /3 \/ 6/);
  });

  it('progression part2 → part3 → part4', () => {
    assert.ok(AVAILABLE_PART_IDS.includes('part3'));
    let p = completePart(initialProgress(), 'prologue');
    p = completePart(p, 'part1');
    p = completePart(p, 'part2');
    assert.equal(resolvePartToPlay(p), 'part3');
    p = completePart(p, 'part3');
    assert.ok(p.completedParts.includes('part3'));
    assert.equal(canOpenPart('part4', p), true);
    assert.equal(resolvePartToPlay(p), 'part4');
  });

  it('assets référencés part3 + diagrammes existent', () => {
    const refs = new Set(
      (raw.match(/\/assets\/(?:backgrounds|objects|diagrams)\/part3\/[a-z0-9_.-]+\.(?:png|svg)/gi) ||
        []),
    );
    assert.ok(refs.size >= 8);
    for (const ref of refs) {
      const rel = path.join(root, 'client', ref.replace(/^\//, ''));
      assert.ok(fs.existsSync(rel), ref);
    }
  });

  it('mode test Partie 3', () => {
    const p = buildTestProgressPart3();
    assert.equal(p.currentPartId, 'part3');
    assert.equal(p.currentSceneId, 'p3_0_arrivee_moulin');
    assert.deepEqual(p.completedParts, ['prologue', 'part1', 'part2']);
    assert.deepEqual(p.fragmentsCollected, [1, 2]);
    assert.equal(p.flags._testBoot, 'part3');
  });

  it('univers moulin sans éolienne', () => {
    assert.match(raw, /[Mm]oulin|roue [àa] aube/i);
    assert.doesNotMatch(raw, /[ée]olienne|turbine moderne/i);
  });

  it('schémas finale agrandis (CSS ≥ ×2)', () => {
    const css = fs.readFileSync(
      path.join(root, 'client/css/scenes.css'),
      'utf8',
    );
    assert.match(css, /\.cloze-illustration/);
    assert.match(css, /max-height:\s*56vh/);
    assert.match(css, /460px|min-width:\s*min\(42%/);
  });
});
