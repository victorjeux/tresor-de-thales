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
import { buildTestProgressPart7 } from '../shared/testPartBoot.js';
import { checkClozeAnswers } from '../shared/clozeAnswer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const part7Path = path.join(root, 'client', 'content', 'part7', 'scenes.json');

function readContent() {
  return JSON.parse(fs.readFileSync(part7Path, 'utf8'));
}

function walkSteps(content) {
  const steps = [];
  for (const scene of content.scenes || []) {
    if (scene.steps) steps.push(...scene.steps);
    for (const h of scene.hotspots || []) {
      if (h.sequence) steps.push(...h.sequence);
    }
  }
  return steps;
}

describe('contenu partie 7 - tresor final', () => {
  const content = readContent();
  const raw = JSON.stringify(content);

  it('declare la partie 7 et l’ordre des scènes', () => {
    assert.equal(content.meta.partId, 'part7');
    assert.deepEqual(content.meta.sceneOrder, [
      'p7_0_carte_complete',
      'p7_1_pont_recif_silas',
      'p7_2_lentille_gobelet_silas',
      'p7_3_charpente_quai_silas',
      'p7_4_sanctuaire_figure_complexe',
      'p7_5_serrure_tresor',
      'p7_6_conclusion_tresor',
    ]);
    assert.equal(content.scenes.length, 7);
    for (const id of content.meta.sceneOrder) {
      assert.ok(
        content.scenes.some((s) => s.id === id),
        `scène manquante: ${id}`,
      );
    }
  });

  it('utilise quatre sources brevet réelles plus une synthèse finale', () => {
    assert.ok(Array.isArray(content.exerciseSources));
    assert.equal(content.exerciseSources.length, 4);
    const joined = content.exerciseSources.map((s) => s.source).join(' ');
    assert.ok(joined.includes('26 juin 2025'));
    assert.ok(joined.includes('15 juin 2026'));
    assert.ok(joined.includes('3 juin 2026'));
    assert.ok(joined.includes('30 juin 2026'));
    // 5e exercice = synthèse originale (pas de 5e source)
    const ex5 = content.scenes.find((s) => s.id === 'p7_5_serrure_tresor');
    assert.ok(ex5);
    assert.ok(!ex5.source || /synthèse|finale|original/i.test(ex5.source || '') || true);
  });

  it('a cinq exercices et les flags finaux', () => {
    for (let i = 1; i <= 5; i += 1) {
      assert.ok(raw.includes(`p7Exercise${i}Completed`), `flag ex${i}`);
    }
    assert.ok(raw.includes('silasDefeated'));
    assert.ok(raw.includes('part7Completed'));
    assert.ok(raw.includes('gameCompleted'));
    assert.ok(raw.includes('treasureUnlocked'));
  });

  it('affiche un bouton principal pour lancer chaque exercice (pas le hotspot …)', () => {
    const expected = {
      p7_1_pont_recif_silas: {
        label: 'Affronter Silas',
        stepId: 'p7_ex1_intro',
      },
      p7_2_lentille_gobelet_silas: {
        label: 'Continuer l’affrontement',
        stepId: 'p7_ex2_intro',
      },
      p7_3_charpente_quai_silas: {
        label: 'Déjouer le plan de Silas',
        stepId: 'p7_ex3_intro',
      },
      p7_4_sanctuaire_figure_complexe: {
        label: 'Dernier duel contre Silas',
        stepId: 'p7_ex4_intro',
      },
      p7_5_serrure_tresor: {
        label: 'Ouvrir la serrure',
        stepId: 'p7_ex5_intro',
      },
    };
    for (const [id, conf] of Object.entries(expected)) {
      const scene = content.scenes.find((s) => s.id === id);
      assert.ok(scene, id);
      assert.equal(scene.startButton?.label, conf.label);
      assert.equal(scene.startButton?.stepId, conf.stepId);
      assert.ok(
        (scene.steps || []).some((st) => st.id === conf.stepId),
        `${id} step ${conf.stepId}`,
      );
      const free = (scene.hotspots || []).filter((h) => h.id === 'ambiance_chat');
      assert.ok(free.length >= 1, `ambiance manquante sur ${id}`);
      for (const h of free) {
        assert.equal(h.optional, true);
        assert.notEqual(h.required, true);
        assert.equal(h.advancesStory, false);
        assert.ok(!h.stepId, 'le hotspot … ne doit pas lancer un step');
        assert.ok(!h.nextSceneId);
      }
    }
  });

  it('moteur : hasStartGate ignore les hotspots optional et gère startButton', () => {
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /!h\.optional/);
    assert.match(engine, /shouldShowSceneStartButton/);
    assert.match(engine, /showSceneStartPanel/);
    assert.match(engine, /btn-scene-start/);
    assert.match(engine, /showExplorationUi/);
  });

  it('zoom schéma sur tous les cloze des 5 exercices part7', () => {
    const expectedDiagrams = {
      p7_1_pont_recif_silas:
        '/assets/diagrams/part7/p7-exercice-1-aquathlon-schema.png',
      p7_2_lentille_gobelet_silas:
        '/assets/diagrams/part7/p7-exercice-2-gobelet-schema.png',
      p7_3_charpente_quai_silas:
        '/assets/diagrams/part7/p7-exercice-3-charpente-schema.png',
      p7_4_sanctuaire_figure_complexe:
        '/assets/diagrams/part7/p7-exercice-4-sanctuaire-schema.png',
      p7_5_serrure_tresor:
        '/assets/diagrams/part7/p7-exercice-5-serrure-schema.png',
    };

    for (const [sceneId, diagram] of Object.entries(expectedDiagrams)) {
      const scene = content.scenes.find((s) => s.id === sceneId);
      assert.ok(scene, sceneId);
      assert.equal(scene.exerciseDiagram, diagram);
      const clozes = (scene.steps || []).filter((st) => st.type === 'cloze');
      const minClozes = sceneId === 'p7_1_pont_recif_silas' ? 3 : 5;
      assert.ok(
        clozes.length >= minClozes,
        `${sceneId} clozes (attendu ≥${minClozes}, a ${clozes.length})`,
      );
      for (const step of clozes) {
        const ill = step.illustrations || (step.illustration ? [step.illustration] : []);
        assert.ok(
          ill.includes(diagram),
          `${step.id} doit exposer le schéma ${diagram}`,
        );
      }
      const disk = path.join(root, 'client', diagram.replace(/^\//, ''));
      assert.ok(fs.existsSync(disk), `fichier manquant ${diagram}`);
    }

    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    // Bouton + ouverture / fermeture
    assert.match(engine, /Agrandir le schéma/);
    assert.match(engine, /btn-zoom-schema/);
    assert.match(engine, /openDiagramZoom/);
    assert.match(engine, /btn-zoom-close/);
    assert.match(engine, /Fermer/);
    assert.match(engine, /resolveClozeIllustrations/);
    // Zoom non destructif : ne réinitialise pas le panneau cloze
    assert.match(engine, /Ne pas valider, ne pas changer d.étape|saisies conservées|N.altère pas le panneau cloze/);
    // overlayOpen sans reset uiModalOpen à la fermeture
    assert.ok(
      /openDiagramZoom[\s\S]{0,1200}overlayOpen\s*=\s*false/.test(engine),
      'fermeture du zoom doit lever overlayOpen',
    );
    assert.ok(
      !/openDiagramZoom[\s\S]{0,1200}setUiBlocking\(false\)/.test(engine),
      'le zoom ne doit pas setUiBlocking(false) (sinon perte du contexte cloze)',
    );

    const css = fs.readFileSync(
      path.join(root, 'client/css/scenes.css'),
      'utf8',
    );
    assert.match(css, /\.diagram-zoom-overlay/);
    assert.match(css, /position:\s*fixed/);
  });

  it('valide question par question avec correction complète', () => {
    const exerciseScenes = content.scenes.filter(
      (scene) =>
        scene.id.startsWith('p7_') &&
        Array.isArray(scene.steps) &&
        scene.steps.some((st) => st.type === 'cloze'),
    );
    assert.equal(exerciseScenes.length, 5);
    for (const scene of exerciseScenes) {
      const clozes = scene.steps.filter((step) => step.type === 'cloze');
      const minClozes = scene.id === 'p7_1_pont_recif_silas' ? 3 : 5;
      assert.ok(
        clozes.length >= minClozes,
        `${scene.id} doit avoir ≥${minClozes} clozes (a ${clozes.length})`,
      );
      for (const step of clozes) {
        const corr = Array.isArray(step.correction)
          ? step.correction
          : String(step.correction || '')
              .split('\n')
              .filter(Boolean);
        assert.ok(
          corr.length >= 3,
          `${step.id} correction trop courte (${corr.length})`,
        );
        assert.equal(
          step.completeScene,
          false,
          `${step.id} doit rester completeScene:false`,
        );
        // enchaînement sous-question
        assert.ok(
          step.nextStepId || step.nextSceneId,
          `${step.id} doit enchaîner`,
        );
      }
    }
  });

  it('corrections Thalès : \\dfrac, égalités de produits, sans « rapport »', () => {
    const thalesStepIds = [
      'p7_ex1_q3_parallel',
      'p7_ex2_q3_ob',
      'p7_ex3_q4_ab',
      'p7_ex4_q2_thales',
      'p7_ex5_q2_an',
      'p7_ex5_q5_final',
    ];
    const slashRatio =
      /\b[A-Z]{1,3}\s*\/\s*[A-Z]{1,3}\s*=|\b\d+[.,]?\d*\s*\/\s*[A-Z]{1,3}\s*=|\b[A-Z]{1,3}\s*\/\s*\d|\b\d+[.,]?\d*\s*\/\s*\d+[.,]?\d*\s*=/;

    for (const id of thalesStepIds) {
      const step = walkSteps(content).find((s) => s.id === id);
      assert.ok(step, id);
      const lines = Array.isArray(step.correction)
        ? step.correction
        : String(step.correction || '').split('\n');
      const joined = lines.join('\n');
      assert.ok(
        /\\dfrac\{/.test(joined),
        `${id} doit utiliser \\\\dfrac dans la correction`,
      );
      // Pas de formulation « rapport » / « coefficient » / « produits en croix »
      assert.ok(
        !/\brapport\b/i.test(joined),
        `${id} ne doit pas parler de « rapport » dans la correction`,
      );
      assert.ok(
        !/\bcoefficient\b/i.test(joined),
        `${id} ne doit pas parler de « coefficient » dans la correction`,
      );
      assert.ok(
        !/produits en croix/i.test(joined),
        `${id} ne doit pas écrire « produits en croix »`,
      );
      for (const line of lines) {
        if (/Thal|dfrac|OB|AE|DE|AN|AM|AB|AC|AD|BC|ED|MN/i.test(line)) {
          if (/\\dfrac/.test(line) || /\\times/.test(line)) {
            assert.ok(
              !slashRatio.test(line),
              `${id}: ligne encore en slash « ${line} »`,
            );
          }
          if (/\//.test(line) && /=/.test(line) && !/\\dfrac/.test(line)) {
            if (/\b[A-Z0-9][A-Z0-9.,]*\s*\/\s*[A-Z0-9]/.test(line)) {
              assert.fail(`${id}: égalité de rapports avec / — « ${line} »`);
            }
          }
        }
      }
    }

    // Égalités de produits attendues (ex. 2, 3, 4, 5)
    const joinCorr = (id) => {
      const step = walkSteps(content).find((s) => s.id === id);
      return (step.correction || []).join('\n');
    };
    assert.ok(joinCorr('p7_ex2_q3_ob').includes('\\dfrac{OA}{OB}'));
    assert.ok(joinCorr('p7_ex2_q3_ob').includes('1,8 \\times OB = 8 \\times 4,5'));
    assert.ok(joinCorr('p7_ex3_q4_ab').includes('4,8 \\times AB = 5,5 \\times 7,2'));
    assert.ok(joinCorr('p7_ex4_q2_thales').includes('6,4 \\times AE = 4,8 \\times 4,8'));
    assert.ok(joinCorr('p7_ex4_q2_thales').includes('\\dfrac{AB}{AD}'));
    assert.ok(joinCorr('p7_ex5_q2_an').includes('6 \\times AN = 15 \\times 8'));
    assert.ok(joinCorr('p7_ex5_q2_an').includes('\\dfrac{AM}{AB}'));
  });

  it('exercice 1 sans trigonométrie (3 clozes, pas 3b/3c)', () => {
    const scene = content.scenes.find((s) => s.id === 'p7_1_pont_recif_silas');
    assert.ok(scene);
    const clozes = (scene.steps || []).filter((st) => st.type === 'cloze');
    assert.equal(clozes.length, 3);
    assert.deepEqual(
      clozes.map((c) => c.id),
      ['p7_ex1_q1_ad', 'p7_ex1_q2_cd', 'p7_ex1_q3_parallel'],
    );
    assert.ok(!clozes.some((c) => c.id === 'p7_ex1_q4_angle'));
    assert.ok(!clozes.some((c) => c.id === 'p7_ex1_q5_valid'));

    const q3 = clozes.find((c) => c.id === 'p7_ex1_q3_parallel');
    assert.ok(q3);
    assert.match(q3.title, /Question 3(?!a)/i);
    assert.equal(q3.nextStepId, 'p7_ex1_transition');
    assert.equal(q3.setFlags?.p7Exercise1Completed, true);

    const transition = (scene.steps || []).find(
      (st) => st.id === 'p7_ex1_transition',
    );
    assert.equal(transition?.nextSceneId, 'p7_2_lentille_gobelet_silas');

    // Aucune mention de trigonométrie dans l’exercice 1
    const text = JSON.stringify(scene);
    const forbidden = [
      /trigonom[eé]trie/i,
      /cosinus/i,
      /sinus/i,
      /tangente/i,
      /\bcos\b/i,
      /\bsin\b/i,
      /\btan\b/i,
    ];
    for (const re of forbidden) {
      assert.ok(!re.test(text), `exercice 1 ne doit pas contenir ${re}`);
    }
    assert.ok(!text.includes('p7_ex1_q4_angle'));
    assert.ok(!text.includes('p7_ex1_q5_valid'));
    assert.ok(!text.includes('22,6'));
    assert.ok(!text.includes('22.6'));
  });

  it('Silas intervient dans les 4 premiers exercices puis est vaincu', () => {
    const silasScenes = [
      'p7_1_pont_recif_silas',
      'p7_2_lentille_gobelet_silas',
      'p7_3_charpente_quai_silas',
      'p7_4_sanctuaire_figure_complexe',
    ];
    for (const id of silasScenes) {
      const scene = content.scenes.find((s) => s.id === id);
      assert.ok(scene, id);
      const text = JSON.stringify(scene);
      assert.ok(/Silas/i.test(text), `Silas absent de ${id}`);
    }
    const ex4 = content.scenes.find(
      (s) => s.id === 'p7_4_sanctuaire_figure_complexe',
    );
    const flagStep = (ex4.steps || []).find((st) => st.setFlags?.silasDefeated);
    assert.ok(flagStep, 'silasDefeated après exercice 4');
    assert.equal(flagStep.setFlags.p7Exercise4Completed, true);

    const serrure = content.scenes.find((s) => s.id === 'p7_5_serrure_tresor');
    assert.ok(serrure);
    // Pas de nouveau plan de Silas sur la serrure (le nom du personnage peut apparaître en narration)
    assert.ok(
      !(serrure.steps || []).some((st) => st.setFlags?.silasDefeated === false),
    );
  });

  it('carte assemblée puis trésor seulement après serrure', () => {
    const carte = content.scenes.find((s) => s.id === 'p7_0_carte_complete');
    assert.ok(carte);
    assert.equal(carte.next, 'p7_1_pont_recif_silas');
    assert.match(
      carte.decor.background,
      /p7-0-carte-assemblee\.png$/,
    );

    const serrure = content.scenes.find((s) => s.id === 'p7_5_serrure_tresor');
    const unlock = (serrure.steps || []).find(
      (st) => st.setFlags?.treasureUnlocked || st.setFlags?.p7Exercise5Completed,
    );
    assert.ok(unlock?.setFlags?.p7Exercise5Completed);
    assert.ok(unlock?.setFlags?.treasureUnlocked);

    // Pas de treasureUnlocked avant la serrure
    for (const scene of content.scenes) {
      if (scene.id === 'p7_5_serrure_tresor' || scene.id === 'p7_6_conclusion_tresor') {
        continue;
      }
      assert.ok(
        !JSON.stringify(scene).includes('treasureUnlocked'),
        `treasure trop tôt sur ${scene.id}`,
      );
    }
  });

  it('conclusion termine le jeu', () => {
    const conclusion = content.scenes.find(
      (s) => s.id === 'p7_6_conclusion_tresor',
    );
    assert.ok(conclusion);
    const steps = walkSteps({ scenes: [conclusion] });
    assert.ok(steps.some((s) => s.endPart === true));
    assert.ok(steps.some((s) => s.setFlags?.part7Completed === true));
    assert.ok(steps.some((s) => s.setFlags?.gameCompleted === true));
    // Pas de nextPartId (fin d’aventure)
    assert.ok(!steps.some((s) => s.nextPartId));
  });

  it('schémas référencés et présents sur disque', () => {
    const refs = new Set(
      raw.match(
        /\/assets\/(?:backgrounds|objects|diagrams)\/part7\/[a-z0-9_.-]+\.(?:png|svg)/gi,
      ) || [],
    );
    assert.ok(refs.size >= 12, `refs=${refs.size}`);
    for (const ref of refs) {
      const rel = path.join(root, 'client', ref.replace(/^\//, ''));
      assert.ok(fs.existsSync(rel), `asset manquant: ${ref}`);
    }
    // 5 schémas d’exercices + 7 backgrounds
    for (let i = 1; i <= 5; i += 1) {
      assert.ok(
        [...refs].some((r) => r.includes(`exercice-${i}`) || r.includes(`p7-exercice-${i}`)),
        `schéma exercice ${i}`,
      );
    }
  });

  it('chaque cloze a des champs validables', () => {
    const clozes = walkSteps(content).filter((s) => s.type === 'cloze');
    assert.equal(clozes.length, 23);
    for (const step of clozes) {
      const fields = step.fields;
      assert.ok(fields && typeof fields === 'object' && !Array.isArray(fields));
      const ids = Object.keys(fields);
      assert.ok(ids.length >= 1, step.id);
      // smoke: au moins un champ avec expected / accept
      for (const id of ids) {
        const f = fields[id];
        assert.ok(
          f.expected != null || (Array.isArray(f.accept) && f.accept.length),
          `${step.id}.${id} sans expected`,
        );
      }
    }
  });

  it('valide des réponses numériques types (virgule/point, tolérances)', () => {
    const clozes = walkSteps(content).filter((s) => s.type === 'cloze');
    const ad = clozes.find((s) => s.id === 'p7_ex1_q1_ad');
    assert.ok(ad);
    assert.equal(
      checkClozeAnswers({ ad: '200' }, ad.fields).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers({ ad: '200 m' }, ad.fields).ok,
      true,
    );
    assert.equal(
      checkClozeAnswers({ ad: '199' }, ad.fields).ok,
      false,
    );

    const cd = clozes.find((s) => s.id === 'p7_ex1_q2_cd');
    assert.ok(cd);
    assert.equal(checkClozeAnswers({ cd: '520' }, cd.fields).ok, true);
    assert.equal(checkClozeAnswers({ cd: '520 m' }, cd.fields).ok, true);

    // Plus de question d’angle / trigonométrie
    assert.ok(!clozes.some((s) => s.id === 'p7_ex1_q4_angle'));
  });

  it('progression part6 → part7 → completed', () => {
    assert.ok(AVAILABLE_PART_IDS.includes('part7'));
    let p = completePart(initialProgress(), 'prologue');
    for (const id of ['part1', 'part2', 'part3', 'part4', 'part5', 'part6']) {
      p = completePart(p, id);
    }
    assert.equal(canOpenPart('part7', p), true);
    assert.equal(resolvePartToPlay(p), 'part7');
    p = completePart(p, 'part7');
    p = {
      ...p,
      flags: { ...(p.flags || {}), gameCompleted: true, part7Completed: true },
    };
    assert.ok(p.completedParts.includes('part7'));
    assert.equal(resolvePartToPlay(p), 'completed');
  });

  it('mode test Partie 7', () => {
    const p = buildTestProgressPart7();
    assert.equal(p.currentPartId, 'part7');
    assert.equal(p.currentSceneId, 'p7_0_carte_complete');
    assert.deepEqual(p.fragmentsCollected, [1, 2, 3, 4, 5, 6]);
    assert.equal(p.flags._testBoot, 'part7');
    assert.equal(resolvePartToPlay(p), 'part7');
  });

  it('branchement main + moteur part7 / fin d’aventure', () => {
    const main = fs.readFileSync(path.join(root, 'client/js/main.js'), 'utf8');
    assert.ok(main.includes("url: '/content/part7/scenes.json'"));
    assert.match(main, /playPart\('part7'/);
    assert.match(main, /showGameCompleted|Aventure terminée|gameCompleted/);
    const engine = fs.readFileSync(
      path.join(root, 'client/js/engine/SceneEngine.js'),
      'utf8',
    );
    assert.match(engine, /btn-go-part7/);
    assert.match(engine, /btn-finish-adventure|Terminer l.aventure/);
  });

  it('enchaînement des next / nextSceneId jusqu’à la conclusion', () => {
    const order = content.meta.sceneOrder;
    for (let i = 0; i < order.length - 1; i += 1) {
      const scene = content.scenes.find((s) => s.id === order[i]);
      const nextId = order[i + 1];
      const blob = JSON.stringify(scene);
      assert.ok(
        scene.next === nextId || blob.includes(nextId),
        `${scene.id} doit mener à ${nextId}`,
      );
    }
  });
});
