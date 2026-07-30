import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canOpenPart,
  completePart,
  initialProgress,
  PART_ORDER,
} from '../shared/progression.js';
import { resolvePartToPlay, AVAILABLE_PART_IDS } from '../shared/partLoader.js';
import { checkClozeAnswers } from '../shared/clozeAnswer.js';
import {
  recordHintConsulted,
  makeHintConsultId,
  getIndicesConsultesTotal,
} from '../shared/hintConsult.js';
import {
  registerAttempt,
  unlockedHintCount,
  isCorrectionUnlockedByErrors,
  initialExerciseState,
} from '../shared/exerciseHelp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const part2Path = path.join(root, 'client', 'content', 'part2', 'scenes.json');

function walkSteps(content) {
  const steps = [];
  for (const scene of content.scenes || []) {
    for (const h of scene.hotspots || []) {
      if (h.sequence) steps.push(...h.sequence);
      if (h.lines) steps.push({ type: 'dialogue', lines: h.lines });
    }
  }
  return steps;
}

describe('contenu partie 2', () => {
  it('client/content/part2/scenes.json existe', () => {
    assert.ok(fs.existsSync(part2Path));
  });

  const raw = fs.readFileSync(part2Path, 'utf8');
  const content = JSON.parse(raw);

  it('contient 8 scènes dans le bon ordre', () => {
    assert.equal(content.meta.partId, 'part2');
    assert.deepEqual(content.meta.sceneOrder, [
      'p2_0_arrivee_chantier',
      'p2_1_decouverte_corde',
      'p2_2_cours',
      'p2_3_verification',
      'p2_4_exercices_application',
      'p2_6_finale_mur',
      'p2_7_fragment_mur',
      'p2_8_conclusion',
    ]);
    assert.equal(content.scenes.length, 8);
    assert.deepEqual(
      content.scenes.map((s) => s.id),
      content.meta.sceneOrder,
    );
  });

  it('part2 débloquée après part1 ; part3 verrouillée avant fin part2', () => {
    let p = completePart(initialProgress(), 'prologue');
    p = completePart(p, 'part1');
    assert.equal(canOpenPart('part2', p), true);
    assert.equal(canOpenPart('part3', p), false);
    assert.equal(resolvePartToPlay(p), 'part2');
    assert.ok(AVAILABLE_PART_IDS.includes('part2'));
  });

  it('fin de part2 marque part2 et débloque part3 (contenu disponible)', () => {
    let p = completePart(initialProgress(), 'prologue');
    p = completePart(p, 'part1');
    p = completePart(p, 'part2');
    assert.ok(p.completedParts.includes('part2'));
    assert.equal(canOpenPart('part3', p), true);
    assert.equal(p.currentPartId, 'part3');
    assert.equal(resolvePartToPlay(p), 'part3');
    assert.deepEqual(PART_ORDER.slice(0, 4), [
      'prologue',
      'part1',
      'part2',
      'part3',
    ]);
  });

  it('assets part2 référencés avec les bons chemins', () => {
    const s = JSON.stringify(content);
    assert.match(s, /\/assets\/backgrounds\/part2\/p2-atelier-exercices-cordes\.png/);
    assert.match(s, /\/assets\/backgrounds\/part2\/p2-table-cours-reciproque\.png/);
    assert.match(s, /\/assets\/backgrounds\/part2\/p2-chantier-quai-mur\.png/);
    assert.match(s, /\/assets\/objects\/part2\/fil-a-plomb\.png/);
    assert.match(s, /\/assets\/objects\/part2\/equerre-ancienne\.png/);
    assert.match(s, /\/assets\/objects\/part2\/corde-noeuds-triangle\.png/);
    assert.match(s, /\/assets\/objects\/part2\/fragment-carte-2\.png/);
    // Portail présent en asset pack mais pas comme exercice final
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          'client/assets/backgrounds/part2/p2-portail-final-angle-droit.png',
        ),
      ),
    );
    // Fichiers disque
    for (const rel of [
      'client/assets/backgrounds/part2/p2-chantier-quai-mur.png',
      'client/assets/backgrounds/part2/p2-table-cours-reciproque.png',
      'client/assets/backgrounds/part2/p2-atelier-exercices-cordes.png',
      'client/assets/objects/part2/fil-a-plomb.png',
      'client/assets/objects/part2/equerre-ancienne.png',
      'client/assets/objects/part2/corde-noeuds-triangle.png',
      'client/assets/objects/part2/fragment-carte-2.png',
    ]) {
      assert.ok(fs.existsSync(path.join(root, rel)), rel);
    }
  });

  it('aucun nouveau portrait généré ou référencé hors portraits existants', () => {
    const s = JSON.stringify(content);
    assert.ok(!/portraits\/(?!alizee|neree|euclide|maki|silas)/.test(s));
    assert.ok(!s.includes('planche'));
  });

  it('rédactions utilisent D\'une part, D\'autre part, On compare + réciproque', () => {
    const s = JSON.stringify(content);
    assert.match(s, /D'une part/);
    assert.match(s, /D'autre part/);
    assert.match(s, /On compare/);
    assert.match(s, /D'après la réciproque du théorème de Pythagore/);
    // orthographe : théorème au singulier
    assert.ok(!/théorèmes de Pythagore/i.test(s));
    assert.ok(!s.includes('faux angle droit'));
  });

  it('phrase réciproque présente dans cours, exercices et corrections', () => {
    const phrase = "D'après la réciproque du théorème de Pythagore";
    const cours = content.scenes.find((s) => s.id === 'p2_2_cours');
    const nb = cours.hotspots[0].sequence.find((s) => s.type === 'notebook');
    assert.match(JSON.stringify(nb.pages), new RegExp(phrase));
    for (const id of ['p2_1_corde', 'p2_4_rst', 'p2_5_klm', 'p2_6_mur']) {
      const cloze = walkSteps(content).find((s) => s.id === id);
      assert.ok(cloze, id);
      assert.match(JSON.stringify(cloze.lines), new RegExp(phrase));
      assert.match(cloze.correction, new RegExp(phrase));
    }
  });

  it('aucune chaîne trompeuse du type AB² = AC² + BC² = avant comparaison', () => {
    const bad = /[A-Z]{2}²\s*=\s*[A-Z]{2}²\s*\+\s*[A-Z]{2}²\s*=/;
    const cloze = walkSteps(content).filter((s) => s.type === 'cloze');
    for (const ex of cloze) {
      const blob = JSON.stringify(ex.lines || []) + (ex.prompt || '');
      assert.ok(!bad.test(blob), `chaîne trompeuse dans ${ex.id}`);
      // Corrections : ok d’avoir = après comparaison, mais pas la forme enchaînée interdite dans l’énoncé/lines
    }
    // Option de vérif A est la mauvaise rédaction enchaînée (présent comme piège, correct:false)
    const verif = walkSteps(content).find((s) => s.id === 'p2_verif_redaction');
    assert.ok(verif);
    const trap = verif.options.find((o) => /BC² = AB² \+ AC² =/.test(o.text));
    assert.ok(trap);
    assert.equal(trap.correct, false);
  });

  it('textes de côtés avec crochets ; schémas sans crochets', () => {
    const s = JSON.stringify(content);
    assert.match(s, /\[DF\]/);
    assert.match(s, /\[RT\]/);
    assert.match(s, /\[LM\]/);
    assert.match(s, /\[AB\]/);
    const figures = walkSteps(content)
      .filter((st) => st.figureLabels)
      .map((st) => st.figureLabels);
    for (const fl of figures) {
      const vals = Object.values(fl).map(String);
      for (const v of vals) {
        if (/^[A-Z]$/.test(v) || v.includes('m') || v.includes('cm')) {
          assert.ok(!v.includes('['), `label schéma avec crochet: ${v}`);
        }
      }
    }
  });

  it('introduction corde valide 3²+4²=5²', () => {
    const cloze = walkSteps(content).find((s) => s.id === 'p2_1_corde');
    assert.ok(cloze);
    const good = checkClozeAnswers(
      {
        plusGrandCote: '[DF]',
        dfLongueur: '5',
        dfCarre: '25',
        deLongueur: '3',
        efLongueur: '4',
        deCarre: '9',
        efCarre: '16',
        somme: '25',
        comparaison: '=',
        conclusionTriangle: 'est',
        sommetAngleDroit: 'E',
        conclusionCorde: 'peut',
      },
      cloze.fields,
    );
    assert.equal(good.ok, true);
  });

  it('exercice RST conclut rectangle en S', () => {
    const cloze = walkSteps(content).find((s) => s.id === 'p2_4_rst');
    assert.ok(cloze);
    const good = checkClozeAnswers(
      {
        plusGrandCote: '[RT]',
        rtLongueur: '15',
        rtCarre: '225',
        rsLongueur: '9',
        stLongueur: '12',
        rsCarre: '81',
        stCarre: '144',
        somme: '225',
        comparaison: '=',
        conclusion: 'est',
        sommet: 'S',
      },
      cloze.fields,
    );
    assert.equal(good.ok, true);
    assert.match(cloze.correction, /rectangle en S/);
  });

  it('exercice KLM conclut non rectangle', () => {
    const cloze = walkSteps(content).find((s) => s.id === 'p2_5_klm');
    assert.ok(cloze);
    const good = checkClozeAnswers(
      {
        plusGrandCote: '[LM]',
        lmLongueur: '13',
        lmCarre: '169',
        klLongueur: '8',
        kmLongueur: '10',
        klCarre: '64',
        kmCarre: '100',
        somme: '164',
        comparaison: '≠',
        conclusion: "n'est pas",
      },
      cloze.fields,
    );
    assert.equal(good.ok, true);
    assert.match(cloze.correction, /n'est pas rectangle/);
  });

  it('exercice final mur : 0,60²+0,80²=1, rectangle en C', () => {
    const cloze = walkSteps(content).find((s) => s.id === 'p2_6_mur');
    assert.ok(cloze);
    for (const ac of ['0,60', '0.60', '0,6', '0.6']) {
      for (const bc of ['0,80', '0.80', '0,8', '0.8']) {
        const good = checkClozeAnswers(
          {
            plusGrandCote: '[AB]',
            abLongueur: '1',
            abCarre: '1',
            acLongueur: ac,
            bcLongueur: bc,
            acCarre: '0,36',
            bcCarre: '0,64',
            somme: '1',
            comparaison: '=',
            conclusion: 'est',
            sommet: 'C',
            conclusionMur: 'est',
          },
          cloze.fields,
        );
        assert.equal(good.ok, true, `ac=${ac} bc=${bc}`);
      }
    }
    assert.match(cloze.correction, /rectangle en C/);
  });

  it('mauvaises réponses de vérif ne révèlent pas la solution', () => {
    const quizzes = walkSteps(content).filter(
      (s) => s.type === 'quiz' && String(s.id || '').startsWith('p2_verif'),
    );
    assert.equal(quizzes.length, 3);
    for (const q of quizzes) {
      for (const opt of q.options || []) {
        if (opt.correct) continue;
        const exp = String(opt.explanation || '');
        assert.ok(!/donc le triangle|réponse exacte|la bonne réponse est/i.test(exp));
      }
    }
  });

  it('indices Maki se débloquent aux bons seuils (politique part1)', () => {
    assert.equal(unlockedHintCount(1), 0);
    assert.equal(unlockedHintCount(2), 1);
    assert.equal(unlockedHintCount(3), 2);
    assert.equal(unlockedHintCount(4), 3);
    assert.equal(isCorrectionUnlockedByErrors(5), true);
    let s = initialExerciseState();
    for (let i = 0; i < 2; i += 1) s = registerAttempt(s, false);
    assert.equal(s.hintsUnlocked, 1);
  });

  it('indices Maki de part2 alimentent indicesConsultes', () => {
    let p = initialProgress();
    const clozeIds = walkSteps(content)
      .filter((s) => s.type === 'cloze' && s.progressiveHelp)
      .map((s) => s.id);
    assert.ok(clozeIds.length >= 4);
    for (const exId of clozeIds) {
      const hints = walkSteps(content).find((s) => s.id === exId)?.hints || [];
      assert.equal(hints.length, 3);
      p = recordHintConsulted(p, {
        id: makeHintConsultId(exId, 1),
        exerciseId: exId,
        hintLevel: 1,
        partId: 'part2',
        label: 'Indice de Maki',
      }).progress;
    }
    assert.equal(getIndicesConsultesTotal(p), clozeIds.length);
    // Reconsultation n’augmente pas
    const again = recordHintConsulted(p, {
      id: makeHintConsultId(clozeIds[0], 1),
      exerciseId: clozeIds[0],
      hintLevel: 1,
    });
    assert.equal(again.isNew, false);
    assert.equal(again.total, clozeIds.length);
  });

  it('drapeaux RST/KLM : même asset drapeau, pas de balise, ordre libre', () => {
    const app = content.scenes.find((s) => s.id === 'p2_4_exercices_application');
    assert.ok(app);
    assert.equal(app.next, 'p2_6_finale_mur');
    const flags = app.hotspots.filter((h) =>
      ['drapeau_rst', 'drapeau_klm'].includes(h.id),
    );
    assert.equal(flags.length, 2);
    assert.ok(flags.every((h) => h.required && h.repeatable));
    const imgs = (app.decor.objects || []).map((o) => o.image);
    assert.equal(imgs.length, 2);
    assert.equal(imgs[0], imgs[1]);
    assert.match(imgs[0], /petit-drapeau-sur-pied\.png|drapeau-exercice\.png/);
    assert.ok(!imgs.some((u) => /balise/i.test(u)));
    assert.ok(
      fs.existsSync(
        path.join(root, 'client/assets/objects/part2/petit-drapeau-sur-pied.png'),
      ),
    );
    assert.ok(
      flags
        .find((h) => h.id === 'drapeau_rst')
        .sequence.some((s) => s.id === 'p2_4_rst'),
    );
    assert.ok(
      flags
        .find((h) => h.id === 'drapeau_klm')
        .sequence.some((s) => s.id === 'p2_5_klm'),
    );
  });

  it('après muret : fragment 2 + plateau 2/6 + dialogue Alizée + conclusion', () => {
    const mur = walkSteps(content).find((s) => s.id === 'p2_6_mur');
    assert.ok(mur.correction);
    const fin = content.scenes.find((s) => s.id === 'p2_6_finale_mur');
    assert.equal(fin.next, 'p2_7_fragment_mur');
    assert.ok(!fin.hotspots.some((h) => h.id === 'fragment_carte_2'));
    const murHs = fin.hotspots.find((h) => h.id === 'mur_final');
    assert.ok(
      murHs.sequence.some((s) => s.nextSceneId === 'p2_7_fragment_mur'),
    );

    const fragSc = content.scenes.find((s) => s.id === 'p2_7_fragment_mur');
    const frag = fragSc.hotspots.find((h) => h.id === 'fragment_carte_2');
    assert.ok(frag);
    const types = frag.sequence.map((s) => s.type);
    assert.ok(types.includes('fragmentZoom'));
    assert.ok(types.includes('fragmentBoard'));
    assert.ok(types.includes('dialogue'));
    const board = frag.sequence.find((s) => s.type === 'fragmentBoard');
    assert.equal(board.placeFragment, 2);
    assert.equal(board.total, 6);
    const aliz = frag.sequence.find(
      (s) =>
        s.type === 'dialogue' &&
        (s.lines || []).some((l) => /s’assemble|s'assemble/i.test(l.text || '')),
    );
    assert.ok(aliz);
    const after = frag.sequence.find(
      (s) => s.setFlags?.fragment2Collected || s.nextSceneId === 'p2_8_conclusion',
    );
    assert.ok(after);
    assert.match(JSON.stringify(frag.sequence), /2 \/ 6|Deux fragments sur six/);
    assert.ok(content.scenes.some((s) => s.id === 'p2_8_conclusion'));

    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /Fragments récupérés/);
    assert.match(engine, /fragment2Collected/);
    assert.match(engine, /fragment-carte-2\.png/);
  });

  it('champs cloze compacts + marquage erreurs dans le moteur', () => {
    const css = fs.readFileSync(
      path.join(root, 'client/css/scenes.css'),
      'utf8',
    );
    assert.match(css, /\.cloze-input--num/);
    assert.match(css, /\.cloze-input--short/);
    assert.match(css, /\.cloze-field\.is-error/);
    assert.match(css, /cloze-field-error-msg/);
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /markFieldErrors/);
    assert.match(engine, /cloze-field/);
    assert.match(engine, /wrongIds/);
    assert.match(engine, /Erreur ici/);
  });

  it('fin part2 envoie vers part3 ; fin part3/part4 branchées', () => {
    const main = fs.readFileSync(path.join(root, 'client/js/main.js'), 'utf8');
    assert.match(main, /playPart\('part3'/);
    assert.match(main, /playPart\('part4'/);
    assert.match(main, /Cette partie sera bientôt disponible/);
    assert.ok(!main.includes('Revoir la partie 2'));
    assert.ok(!main.includes('btn-review-p2'));
    assert.ok(main.includes("url: '/content/part3/scenes.json'"));
    assert.ok(main.includes("url: '/content/part4/scenes.json'"));
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /btn-go-part3/);
    assert.match(engine, /btn-go-part4/);
    assert.match(engine, /btn-go-part5/);
    assert.match(engine, /playCloze/);
    assert.match(engine, /noteMakiHintDisplayed/);
  });

  it('notebook : 6 pages, bouton final seulement en dernière page (moteur)', () => {
    const cours = content.scenes.find((s) => s.id === 'p2_2_cours');
    const nb = cours.hotspots[0].sequence.find((s) => s.type === 'notebook');
    assert.equal(nb.pages.length, 6);
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /J’ai terminé de recopier/);
    assert.match(engine, /isLast/);
  });
});

describe('clozeAnswer utilitaire', () => {
  it('accepte virgule et formes décimales pour 0,60', async () => {
    const { checkClozeField } = await import('../shared/clozeAnswer.js');
    for (const v of ['0,60', '0.60', '0,6', '0.6']) {
      const r = checkClozeField(v, {
        kind: 'number',
        expected: 0.6,
        accept: ['0,60', '0.60', '0,6', '0.6'],
        tolerance: 0.001,
      });
      assert.equal(r.ok, true, v);
    }
    assert.equal(
      checkClozeField('≠', { kind: 'select', expected: '≠' }).ok,
      true,
    );
    assert.equal(
      checkClozeField("n'est pas", {
        kind: 'select',
        expected: "n'est pas",
      }).ok,
      true,
    );
  });

  it('signale tous les champs faux en même temps (wrongIds)', () => {
    const fields = {
      a: { kind: 'number', expected: 1 },
      b: { kind: 'number', expected: 2 },
      c: { kind: 'select', expected: '=' },
    };
    const r = checkClozeAnswers({ a: '9', b: '2', c: '≠' }, fields);
    assert.equal(r.ok, false);
    assert.ok(r.wrongIds.includes('a'));
    assert.ok(r.wrongIds.includes('c'));
    assert.ok(!r.wrongIds.includes('b'));
  });
});
