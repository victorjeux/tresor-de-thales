import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { checkRadicalAnswer } from '../shared/radicalAnswer.js';
import { getVisualStage, setVisualStage } from '../shared/visualStage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const scenesPath = path.join(root, 'client', 'content', 'part1', 'scenes.json');
const content = JSON.parse(fs.readFileSync(scenesPath, 'utf8'));
const raw = fs.readFileSync(scenesPath, 'utf8');
const byId = (id) => content.scenes.find((s) => s.id === id);

function readPngAlphaCorners(filePath) {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  let offset = 8;
  const idat = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    offset += 12 + len;
  }
  const rawInflated = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : colorType === 4 ? 2 : 3;
  assert.ok(colorType === 4 || colorType === 6, `alpha required ${filePath}`);
  const stride = 1 + width * bpp;
  const alphaAt = (x, y) => {
    const row = y * stride;
    return rawInflated[row + 1 + x * bpp + (bpp === 4 ? 3 : 1)];
  };
  return {
    width,
    height,
    colorType,
    corners: {
      tl: alphaAt(0, 0),
      tr: alphaAt(width - 1, 0),
      bl: alphaAt(0, height - 1),
      br: alphaAt(width - 1, height - 1),
    },
  };
}

describe('pack2 — alpha Nérée et îlot', () => {
  for (const name of ['neree-carte-recif.png', 'ile-dallage-recif.png']) {
    it(`${name} : coins alpha = 0 et présence`, () => {
      const p = path.join(root, 'client', 'assets', 'objects', 'part1', name);
      assert.ok(fs.existsSync(p), name);
      const info = readPngAlphaCorners(p);
      assert.equal(info.corners.tl, 0, 'tl');
      assert.equal(info.corners.tr, 0, 'tr');
      assert.equal(info.corners.bl, 0, 'bl');
      assert.equal(info.corners.br, 0, 'br');
    });
  }
});

describe('pack2 — p1_0 ancrage Nérée / îlot', () => {
  const s = byId('p1_0_arrivee');
  const neree = s.decor.objects.find((o) => o.image.includes('neree-carte'));
  const ile = s.decor.objects.find((o) => o.image.includes('ile-dallage'));

  it('Nérée ancrée bas, plus grande que l’îlot', () => {
    assert.ok(neree.grounded || neree.anchor === 'bottom');
    assert.ok(ile.grounded || ile.anchor === 'bottom');
    assert.ok(neree.h > ile.h, 'Nérée plus haute');
    assert.ok(neree.w > ile.w, 'Nérée plus large');
    assert.ok(neree.y >= 80, 'pieds bas sur le pont');
    assert.ok(ile.y < neree.y, 'îlot plus haut (dans la mer)');
  });
});

describe('pack2 — hotspots balises', () => {
  it('balise rouge p1_4 sur la grande balise droite', () => {
    const h = byId('p1_4_hypotenuse').hotspots.find((x) => x.required);
    assert.equal(h.label, 'Balise rouge');
    assert.ok(h.x >= 80 && h.x <= 95);
    assert.ok(h.h >= 20);
  });

  it('balise verte p1_5 sur la balise verte du rocher', () => {
    const h = byId('p1_5_cote').hotspots.find((x) => x.required);
    assert.equal(h.label, 'Balise verte');
    assert.ok(h.x >= 60 && h.x <= 75);
  });

  it('p1_6 : quatre balises distinctes (queueMember), pas une zone d’eau', () => {
    const hs = byId('p1_6_entrainement').hotspots.filter((h) => h.queueMember);
    assert.equal(hs.length, 4);
    for (const h of hs) {
      assert.ok(h.w <= 15, h.id);
      assert.ok(h.h <= 40, h.id);
    }
  });
});

describe('pack2 — facultatifs', () => {
  it('ponton branlant remplace la bouée', () => {
    assert.ok(!raw.includes('Bouée de balisage'));
    assert.ok(!raw.includes('Une bouée qui flotte'));
    assert.match(raw, /Ponton branlant/);
    assert.match(raw, /décision courageuse prise avec le bateau/);
  });

  it('balise des cartographes remplace le goéland', () => {
    assert.ok(!raw.includes('Goéland sur le mât'));
    assert.match(raw, /Ancienne balise des cartographes/);
    assert.match(raw, /premiers cartographes de Thalès/);
  });
});

describe('pack2 — balise C correction', () => {
  it('contient ST² = 289 − 64', () => {
    assert.match(raw, /ST² = 289 − 64|ST² = 289 - 64/);
    const train = byId('p1_6_entrainement');
    const c = train.exerciseQueue.exercises.p1_train_3;
    assert.match(c.correction, /289 = 64 \+ ST²/);
    assert.match(c.correction, /ST² = 289 − 64/);
    assert.match(c.correction, /ST² = 225/);
    assert.match(c.correction, /√225 = 15|\\sqrt\{225\} = 15/);
  });
});

describe('pack2 — exercices illustrations', () => {
  const fin = byId('p1_7_finale');
  const allEx = fin.hotspots.flatMap((h) =>
    (h.sequence || []).filter((s) => s.type === 'exercise'),
  );
  const a = allEx.find((e) => e.id === 'p1_final_route_a');
  const b = allEx.find((e) => e.id === 'p1_final_route_b');
  const m = allEx.find((e) => e.id === 'p1_final_monte_charge');

  it('libellés a/b et illustrationPrimary sans doublon', () => {
    assert.equal(a.answerLabel, 'Votre réponse à la question a');
    assert.equal(b.answerLabel, 'Votre réponse à la question b');
    assert.equal(a.illustrationPrimary, true);
    assert.equal(b.illustrationPrimary, true);
    assert.equal(m.illustrationPrimary, true);
    assert.equal(m.answerLabel, 'Votre réponse');
  });

  it('route a/b sans setVisualStage interieur sur a ; b → interieur', () => {
    assert.ok(!a.setVisualStage);
    assert.equal(b.setVisualStage, 'interieur');
    assert.equal(m.setVisualStage, 'fragment');
  });

  it('question b : radical √182,25, refuse 13,5, pas de fractions', () => {
    assert.equal(b.answerType, 'radical');
    assert.equal(b.expectedRadicand, 182.25);
    assert.equal(checkRadicalAnswer('√182,25', 182.25).ok, true);
    assert.equal(checkRadicalAnswer('13,5', 182.25).ok, false);
    for (const h of b.hints) {
      assert.ok(!/153\/4|729\/4|27\/2|\b6,2\b/.test(h.text), h.text);
    }
    assert.ok(!/153\/4|729\/4|27\/2|13,5 cm/.test(b.correction));
    assert.match(b.correction, /√182,25/);
  });

  it('stades : hotspots filtrés', () => {
    for (const h of fin.hotspots) {
      assert.ok(Array.isArray(h.stages) && h.stages.length >= 1, h.id);
    }
    assert.deepEqual(
      fin.hotspots.find((h) => h.id === 'passage').stages,
      ['exterieur'],
    );
    assert.deepEqual(
      fin.hotspots.find((h) => h.id === 'monte_zone').stages,
      ['interieur'],
    );
    assert.deepEqual(
      fin.hotspots.find((h) => h.id === 'fragment_1').stages,
      ['fragment'],
    );
    assert.ok(
      fin.hotspots.find((h) => h.id === 'opt_empreintes_p7').stages.includes('silas'),
    );
  });

  it('fragment : zoom + 2 dialogues Alizée + board', () => {
    const frag = fin.hotspots.find((h) => h.id === 'fragment_1');
    const types = frag.sequence.map((s) => s.type);
    assert.ok(types.includes('fragmentZoom'));
    assert.ok(types.includes('fragmentBoard'));
    const dlgs = frag.sequence.filter((s) => s.type === 'dialogue');
    assert.equal(dlgs.length, 2);
    assert.match(dlgs[0].lines[0].text, /premier fragment de la carte de Thalès/);
    assert.match(dlgs[1].lines[0].text, /six fragments/);
    assert.equal(dlgs[1].setVisualStage, 'silas');
  });

  it('persistance stade : a/b restent exterieur jusqu’à fin de b', () => {
    let p = {};
    p = setVisualStage(p, 'p1_7_finale', 'exterieur');
    assert.equal(getVisualStage(p, 'p1_7_finale'), 'exterieur');
    // après b
    p = setVisualStage(p, 'p1_7_finale', 'interieur');
    assert.equal(getVisualStage(p, 'p1_7_finale'), 'interieur');
  });
});

describe('pack2 — assets exercices présents', () => {
  it('route et monte-charge PNG', () => {
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          'client/assets/exercises/part1/exercice-route-interieure.png',
        ),
      ),
    );
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          'client/assets/exercises/part1/exercice-monte-charge.png',
        ),
      ),
    );
  });
});

describe('pack2 — moteur stades / fragment', () => {
  const engine = fs.readFileSync(
    path.join(root, 'client/js/engine/SceneEngine.js'),
    'utf8',
  );
  it('filtre hotspots par stade et reconstruit le DOM', () => {
    assert.match(engine, /hotspotAllowedForStage/);
    assert.match(engine, /playFragmentZoom/);
    assert.match(engine, /playFragmentBoard/);
    assert.match(engine, /registerFragment/);
    assert.match(engine, /checkRadicalAnswer/);
    assert.match(engine, /illustrationPrimary/);
  });
});
