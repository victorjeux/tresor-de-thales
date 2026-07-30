import fs from 'fs';

// —— Part1 scenes ——
const p1path = 'client/content/part1/scenes.json';
const p1 = JSON.parse(fs.readFileSync(p1path, 'utf8'));

// 1. Silas : décalage + feu de camp
const fin = p1.scenes.find((s) => s.id === 'p1_7_finale');
const silas = fin.decor.stages.silas;

// Objet feu de camp bas-droite
const campObj = {
  image: '/assets/objects/part1/ancien-feu-de-camp-indice.png',
  alt: 'Ancien feu de camp éteint, pierres noircies',
  x: 82,
  y: 86,
  w: 16,
  h: 16,
  z: 3,
  grounded: true,
  anchor: 'bottom',
};
// Conserver l’indice-silas à gauche, ajouter le feu
silas.objects = silas.objects || [];
// Ne pas dupliquer le feu
if (!silas.objects.some((o) => String(o.image).includes('feu-de-camp'))) {
  silas.objects.push(campObj);
}

// Passage : un peu plus haut/centre, boîte réduite (moins de chevauchement)
const pass = fin.hotspots.find((h) => h.id === 'silas_passage');
Object.assign(pass, {
  x: 46,
  y: 40,
  w: 16,
  h: 16,
  label: 'Passage du récif',
});

// Traces → feu de camp bas-droite (ex-zone qui chevauchait le passage)
const tr = fin.hotspots.find((h) => h.id === 'silas_traces');
Object.assign(tr, {
  id: 'silas_traces',
  label: 'Ancien feu de camp',
  x: 82,
  y: 80,
  w: 14,
  h: 14,
  silasDiscovery: true,
  optional: true,
  advancesStory: false,
  repeatable: true,
  lines: [
    {
      speaker: 'Alizée',
      text: 'Les pierres sont noircies, mais les braises sont froides depuis longtemps. Silas a dû attendre ici, à l’abri du vent, avant de disparaître vers le passage du récif.',
    },
  ],
});

// Empreintes : légèrement plus bas-gauche pour coller à l’objet indice
const emp = fin.hotspots.find((h) => h.id === 'opt_empreintes_p7');
Object.assign(emp, { x: 26, y: 74, w: 12, h: 12 });

// 3. Boussole — phrase restaurée + position sur le cadran gauche
const p2 = p1.scenes.find((s) => s.id === 'p1_2_cours');
const boussole = p2.hotspots.find((h) => h.id === 'opt_boussole_p2');
Object.assign(boussole, {
  label: 'Boussole de Nérée',
  x: 18,
  y: 60,
  w: 12,
  h: 14,
  optional: true,
  advancesStory: false,
  repeatable: true,
  inDecor: true,
  lines: [
    {
      speaker: 'Alizée',
      text: 'La boussole préférée du capitaine Nérée, ramenée de Madagascar. Son aiguille tremble près du carnet, comme si elle reconnaissait la route du théorème.',
    },
  ],
});

// 2. Notation [AB] pour côtés / hypoténuses (pas les mesures AB = …)
function fixSegmentNotation(str) {
  if (typeof str !== 'string') return str;
  let s = str;

  // Options / libellés QCM : "Le côté XY" → "Le côté [XY]"
  s = s.replace(/\bLe côté ([A-Z]{2,3})\b/g, 'Le côté [$1]');
  s = s.replace(/\ble côté ([A-Z]{2,3})\b/g, 'le côté [$1]');
  s = s.replace(/\bdu côté ([A-Z]{2,3})\b/g, 'du côté [$1]');
  s = s.replace(/\bau côté ([A-Z]{2,3})\b/g, 'au côté [$1]');
  s = s.replace(/\bsur le côté ([A-Z]{2,3})\b/g, 'sur le côté [$1]');

  // "l’hypoténuse XY" / "hypoténuse XY"
  s = s.replace(/\bl[’']hypoténuse ([A-Z]{2,3})\b/g, "l’hypoténuse [$1]");
  s = s.replace(/\bL[’']hypoténuse ([A-Z]{2,3})\b/g, "L’hypoténuse [$1]");
  s = s.replace(/\bhypoténuse ([A-Z]{2,3})\b/g, 'hypoténuse [$1]');
  s = s.replace(/\bHypoténuse ([A-Z]{2,3})\b/g, 'Hypoténuse [$1]');

  // "l’hypoténuse est le côté opposé … : BC" → ": [BC]"
  s = s.replace(
    /(hypoténuse[^.：:]*[:：]\s*)([A-Z]{2,3})\b/g,
    '$1[$2]',
  );
  s = s.replace(
    /(opposé[e]? à l[’']angle droit\s*:\s*)([A-Z]{2,3})\b/g,
    '$1[$2]',
  );

  // Options courtes dans QCM d’identification : "BC" / "AB" / "AC" seuls
  // Uniquement si la chaîne entière est un segment de 2 lettres (options)
  if (/^[A-Z]{2}$/.test(s.trim())) {
    s = `[${s.trim()}]`;
  }

  // "longueur de l’hypoténuse EF" déjà couvert
  // "est l’hypoténuse." with named side in options handled above

  // Éviter doubles crochets
  s = s.replace(/\[\[([A-Z]{2,3})\]\]/g, '[$1]');

  return s;
}

function walkFix(node, keyPath = '') {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n, i) => walkFix(n, `${keyPath}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string') {
      // Ne pas toucher aux formules math / ids / chemins
      if (
        k === 'math' ||
        k === 'correctionMath' ||
        k === 'tex' ||
        k === 'id' ||
        k === 'image' ||
        k === 'illustration' ||
        k === 'background' ||
        k === 'alt' ||
        k === 'illustrationAlt'
      ) {
        continue;
      }
      // Mesures : conserver AB = … dans la même phrase si c’est une égalité pure
      // fixSegmentNotation ne touche pas AB = car pattern exige contexte côté/hypoténuse
      node[k] = fixSegmentNotation(v);
    } else if (v && typeof v === 'object') {
      walkFix(v, `${keyPath}.${k}`);
    }
  }
}

walkFix(p1);

// Assurer options QCM hypoténuse (p1_3 et p1_4)
function fixQuizOptions(scene) {
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'quiz' && /hypoténuse/i.test(n.question || '')) {
      for (const opt of n.options || []) {
        if (typeof opt.text === 'string' && /^[A-Z]{2}$/.test(opt.text.trim())) {
          opt.text = `[${opt.text.trim()}]`;
        }
        if (typeof opt.text === 'string') {
          opt.text = fixSegmentNotation(opt.text);
        }
      }
    }
    if (Array.isArray(n)) n.forEach(walk);
    else Object.values(n).forEach(walk);
  };
  walk(scene);
}
p1.scenes.forEach(fixQuizOptions);

fs.writeFileSync(p1path, JSON.stringify(p1, null, 2) + '\n');

// —— Prologue : rien de structurel si moteur fixe await ; s’assurer next correct ——
const prolPath = 'client/content/prologue/scenes.json';
const prol = JSON.parse(fs.readFileSync(prolPath, 'utf8'));
// p4 lettre reste phases (moteur enchaîne tout en un clic)
fs.writeFileSync(prolPath, JSON.stringify(prol, null, 2) + '\n');

console.log('Silas hotspots:', fin.hotspots.filter((h) => (h.stages || []).includes('silas')).map((h) => ({ id: h.id, label: h.label, x: h.x, y: h.y, w: h.w, h: h.h })));
console.log('Silas objects:', silas.objects.map((o) => o.image));
console.log('Boussole:', boussole.lines[0].text.slice(0, 60));
console.log('Sample hyp:', JSON.stringify(p1.scenes.find((s) => s.id === 'p1_3_verification').hotspots[0].sequence.find((s) => s.type === 'quiz'), null, 2).slice(0, 500));
