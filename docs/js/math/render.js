/**
 * Rendu KaTeX local + figures SVG pédagogiques (carnet).
 */

export function renderMath(element, tex, displayMode = false) {
  if (!element) return;
  if (typeof katex === 'undefined') {
    element.textContent = tex;
    return;
  }
  try {
    katex.render(tex, element, {
      throwOnError: false,
      displayMode,
      output: 'html',
    });
  } catch {
    element.textContent = tex;
  }
}

export function renderMathInContainer(container) {
  if (!container) return;
  container.querySelectorAll('[data-math]').forEach((el) => {
    const tex = el.getAttribute('data-math') || '';
    const display = el.getAttribute('data-display') === 'true';
    renderMath(el, tex, display);
  });
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Triangle rectangle simple avec labels de côtés.
 */
export function rightTriangleSvg(opts = {}) {
  const w = opts.width || 280;
  const h = opts.height || 180;
  const pad = 28;
  const x0 = pad;
  const y0 = h - pad;
  const x1 = w - pad;
  const y1 = h - pad;
  const x2 = pad;
  const y2 = pad;
  const labelA = opts.a ?? 'a';
  const labelB = opts.b ?? 'b';
  const labelC = opts.c ?? 'c';
  return `
<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Triangle rectangle">
  <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2}"
    fill="#e8f4f8" stroke="#1a5f7a" stroke-width="3"/>
  <rect x="${x0}" y="${y0 - 14}" width="14" height="14"
    fill="none" stroke="#1a5f7a" stroke-width="2"/>
  <text x="${(x0 + x1) / 2}" y="${y0 + 20}" text-anchor="middle"
    font-size="16" fill="#1c2a32">${escapeXml(labelA)}</text>
  <text x="${x0 - 12}" y="${(y0 + y2) / 2}" text-anchor="middle"
    font-size="16" fill="#1c2a32">${escapeXml(labelB)}</text>
  <text x="${(x1 + x2) / 2 + 10}" y="${(y1 + y2) / 2}"
    font-size="16" fill="#1c2a32">${escapeXml(labelC)}</text>
</svg>`;
}

/**
 * Triangle rectangle avec sommets nommés.
 * opts.right = lettre du sommet d'angle droit
 * opts.up, opts.end = autres sommets
 * opts.sideRightUp, sideRightEnd, sideUpEnd = labels de côtés
 */
export function namedRightTriangleSvg(opts = {}) {
  const w = opts.width || 300;
  const h = opts.height || 210;
  const right = opts.right || 'A';
  const up = opts.up || 'B';
  const end = opts.end || 'C';
  const sRU = opts.sideRightUp ?? '';
  const sRE = opts.sideRightEnd ?? '';
  const sUE = opts.sideUpEnd ?? '';
  const R = [48, h - 40];
  const U = [48, 40];
  const E = [w - 40, h - 40];
  const mid = (P, Q) => [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
  const mRU = mid(R, U);
  const mRE = mid(R, E);
  const mUE = mid(U, E);
  const aria = `Triangle rectangle ${right}${up}${end} en ${right}`;
  return `
<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(aria)}">
  <polygon points="${R[0]},${R[1]} ${U[0]},${U[1]} ${E[0]},${E[1]}"
    fill="#e8f4f8" stroke="#1a5f7a" stroke-width="3"/>
  <rect x="${R[0]}" y="${R[1] - 14}" width="14" height="14"
    fill="none" stroke="#1a5f7a" stroke-width="2"/>
  <text x="${R[0] - 16}" y="${R[1] + 6}" font-size="15" font-weight="700" fill="#1c2a32">${escapeXml(right)}</text>
  <text x="${U[0] - 16}" y="${U[1] + 4}" font-size="15" font-weight="700" fill="#1c2a32">${escapeXml(up)}</text>
  <text x="${E[0] + 8}" y="${E[1] + 6}" font-size="15" font-weight="700" fill="#1c2a32">${escapeXml(end)}</text>
  ${sRU ? `<text x="${mRU[0] - 18}" y="${mRU[1]}" text-anchor="middle" font-size="14" fill="#1a5f7a">${escapeXml(sRU)}</text>` : ''}
  ${sRE ? `<text x="${mRE[0]}" y="${mRE[1] + 20}" text-anchor="middle" font-size="14" fill="#1a5f7a">${escapeXml(sRE)}</text>` : ''}
  ${sUE ? `<text x="${mUE[0] + 14}" y="${mUE[1]}" font-size="14" fill="#1a5f7a">${escapeXml(sUE)}</text>` : ''}
</svg>`;
}

/** Raccourci ABC rectangle en A */
export function rightTriangleABCSvg(opts = {}) {
  const right = String(opts.rightAngle || 'A').toUpperCase();
  let map;
  if (right === 'B') {
    map = { right: 'B', up: 'A', end: 'C', sideRightUp: opts.ab ?? 'AB', sideRightEnd: opts.bc ?? 'BC', sideUpEnd: opts.ac ?? 'AC' };
  } else if (right === 'C') {
    map = { right: 'C', up: 'B', end: 'A', sideRightUp: opts.bc ?? 'BC', sideRightEnd: opts.ac ?? 'AC', sideUpEnd: opts.ab ?? 'AB' };
  } else {
    map = { right: 'A', up: 'B', end: 'C', sideRightUp: opts.ab ?? 'AB', sideRightEnd: opts.ac ?? 'AC', sideUpEnd: opts.bc ?? 'BC' };
  }
  return namedRightTriangleSvg({ ...opts, ...map });
}

/**
 * Triangle nommé (sommets + mesures de côtés) SANS marque d’angle droit.
 * Pour la réciproque : on prouve l’angle, on ne le dessine pas.
 *
 * opts.A / opts.B / opts.C : lettres des sommets (ex. D, E, F)
 * opts.sideAB / sideBC / sideAC : mesures affichées près des côtés (ex. "3 m")
 * Pas de crochets sur les labels.
 */
export function triangleNamedSvg(opts = {}) {
  const w = opts.width || 320;
  const h = opts.height || 230;
  const A = opts.A || opts.aLabel || 'A';
  const B = opts.B || opts.bLabel || 'B';
  const C = opts.C || opts.cLabel || 'C';
  const sideAB = opts.sideAB ?? opts.ab ?? '';
  const sideBC = opts.sideBC ?? opts.bc ?? '';
  const sideAC = opts.sideAC ?? opts.ac ?? '';
  // Disposition : A bas-gauche, B bas-droite, C haut (scalène, pas de carré)
  const Pa = [48, h - 36];
  const Pb = [w - 40, h - 36];
  const Pc = [opts.apexX != null ? opts.apexX : w * 0.42, 36];
  const mid = (P, Q) => [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
  const mAB = mid(Pa, Pb);
  const mBC = mid(Pb, Pc);
  const mAC = mid(Pa, Pc);
  const aria = `Triangle ${A}${B}${C}`;
  return `
<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(aria)}">
  <polygon points="${Pa[0]},${Pa[1]} ${Pb[0]},${Pb[1]} ${Pc[0]},${Pc[1]}"
    fill="#e8f4f8" stroke="#1a5f7a" stroke-width="3"/>
  <text x="${Pa[0] - 16}" y="${Pa[1] + 6}" font-size="16" font-weight="700" fill="#1c2a32">${escapeXml(A)}</text>
  <text x="${Pb[0] + 10}" y="${Pb[1] + 6}" font-size="16" font-weight="700" fill="#1c2a32">${escapeXml(B)}</text>
  <text x="${Pc[0]}" y="${Pc[1] - 8}" text-anchor="middle" font-size="16" font-weight="700" fill="#1c2a32">${escapeXml(C)}</text>
  ${
    sideAB
      ? `<text x="${mAB[0]}" y="${mAB[1] + 22}" text-anchor="middle" font-size="14" fill="#1a5f7a">${escapeXml(sideAB)}</text>`
      : ''
  }
  ${
    sideBC
      ? `<text x="${mBC[0] + 16}" y="${mBC[1]}" font-size="14" fill="#1a5f7a">${escapeXml(sideBC)}</text>`
      : ''
  }
  ${
    sideAC
      ? `<text x="${mAC[0] - 18}" y="${mAC[1]}" text-anchor="end" font-size="14" fill="#1a5f7a">${escapeXml(sideAC)}</text>`
      : ''
  }
</svg>`;
}

/**
 * Mur / jetée : A sol, C pied du mur, B sur le mur (sans angle droit dessiné).
 */
export function wallTriangleSvg(opts = {}) {
  const w = opts.width || 320;
  const h = opts.height || 240;
  const A = opts.A || 'A';
  const B = opts.B || 'B';
  const C = opts.C || 'C';
  const sideAC = opts.sideAC ?? opts.ac ?? '0,60 m';
  const sideBC = opts.sideBC ?? opts.bc ?? '0,80 m';
  const sideAB = opts.sideAB ?? opts.ab ?? '1 m';
  // C coin bas-droit « mur », A gauche sol, B haut mur
  const Pc = [w - 70, h - 40];
  const Pa = [50, h - 40];
  const Pb = [w - 70, 40];
  const mid = (P, Q) => [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
  const mAC = mid(Pa, Pc);
  const mBC = mid(Pb, Pc);
  const mAB = mid(Pa, Pb);
  return `
<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Triangle ${escapeXml(A)}${escapeXml(B)}${escapeXml(C)} — mur">
  <!-- sol -->
  <line x1="30" y1="${h - 40}" x2="${w - 30}" y2="${h - 40}" stroke="#8a7355" stroke-width="4"/>
  <!-- mur -->
  <line x1="${Pc[0]}" y1="${h - 40}" x2="${Pb[0]}" y2="28" stroke="#6b5b4a" stroke-width="10" stroke-linecap="square"/>
  <polygon points="${Pa[0]},${Pa[1]} ${Pc[0]},${Pc[1]} ${Pb[0]},${Pb[1]}"
    fill="rgba(232,244,248,0.85)" stroke="#1a5f7a" stroke-width="3"/>
  <text x="${Pa[0] - 14}" y="${Pa[1] + 6}" font-size="16" font-weight="700" fill="#1c2a32">${escapeXml(A)}</text>
  <text x="${Pb[0] + 12}" y="${Pb[1] + 4}" font-size="16" font-weight="700" fill="#1c2a32">${escapeXml(B)}</text>
  <text x="${Pc[0] + 12}" y="${Pc[1] + 6}" font-size="16" font-weight="700" fill="#1c2a32">${escapeXml(C)}</text>
  <text x="${mAC[0]}" y="${mAC[1] + 22}" text-anchor="middle" font-size="13" fill="#1a5f7a">${escapeXml(sideAC)}</text>
  <text x="${mBC[0] + 18}" y="${mBC[1]}" font-size="13" fill="#1a5f7a">${escapeXml(sideBC)}</text>
  <text x="${mAB[0] - 8}" y="${mAB[1] - 6}" text-anchor="middle" font-size="13" fill="#1a5f7a">${escapeXml(sideAB)}</text>
</svg>`;
}

/**
 * Carrés de Pythagore. areaHyp = '?' pour masquer la réponse.
 * N'écrit jamais a*a dans le SVG pour l'hypoténuse si hideHypArea.
 */
export function pythagorasSquaresSvg(opts = {}) {
  const a = Number(opts.a ?? 3);
  const b = Number(opts.b ?? 4);
  const c = Number(opts.c ?? 5);
  const unit = opts.unit || 22;
  const labelA = opts.labelA ?? String(a);
  const labelB = opts.labelB ?? String(b);
  const labelC = opts.labelC ?? String(c);
  const showAreas = opts.showAreas !== false;
  // Aires affichées : ne jamais calculer silencieusement l'aire cherchée
  let areaA = opts.areaA;
  let areaB = opts.areaB;
  let areaC = opts.areaC;
  if (showAreas) {
    if (areaA === undefined) areaA = String(a * a);
    if (areaB === undefined) areaB = String(b * b);
    if (areaC === undefined) areaC = opts.hideHypArea !== false ? '?' : String(c * c);
  }

  const ox = 20 + b * unit + 8;
  const oy = 20 + a * unit + 8;
  const Ax = ox;
  const Ay = oy;
  const Bx = ox;
  const By = oy - a * unit;
  const Cx = ox + b * unit;
  const Cy = oy;

  const sqA = [
    [Ax, Ay],
    [Bx, By],
    [Bx - a * unit, By],
    [Ax - a * unit, Ay],
  ];
  const sqB = [
    [Ax, Ay],
    [Cx, Cy],
    [Cx, Cy + b * unit],
    [Ax, Ay + b * unit],
  ];
  const vx = Cx - Bx;
  const vy = Cy - By;
  const len = Math.hypot(vx, vy) || 1;
  let nx = -vy / len;
  let ny = vx / len;
  const midX = (Bx + Cx) / 2;
  const midY = (By + Cy) / 2;
  if (nx * (Ax - midX) + ny * (Ay - midY) > 0) {
    nx = -nx;
    ny = -ny;
  }
  const sqC = [
    [Bx, By],
    [Cx, Cy],
    [Cx + nx * c * unit, Cy + ny * c * unit],
    [Bx + nx * c * unit, By + ny * c * unit],
  ];

  const pts = (arr) => arr.map((p) => `${p[0]},${p[1]}`).join(' ');
  const center = (arr) => {
    const sx = arr.reduce((s, p) => s + p[0], 0) / arr.length;
    const sy = arr.reduce((s, p) => s + p[1], 0) / arr.length;
    return [sx, sy];
  };
  const [cAx, cAy] = center(sqA);
  const [cBx, cBy] = center(sqB);
  const [cCx, cCy] = center(sqC);
  const maxX = Math.max(...sqA.map((p) => p[0]), ...sqB.map((p) => p[0]), ...sqC.map((p) => p[0])) + 24;
  const maxY = Math.max(...sqA.map((p) => p[1]), ...sqB.map((p) => p[1]), ...sqC.map((p) => p[1])) + 24;
  const minX = Math.min(...sqA.map((p) => p[0]), ...sqB.map((p) => p[0]), ...sqC.map((p) => p[0])) - 16;
  const minY = Math.min(...sqA.map((p) => p[1]), ...sqB.map((p) => p[1]), ...sqC.map((p) => p[1])) - 16;

  // aria sans révéler l'aire cherchée
  const aria = `Triangle rectangle avec carrés sur les côtés ${labelA}, ${labelB} et ${labelC}`;

  return `
<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" role="img"
  aria-label="${escapeXml(aria)}">
  <polygon points="${pts(sqA)}" fill="#d4e8f0" stroke="#1a5f7a" stroke-width="2.5"/>
  <polygon points="${pts(sqB)}" fill="#e8f0d4" stroke="#1a5f7a" stroke-width="2.5"/>
  <polygon points="${pts(sqC)}" fill="#f0e4d4" stroke="#1a5f7a" stroke-width="2.5"/>
  <polygon points="${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}"
    fill="#fff8f0" stroke="#0f3d4f" stroke-width="3"/>
  <rect x="${Ax}" y="${Ay - 12}" width="12" height="12" fill="none" stroke="#0f3d4f" stroke-width="2"/>
  <text x="${(Ax + Bx) / 2 - 10}" y="${(Ay + By) / 2}" text-anchor="middle"
    font-size="14" fill="#1c2a32">${escapeXml(labelA)}</text>
  <text x="${(Ax + Cx) / 2}" y="${Ay + 16}" text-anchor="middle"
    font-size="14" fill="#1c2a32">${escapeXml(labelB)}</text>
  <text x="${(Bx + Cx) / 2 + 8}" y="${(By + Cy) / 2 - 6}" text-anchor="middle"
    font-size="14" fill="#1c2a32">${escapeXml(labelC)}</text>
  ${
    showAreas
      ? `<text x="${cAx}" y="${cAy}" text-anchor="middle" dominant-baseline="middle"
        font-size="16" font-weight="700" fill="#1a5f7a">${escapeXml(areaA)}</text>
    <text x="${cBx}" y="${cBy}" text-anchor="middle" dominant-baseline="middle"
        font-size="16" font-weight="700" fill="#5a7a1a">${escapeXml(areaB)}</text>
    <text x="${cCx}" y="${cCy}" text-anchor="middle" dominant-baseline="middle"
        font-size="16" font-weight="700" fill="#8a5a1a">${escapeXml(areaC)}</text>`
      : ''
  }
</svg>`;
}

/** Losange / monte-charge pour correction */
export function rhombusLiftSvg(opts = {}) {
  const side = opts.sideLabel ?? '21';
  const halfDiag = opts.halfDiagLabel ?? '16';
  const heightLabel = opts.heightLabel ?? '2x = ?';
  const w = 340;
  const h = 280;
  const cx = 170;
  const cy = 140;
  const hx = 100;
  const hy = 78;
  // losange: top, right, bottom, left
  const T = [cx, cy - hy];
  const R = [cx + hx, cy];
  const B = [cx, cy + hy];
  const L = [cx - hx, cy];
  return `
<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Losange du monte-charge : diagonales perpendiculaires en O, demi-diagonale ${escapeXml(halfDiag)}, côté ${escapeXml(side)}, hauteur totale recherchée">
  <polygon points="${T[0]},${T[1]} ${R[0]},${R[1]} ${B[0]},${B[1]} ${L[0]},${L[1]}"
    fill="#e8f4f8" stroke="#1a5f7a" stroke-width="3"/>
  <line x1="${L[0]}" y1="${L[1]}" x2="${R[0]}" y2="${R[1]}" stroke="#b8860b" stroke-width="2" stroke-dasharray="4 3"/>
  <line x1="${T[0]}" y1="${T[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#1e5c38" stroke-width="2.5"/>
  <circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f3d4f"/>
  <text x="${cx + 10}" y="${cy - 8}" font-size="13" font-weight="700" fill="#0f3d4f">O</text>
  <text x="${(cx + R[0]) / 2}" y="${cy - 10}" text-anchor="middle" font-size="13" fill="#b8860b">${escapeXml(halfDiag)}</text>
  <text x="${(T[0] + R[0]) / 2 + 12}" y="${(T[1] + R[1]) / 2}" font-size="13" fill="#1a5f7a">${escapeXml(side)}</text>
  <text x="${cx + 14}" y="${(T[1] + B[1]) / 2 + 4}" font-size="13" font-weight="700" fill="#1e5c38">${escapeXml(heightLabel)}</text>
  <text x="${cx}" y="${h - 16}" text-anchor="middle" font-size="12" fill="#4a5a62">diagonales ⟂ en O · demi-hauteur x · hauteur 2x</text>
</svg>`;
}

export function figureSvg(figureId, labels = {}) {
  switch (figureId) {
    case 'rightTriangle':
      return rightTriangleSvg(labels);
    case 'rightTriangleABC':
      return rightTriangleABCSvg(labels);
    case 'rightTriangleABC_C':
      return rightTriangleABCSvg({ ...labels, rightAngle: 'C' });
    case 'rightTriangleABC_B':
      return rightTriangleABCSvg({ ...labels, rightAngle: 'B' });
    case 'namedRightTriangle':
      return namedRightTriangleSvg(labels);
    case 'triangleNamed':
    case 'triangleSides':
      return triangleNamedSvg(labels);
    case 'wallTriangle':
    case 'murTriangle':
      return wallTriangleSvg(labels);
    case 'pythagorasSquares':
    case 'pythagoras345':
      return pythagorasSquaresSvg({
        a: labels.a ?? 3,
        b: labels.b ?? 4,
        c: labels.c ?? 5,
        labelA: labels.labelA ?? labels.sideA ?? String(labels.a ?? 3),
        labelB: labels.labelB ?? labels.sideB ?? String(labels.b ?? 4),
        labelC: labels.labelC ?? labels.sideC ?? '?',
        areaA: labels.areaA,
        areaB: labels.areaB,
        areaC: labels.areaC ?? '?',
        hideHypArea: labels.hideHypArea !== false,
        showAreas: labels.showAreas !== false,
        unit: labels.unit,
      });
    case 'pythagoras51213':
      return pythagorasSquaresSvg({
        a: 5,
        b: 12,
        c: 13,
        labelA: '5',
        labelB: '12',
        labelC: '?',
        areaA: '25',
        areaB: '144',
        areaC: '?',
        hideHypArea: true,
        showAreas: true,
        unit: labels.unit || 12,
      });
    case 'rhombusLift':
      return rhombusLiftSvg(labels);
    default:
      return '';
  }
}
