import fs from 'fs';

const p = 'client/content/part1/scenes.json';
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
const fin = c.scenes.find((s) => s.id === 'p1_7_finale');

for (const h of fin.hotspots) {
  if (h.id === 'opt_empreintes_p7') {
    delete h.silasClue;
    h.optional = true;
    h.advancesStory = false;
    h.repeatable = true;
  }
  if (h.id === 'silas_traces') {
    delete h.silasClue;
    h.optional = true;
    h.advancesStory = false;
    h.repeatable = true;
    h.required = false;
  }
  if (h.id === 'silas_passage') {
    delete h.requiresSilasClues;
    delete h.visibleWhen;
    h.required = true;
    h.repeatable = true;
    h.advancesStory = true;
  }
}

fin.stagePrompts = fin.stagePrompts || {};
fin.stagePrompts.silas = 'Examinez les deux indices laissés dans la grotte.';
fin.stagePrompts.silasPartial =
  "Examinez encore l'autre indice avant de poursuivre.";
fin.stagePrompts.silasUnlocked =
  'Touchez le passage du récif pour poursuivre l’aventure.';

fs.writeFileSync(p, JSON.stringify(c, null, 2) + '\n');
console.log(
  fin.hotspots
    .filter((h) => (h.stages || []).includes('silas'))
    .map((h) => ({
      id: h.id,
      hasVis: Boolean(h.visibleWhen),
      hasReq: Boolean(h.requiresSilasClues),
      hasClue: Boolean(h.silasClue),
      endPart: h.sequence?.some((s) => s.endPart),
    })),
);
