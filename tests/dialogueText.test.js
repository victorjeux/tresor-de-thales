import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyDialogueVars } from '../shared/dialogueText.js';

describe('variables de dialogue', () => {
  it('insère le pseudo via {{playerName}}', () => {
    const s = applyDialogueVars(
      'Alors c’est décidé. {{playerName}}, Maki et moi partirons.',
      { playerName: 'Léo' },
    );
    assert.equal(s, 'Alors c’est décidé. Léo, Maki et moi partirons.');
  });

  it('gère plusieurs occurrences', () => {
    const s = applyDialogueVars('{{playerName}} et {{playerName}}', {
      playerName: 'Aya',
    });
    assert.equal(s, 'Aya et Aya');
  });

  it('utilise un défaut si pseudo absent', () => {
    const s = applyDialogueVars('Bonjour {{playerName}}');
    assert.equal(s, 'Bonjour Aventurier');
  });
});
