import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePseudo,
  cleanPseudoDisplay,
  toCanonicalPseudo,
} from '../shared/pseudo.js';

describe('normalisation du pseudo', () => {
  it('supprime les espaces en début et fin', () => {
    assert.equal(cleanPseudoDisplay('  Léo  '), 'Léo');
  });

  it('réduit les espaces multiples à un seul', () => {
    assert.equal(cleanPseudoDisplay('Capitaine   Léo'), 'Capitaine Léo');
  });

  it('forme canonique en minuscules (fr)', () => {
    assert.equal(toCanonicalPseudo('Élève-A'), 'élève-a');
    assert.equal(toCanonicalPseudo('  MARIE  '), 'marie');
  });
});

describe('validation du pseudo', () => {
  it('accepte un pseudo valide avec accents et tirets', () => {
    const r = validatePseudo('Élève_3-A');
    assert.equal(r.ok, true);
    assert.equal(r.display, 'Élève_3-A');
    assert.equal(r.canonical, 'élève_3-a');
  });

  it('accepte espaces internes après normalisation', () => {
    const r = validatePseudo('  Jean  Paul  ');
    assert.equal(r.ok, true);
    assert.equal(r.display, 'Jean Paul');
    assert.equal(r.canonical, 'jean paul');
  });

  it('refuse un pseudo trop court', () => {
    const r = validatePseudo('ab');
    assert.equal(r.ok, false);
    assert.match(r.error, /au moins 3/i);
  });

  it('refuse un pseudo trop long', () => {
    const r = validatePseudo('a'.repeat(25));
    assert.equal(r.ok, false);
    assert.match(r.error, /24/i);
  });

  it('refuse les caractères spéciaux interdits', () => {
    const r = validatePseudo('Leo@mail');
    assert.equal(r.ok, false);
  });

  it('refuse une chaîne vide', () => {
    const r = validatePseudo('   ');
    assert.equal(r.ok, false);
  });

  it('même canonical pour casse différente', () => {
    const a = validatePseudo('Nérée');
    const b = validatePseudo('nérée');
    assert.equal(a.ok && b.ok, true);
    assert.equal(a.canonical, b.canonical);
    assert.notEqual(a.display, b.display);
  });
});
