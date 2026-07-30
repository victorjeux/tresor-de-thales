import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const objectsDir = path.join(root, 'client', 'assets', 'objects');
const portraitsDir = path.join(root, 'client', 'assets', 'portraits');
const prologuePath = path.join(
  root,
  'client',
  'content',
  'prologue',
  'scenes.json',
);

/**
 * Lecture minimale d'un PNG : largeur, hauteur, type de couleur (IHDR).
 * colorType 4 = greyscale+alpha, 6 = RGBA.
 */
function readPngHeader(filePath) {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `Pas un PNG: ${filePath}`);
  // IHDR est le premier chunk
  const length = buf.readUInt32BE(8);
  const type = buf.toString('ascii', 12, 16);
  assert.equal(type, 'IHDR');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  return { width, height, colorType, hasAlpha: colorType === 4 || colorType === 6 };
}

describe('objets PNG transparents', () => {
  const required = [
    'caisse-fruits.png',
    'compas-brise.png',
    'coffre.png',
    'lettre-thales.png',
    'fragments-carte.png',
    'longue-vue.png',
    'carnet-euclide.png',
  ];

  for (const name of required) {
    it(`${name} possède un canal alpha (RGBA/greyscale+alpha)`, () => {
      const p = path.join(objectsDir, name);
      assert.ok(fs.existsSync(p), `fichier manquant: ${name}`);
      const info = readPngHeader(p);
      assert.ok(
        info.hasAlpha,
        `${name} colorType=${info.colorType} (attendu 4 ou 6 pour alpha)`,
      );
      assert.ok(info.width > 100 && info.height > 100);
    });
  }

  it('aucun objet n’est un JPEG déguisé ni sans en-tête PNG', () => {
    for (const name of required) {
      const buf = fs.readFileSync(path.join(objectsDir, name));
      assert.deepEqual(
        [...buf.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10],
      );
    }
  });
});

describe('assets partie 1', () => {
  const part1Bg = path.join(root, 'client', 'assets', 'backgrounds', 'part1');
  const part1Obj = path.join(root, 'client', 'assets', 'objects', 'part1');
  const part1Objects = [
    'carte-recif.png',
    'carnet-euclide-ouvert.png',
    'dalle-carree-gravee.png',
    'balise-rouge.png',
    'balise-verte.png',
    'balises-nautiques.png',
    'fragment-carte-1.png',
    'indice-silas.png',
  ];

  it('décor récif part1 présent', () => {
    const p = path.join(part1Bg, 'recif-angles-droits.png');
    assert.ok(fs.existsSync(p));
  });

  for (const name of part1Objects) {
    it(`objet part1 ${name} existe avec canal alpha`, () => {
      const p = path.join(part1Obj, name);
      assert.ok(fs.existsSync(p), name);
      const info = readPngHeader(p);
      assert.ok(info.hasAlpha, name);
    });
  }
});

describe('portraits de dialogue (fichiers officiels, sans recadrage planche)', () => {
  const names = [
    'alizee.png',
    'neree.png',
    'euclide.png',
    'silas.png',
    'maki.png',
  ];

  for (const name of names) {
    it(`${name} est un PNG carré avec canal alpha`, () => {
      const p = path.join(portraitsDir, name);
      assert.ok(fs.existsSync(p), `manquant: ${name}`);
      const info = readPngHeader(p);
      assert.equal(info.width, info.height, 'doit être carré');
      assert.ok(info.hasAlpha, `${name} doit avoir un canal alpha`);
      assert.ok(info.width >= 200, `portrait trop petit: ${info.width}`);
      // Portraits fournis (visage/épaules), pas des planches multi-vues allongées
      assert.equal(info.width, info.height);
    });
  }
});

describe('coordonnées des hotspots (prologue)', () => {
  const content = JSON.parse(fs.readFileSync(prologuePath, 'utf8'));

  function assertHotspot(sceneId, hotspotId, expected) {
    const scene = content.scenes.find((s) => s.id === sceneId);
    assert.ok(scene, sceneId);
    const h = scene.hotspots.find((x) => x.id === hotspotId);
    assert.ok(h, `${sceneId}/${hotspotId}`);
    for (const [key, val] of Object.entries(expected)) {
      if (typeof val === 'number') {
        assert.ok(
          Math.abs(h[key] - val) <= 3,
          `${sceneId}/${hotspotId}.${key}=${h[key]} attendu ~${val}`,
        );
      } else {
        assert.equal(h[key], val, `${sceneId}/${hotspotId}.${key}`);
      }
    }
  }

  it('P2 — zones alignées sur le décor (pas de second compas PNG)', () => {
    assertHotspot('p2_pont', 'barre', { x: 14, y: 48, inDecor: true });
    assertHotspot('p2_pont', 'corde', { x: 52, y: 48, inDecor: true });
    assertHotspot('p2_pont', 'traces', { x: 54, y: 72, inDecor: true });
    assertHotspot('p2_pont', 'compas', { x: 72, y: 80, inDecor: true });
    assertHotspot('p2_pont', 'porte', { x: 76, y: 36, inDecor: true });
    const compas = content.scenes
      .find((s) => s.id === 'p2_pont')
      .hotspots.find((h) => h.id === 'compas');
    assert.equal(compas.image, undefined);
  });

  it('P3 — portrait, cartes, livre, coffre sur le décor existant', () => {
    assertHotspot('p3_cabine', 'portrait', { x: 58, y: 22, inDecor: true });
    assertHotspot('p3_cabine', 'cartes', { x: 38, y: 52, inDecor: true });
    assertHotspot('p3_cabine', 'livre', { x: 43, y: 54, inDecor: true });
    assertHotspot('p3_cabine', 'coffre', { x: 58, y: 46, inDecor: true });
    const coffre = content.scenes
      .find((s) => s.id === 'p3_cabine')
      .hotspots.find((h) => h.id === 'coffre');
    assert.equal(coffre.image, undefined);
  });

  it('tous les hotspots ont des coords dans [0,100]', () => {
    for (const scene of content.scenes) {
      for (const h of scene.hotspots || []) {
        for (const k of ['x', 'y', 'w', 'h']) {
          if (h[k] == null) continue;
          assert.ok(h[k] >= 0 && h[k] <= 100, `${scene.id}/${h.id}.${k}`);
        }
      }
    }
  });

  it('les objets déjà dans le décor sont marqués inDecor (pas de double PNG)', () => {
    const mustBeInDecor = [
      ['p0_port', 'caisse'],
      ['p2_pont', 'compas'],
      ['p3_cabine', 'coffre'],
      ['p5_serment', 'carte'],
    ];
    for (const [sid, hid] of mustBeInDecor) {
      const h = content.scenes
        .find((s) => s.id === sid)
        .hotspots.find((x) => x.id === hid);
      assert.equal(h.inDecor, true, `${sid}/${hid}`);
      assert.ok(!h.image, `${sid}/${hid} ne doit pas superposer un PNG`);
    }
  });
});
