import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

describe('écran d’accueil — fond titre', () => {
  it('asset ecran-titre présent sous client/assets', () => {
    const p = path.join(
      root,
      'client',
      'assets',
      'backgrounds',
      'ecran-titre-tresor-thales-personnages.png',
    );
    assert.ok(fs.existsSync(p), p);
    assert.ok(fs.statSync(p).size > 10000);
  });

  it('CSS applique cover sur .screen-title', () => {
    const css = fs.readFileSync(
      path.join(root, 'client/css/theme-carnet.css'),
      'utf8',
    );
    assert.match(css, /\.screen\.screen-title/);
    assert.match(css, /ecran-titre-tresor-thales-personnages\.png/);
    assert.match(css, /background-size:\s*cover/);
  });

  it('showWelcome utilise screen-title et le panneau central', () => {
    const src = fs.readFileSync(
      path.join(root, 'client/js/ui/screens.js'),
      'utf8',
    );
    assert.match(src, /screen-title/);
    assert.match(src, /card-title-panel/);
    assert.match(src, /Le Trésor de Thalès/);
  });
});
