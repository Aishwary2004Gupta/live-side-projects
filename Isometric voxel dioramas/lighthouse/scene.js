/*
 * Lighthouse Harbor scene for the Voxel Worlds gallery.
 * Every moving pose is derived from absolute scene time; seeking and loop wraps
 * therefore produce the same picture without carrying simulation state.
 */
function buildLighthouseScene(g, t) {
  const { m, tri, quad, cube, tube, sphere, cone } = g;
  const TAU = Math.PI * 2;
  const now = ((t % 46) + 46) % 46;
  const smooth = (a, b, x) => {
    const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };
  const line = (a, b, color = '#5a5145', radius = 0.025) =>
    tube(a, b, radius, color, 6);
  const disk = (x, z, y, r, color, sides = 12) => {
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * TAU, b = ((i + 1) / sides) * TAU;
      tri([x, y, z], [x + Math.cos(a) * r, y, z + Math.sin(a) * r],
        [x + Math.cos(b) * r, y, z + Math.sin(b) * r], color, [0, 1, 0]);
    }
  };
  const ring = (x, z, y, r, color, sides = 14, thickness = 0.025) => {
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * TAU, b = ((i + 1) / sides) * TAU;
      line([x + Math.cos(a) * r, y, z + Math.sin(a) * r],
        [x + Math.cos(b) * r, y, z + Math.sin(b) * r], color, thickness);
    }
  };
  const fanPolygon = (points, y, color) => {
    const center = points.reduce((p, q) => [p[0] + q[0] / points.length, p[1] + q[1] / points.length], [0, 0]);
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      tri([center[0], y, center[1]], [a[0], y, a[1]], [b[0], y, b[1]], color, [0, 1, 0]);
    }
  };
  const inPolygon = (x, z, points) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0], zi = points[i][1], xj = points[j][0], zj = points[j][1];
      if (((zi > z) !== (zj > z)) && x < ((xj - xi) * (z - zi)) / ((zj - zi) || 1e-9) + xi) inside = !inside;
    }
    return inside;
  };
  const lighthouse = [-1.82, -1.58];
  const land = [[-4.88, -4.86], [-1.12, -4.86], [-0.25, -4.05], [0.28, -2.8],
    [0.12, -1.45], [-0.44, -0.16], [-1.42, 1.15], [-2.72, 2.12], [-4.88, 2.26]];
  const beach = [[-4.88, -0.08], [-3.55, 0.05], [-2.55, 0.78], [-3.16, 2.08], [-4.88, 2.23]];
  const inLand = (x, z) => inPolygon(x, z, land);
  const inBeach = (x, z) => inPolygon(x, z, beach);

  // Cut-edge slab, sea plane, and a gently undulating, palette-snapped water grid.
  cube(-5, -0.45, -5, 10, 0.45, 10, ['#6b442d', '#523522', '#3d2b22']);
  cube(-4.91, 0, -4.91, 9.82, 0.1, 9.82, ['#347f92', '#347f92', '#347f92']);
  const waterColors = ['#347f92', '#39899a', '#438f9a', '#4c9aa4'];
  const step = 0.62;
  for (let x = -4.9; x < 4.9; x += step) {
    const x1 = Math.min(x + step, 4.88);
    for (let z = -4.9; z < 4.9; z += step) {
      const z1 = Math.min(z + step, 4.88);
      if (inLand((x + x1) * 0.5, (z + z1) * 0.5)) continue;
      const wave = (xx, zz) => 0.115 + 0.025 * Math.sin(xx * 1.33 + TAU * 8 * now / 46) * Math.cos(zz * 1.21 - TAU * 7 * now / 46);
      const p00 = [x, wave(x, z), z], p10 = [x1, wave(x1, z), z];
      const p11 = [x1, wave(x1, z1), z1], p01 = [x, wave(x, z1), z1];
      const k = (Math.floor((x + 5) / step) * 7 + Math.floor((z + 5) / step) * 3 + 40) % waterColors.length;
      quad(p00, p10, p11, p01, waterColors[k], [0, 1, 0]);
    }
  }
  fanPolygon(land, 0.17, '#827561');
  fanPolygon(beach, 0.185, '#dfc596');

  // Narrow waterline stones, the rocky headland, and readable beach scale cues.
  const coast = [[0.02, -3.05], [0.12, -2.45], [-0.06, -1.82], [-0.36, -1.15], [-0.84, -0.53], [-1.46, 0.22], [-2.08, 0.83]];
  coast.forEach(([x, z], i) => sphere(x, 0.27 + (i % 2) * 0.05, z, 0.38, 0.27, 0.30,
    ['#69716e', '#847966', '#927d68'][i % 3], 7, 4));
  const rocks = [
    [-2.67, -2.65, .60, .43, .46], [-1.12, -2.70, .55, .38, .49],
    [-2.82, -1.00, .48, .36, .42], [-.89, -1.67, .46, .34, .43],
    [-2.58, -.20, .43, .30, .34], [-1.33, -.27, .48, .36, .38],
    [-3.52, -2.72, .36, .24, .31], [-3.67, -.62, .32, .22, .29],
    [-2.52, 1.04, .29, .20, .31], [-3.82, 1.64, .34, .21, .30],
    [-1.18, -3.50, .33, .24, .29], [-.50, -2.65, .31, .22, .28],
  ];
  rocks.forEach(([x, z, rx, ry, rz], i) => {
    sphere(x, 0.22 + ry * 0.58, z, rx, ry, rz, ['#77766e', '#8d806d', '#6a706e', '#a18d73'][i % 4], 7, 4);
    if (i % 3 === 0) sphere(x - rx * 0.25, 0.27 + ry * 0.83, z - rz * 0.15, rx * 0.42, ry * 0.28, rz * 0.46, '#aaa08d', 6, 3);
  });
  // A weathered path and small grass clumps lead from the beach to the tower.
  for (let i = 0; i < 7; i++) {
    const x = -3.65 + i * 0.23, z = 1.45 - i * 0.35;
    sphere(x, 0.215, z, 0.17, 0.035, 0.13, i % 2 ? '#b49c75' : '#c1aa81', 6, 3);
  }
  for (let i = 0; i < 12; i++) {
    const x = -4.48 + (i % 4) * 0.52 + Math.floor(i / 4) * 0.15;
    const z = 0.25 + Math.floor(i / 4) * 0.62 + (i % 2) * 0.12;
    const h = 0.10 + (i % 3) * 0.035;
    line([x, 0.20, z], [x - 0.06, 0.20 + h, z + 0.015], i % 3 ? '#6d8b4f' : '#8b9b5b', 0.018);
    line([x, 0.20, z], [x + 0.08, 0.20 + h * 0.78, z - 0.04], '#788e4d', 0.016);
  }

  // Landmark: eight-part lighthouse assembly, with tapered striped shaft and gallery.
  const [lx, lz] = lighthouse;
  sphere(lx, 0.19, lz, 1.20, 0.12, 1.02, '#544b40', 8, 3); // contact shadow
  cone(lx, 0.18, lz, 0.79, 0.34, '#a79b87', 0.70, 10);
  ring(lx, lz, 0.48, 0.71, '#625b50', 10, 0.055);
  cube(lx - 0.16, 0.48, lz + 0.57, 0.32, 0.39, 0.045, ['#573b31', '#402c28', '#342521']);
  cube(lx - 0.07, 0.51, lz + 0.615, 0.14, 0.23, 0.025, '#b27a4c');
  const bands = [
    [0.39, 0.37, '#f0e5d1'], [0.76, 0.20, '#bd4b3d'], [0.96, 0.43, '#f3ead9'],
    [1.39, 0.20, '#c04437'], [1.59, 0.43, '#f2e8d7'], [2.02, 0.20, '#c04437'],
    [2.22, 0.43, '#f3eadb'], [2.65, 0.20, '#c04437'], [2.85, 0.43, '#f3e9d7'],
  ];
  bands.forEach(([y, h, color]) => {
    const r0 = 0.66 - (y - 0.39) * 0.055;
    cone(lx, y, lz, r0, h, color, r0 - h * 0.055, 10);
  });
  // Door lintel, slit windows, painted trim, and chipped base stones.
  cube(lx - 0.22, 0.88, lz + 0.52, 0.44, 0.075, 0.06, '#e2d5bd');
  for (const [x, y] of [[lx - 0.12, 1.42], [lx + 0.12, 2.19], [lx - 0.12, 2.96]]) {
    cube(x, y, lz + 0.49, 0.105, 0.24, 0.035, '#375d68');
    cube(x - 0.03, y - 0.15, lz + 0.515, 0.17, 0.035, 0.04, '#e7d8bd');
  }
  for (let i = 0; i < 7; i++) {
    const a = 0.4 + i * 0.83, x = lx + Math.cos(a) * 0.72, z = lz + Math.sin(a) * 0.72;
    sphere(x, 0.39 + (i % 2) * 0.04, z, 0.11, 0.07, 0.10, i % 2 ? '#b29b79' : '#77756b', 6, 3);
  }
  // Balcony deck, iron posts, handrail, brackets, and the lantern room.
  const galleryY = 3.38;
  disk(lx, lz, galleryY, 0.76, '#a99b83', 12);
  ring(lx, lz, galleryY + 0.06, 0.76, '#645b4f', 12, 0.055);
  ring(lx, lz, galleryY + 0.48, 0.70, '#544a41', 12, 0.03);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, x = lx + Math.cos(a) * 0.70, z = lz + Math.sin(a) * 0.70;
    line([x, galleryY + 0.08, z], [x, galleryY + 0.47, z], '#655a4e', 0.026);
    if (i % 3 === 0) line([lx + Math.cos(a) * 0.54, 3.12, lz + Math.sin(a) * 0.54], [x, galleryY + 0.12, z], '#7b6d5c', 0.028);
  }
  const lanternBottom = 3.52, lanternTop = 4.17, lanternR = 0.47;
  ring(lx, lz, lanternBottom, 0.56, '#453a32', 10, 0.05);
  ring(lx, lz, lanternTop, 0.53, '#4b3c32', 10, 0.045);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU, x = lx + Math.cos(a) * lanternR, z = lz + Math.sin(a) * lanternR;
    line([x, lanternBottom, z], [x, lanternTop, z], '#5a4435', 0.036);
    const mx = lx + Math.cos(a + Math.PI / 10) * lanternR * 0.90;
    const mz = lz + Math.sin(a + Math.PI / 10) * lanternR * 0.90;
    sphere(mx, 3.86, mz, 0.075, 0.24, 0.028, i % 2 ? '#f4d27d' : '#f5df9e', 6, 4);
  }
  // Fresnel rings and central lens stay visible even when the beam turns away.
  ring(lx, lz, 3.70, 0.31, '#e1a94d', 10, 0.025);
  ring(lx, lz, 3.91, 0.34, '#f4d981', 10, 0.022);
  sphere(lx, 3.84, lz, 0.16, 0.20, 0.16, '#fff0af', 8, 5);
  disk(lx, lz, 4.19, 0.64, '#7f4b38', 10);
  cone(lx, 4.18, lz, 0.63, 0.49, '#a74838', 0.12, 10);
  ring(lx, lz, 4.20, 0.63, '#713a32', 10, 0.045);
  line([lx, 4.67, lz], [lx, 4.95, lz], '#51443a', 0.035);
  sphere(lx, 4.97, lz, 0.065, 0.065, 0.065, '#d0a35b', 6, 4);
  // A tiny pennant reacts to the same gust that rocks the boat.
  const gust = smooth(16, 19, now) * (1 - smooth(24, 27, now));
  const pennant = (Math.sin(TAU * 9 * now / 46) * 0.10 + gust * 0.22);
  line([lx, 4.74, lz], [lx + 0.38, 4.74 + pennant, lz + 0.03], '#65483a', 0.022);
  tri([lx + 0.37, 4.73 + pennant, lz + 0.03], [lx + 0.76, 4.63 + pennant, lz + 0.03],
    [lx + 0.52, 4.48 + pennant, lz + 0.03], '#c34d3b', [0, 0, 1]);

  // The rotating beam is a tapered pair of warm bands. It shortens before the slab edge.
  const beamAngle = (now / 9.2) * TAU;
  const drawBeam = (angle) => {
    const dx = Math.cos(angle), dz = Math.sin(angle), sx = -dz, sz = dx;
    let maxLen = 4.1;
    if (dx > 0.001) maxLen = Math.min(maxLen, (4.72 - lx) / dx);
    else if (dx < -0.001) maxLen = Math.min(maxLen, (-4.72 - lx) / dx);
    if (dz > 0.001) maxLen = Math.min(maxLen, (4.72 - lz) / dz);
    else if (dz < -0.001) maxLen = Math.min(maxLen, (-4.72 - lz) / dz);
    const length = Math.max(0.8, maxLen - 0.32), y = 4.03;
    const origin = [lx, y, lz], nearL = [lx + sx * 0.075, y, lz + sz * 0.075];
    const nearR = [lx - sx * 0.075, y, lz - sz * 0.075];
    const end = [lx + dx * length, y, lz + dz * length];
    const farL = [end[0] + sx * 0.34, y, end[2] + sz * 0.34];
    const farR = [end[0] - sx * 0.34, y, end[2] - sz * 0.34];
    tri(origin, farL, farR, '#d69c49', [0, 1, 0]);
    quad(nearL, [end[0] + sx * 0.12, y + 0.004, end[2] + sz * 0.12],
      [end[0] - sx * 0.12, y + 0.004, end[2] - sz * 0.12], nearR, '#f2c969', [0, 1, 0]);
  };
  drawBeam(beamAngle);
  drawBeam(beamAngle + Math.PI);

  // Pier: individual boards, cross-beams, piles, iron shoes, cleats, rope coil and rescue ring.
  const dockY = 0.43;
  for (let x = -0.18; x < 1.92; x += 0.28) {
    cube(x, dockY, 0.20, 0.25, 0.12, 0.92, x % 2 ? ['#a5784e', '#80583c', '#664630'] : ['#b58455', '#8c6240', '#704b31']);
    line([x + 0.04, dockY + 0.125, 0.26], [x + 0.04, dockY + 0.125, 1.00], '#d0a16a', 0.012);
  }
  for (const x of [-0.06, 0.72, 1.54, 2.12]) {
    for (const z of [0.28, 1.00]) {
      tube([x, -0.28, z], [x, dockY + 0.06, z], 0.075, '#563d2c', 7, 0.065);
      ring(x, z, -0.07, 0.078, '#342e29', 7, 0.018);
    }
    cube(x - 0.045, 0.56, 0.15, 0.09, 0.09, 1.0, '#655143');
  }
  for (const x of [0.04, 1.82]) {
    cube(x, 0.54, 0.46, 0.18, 0.19, 0.16, '#72543a');
    line([x + 0.08, 0.72, 0.54], [x + 0.08, 0.80, 0.54], '#d4b181', 0.025);
  }
  // A coiled line and orange rescue buoy are the pier's story details.
  ring(0.32, 0.76, 0.57, 0.17, '#b89a73', 10, 0.035);
  ring(0.32, 0.76, 0.59, 0.11, '#9b7c5d', 10, 0.023);
  ring(1.62, 0.43, 0.59, 0.16, '#e8e1cf', 10, 0.043);
  ring(1.62, 0.43, 0.595, 0.16, '#cf6048', 10, 0.036);
  cube(1.52, 0.77, 0.34, 0.23, 0.16, 0.21, ['#70523b', '#523d2f', '#463327']);
  cube(1.55, 0.94, 0.36, 0.17, 0.05, 0.17, '#9b714c');
  sphere(1.60, 1.04, 0.44, 0.045, 0.055, 0.045, '#ffd77b', 6, 4);

  // Skiff rocks gently at the pier. Its hull, seats, mast, sail, rigging and sailor
  // are rebuilt from absolute time, so the animation is stable under frame seeking.
  const boatX = 2.20, boatZ = 1.62;
  const bob = 0.035 * Math.sin(TAU * 12 * now / 46) + gust * 0.07 * Math.sin(now * 3.1);
  const roll = 0.045 * Math.sin(TAU * 15 * now / 46) + gust * 0.13 * Math.sin(now * 3.4);
  const yaw = 0.13 + 0.025 * Math.sin(TAU * 5 * now / 46);
  const cY = Math.cos(yaw), sY = Math.sin(yaw);
  const boatPoint = (u, h, v) => [boatX + u * cY - v * sY,
    0.12 + bob + h - v * roll, boatZ + u * sY + v * cY];
  const boatTri = (a, b, c, color) => tri(boatPoint(...a), boatPoint(...b), boatPoint(...c), color);
  const boatQuad = (a, b, c, d, color) => quad(boatPoint(...a), boatPoint(...b), boatPoint(...c), boatPoint(...d), color);
  const hull = [[-0.92, 0], [-0.64, -0.35], [0.50, -0.34], [0.86, -0.20], [0.94, 0], [0.86, 0.20], [0.50, 0.34], [-0.64, 0.35]];
  const lowerHull = hull.map(([u, v]) => [u * 0.84, v * 0.72]);
  const hullCenter = boatPoint(0, 0.03, 0);
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    const topA = boatPoint(hull[i][0], 0.23, hull[i][1]), topB = boatPoint(hull[j][0], 0.23, hull[j][1]);
    const lowA = boatPoint(lowerHull[i][0], -0.06, lowerHull[i][1]), lowB = boatPoint(lowerHull[j][0], -0.06, lowerHull[j][1]);
    quad(topA, lowA, lowB, topB, i < 2 || i > 5 ? '#87452f' : '#a75b3b');
    tri(hullCenter, topA, topB, '#9a5438');
    line(topA, topB, '#d28c57', 0.025);
  }
  const deckCorners = hull.map(([u, v]) => boatPoint(u * 0.83, 0.235, v * 0.78));
  for (let i = 1; i < deckCorners.length - 1; i++) tri(deckCorners[0], deckCorners[i], deckCorners[i + 1], '#704d35');
  for (const u of [-0.30, 0.28, 0.69]) {
    boatQuad([u, 0.25, -0.25], [u + 0.08, 0.25, -0.25], [u + 0.08, 0.25, 0.25], [u, 0.25, 0.25], '#c28b57');
    line(boatPoint(u, 0.28, -0.25), boatPoint(u, 0.28, 0.25), '#573b2c', 0.018);
  }
  // Curved gunwales and a narrow dark keel show the hollow wooden hull construction.
  for (let i = 0; i < hull.length; i++) line(boatPoint(hull[i][0], 0.26, hull[i][1]),
    boatPoint(hull[(i + 1) % hull.length][0], 0.26, hull[(i + 1) % hull.length][1]), '#5d392b', 0.045);
  line(boatPoint(-0.58, -0.09, 0), boatPoint(0.66, -0.09, 0), '#49342a', 0.055);
  const mastBase = boatPoint(0.03, 0.28, 0), mastTop = boatPoint(0.03, 2.00, 0);
  line(mastBase, mastTop, '#674b34', 0.055);
  const sailA = boatPoint(-0.58, 0.46, 0.03), sailB = boatPoint(0.03, 1.90, 0.03), sailC = boatPoint(0.61, 0.44, 0.03);
  tri(sailA, sailB, sailC, '#c63e32', [0, 0, 1]);
  const sailInsetA = boatPoint(-0.40, 0.51, 0.047), sailInsetB = boatPoint(0.03, 1.62, 0.047), sailInsetC = boatPoint(0.45, 0.50, 0.047);
  tri(sailInsetA, sailInsetB, sailInsetC, '#dc5140', [0, 0, 1]);
  line(boatPoint(-0.76, 0.29, 0), mastTop, '#513e32', 0.018);
  line(boatPoint(0.82, 0.28, 0), mastTop, '#513e32', 0.018);
  const pennantTip = boatPoint(0.35, 2.05 + Math.sin(now * 2) * 0.04, 0);
  line(mastTop, pennantTip, '#503b2c', 0.018);
  tri(pennantTip, boatPoint(0.58, 1.99, 0), boatPoint(0.40, 1.91, 0), '#e2ae58', [0, 0, 1]);

  // Small sailor with a cap and life vest; head and arms turn toward the keeper.
  const sailorX = boatX + 0.22, sailorZ = boatZ + 0.10, sailorY = 0.36 + bob;
  sphere(sailorX, sailorY, sailorZ, 0.13, 0.055, 0.13, '#27333a', 7, 4);
  cube(sailorX - 0.10, sailorY + 0.04, sailorZ - 0.10, 0.20, 0.25, 0.20, '#344e5a');
  cube(sailorX - 0.12, sailorY + 0.12, sailorZ + 0.085, 0.24, 0.08, 0.035, '#d47742');
  sphere(sailorX, sailorY + 0.28, sailorZ, 0.12, 0.13, 0.11, '#d3a078', 7, 4);
  cube(sailorX - 0.14, sailorY + 0.39, sailorZ - 0.13, 0.28, 0.07, 0.25, '#344c58');
  line([sailorX - 0.12, sailorY + 0.14, sailorZ], [sailorX - 0.23, sailorY + 0.02, sailorZ + 0.08], '#d3a078', 0.035);
  line([sailorX + 0.12, sailorY + 0.14, sailorZ], [sailorX + 0.22, sailorY + 0.05, sailorZ + 0.12], '#d3a078', 0.035);

  // Mooring line slackens in calm water and pulls taut when the keeper secures it.
  const tie = smooth(23, 29, now) * (1 - smooth(32, 36, now));
  const bow = boatPoint(-0.77, 0.25, 0.16);
  const cleat = [1.90, 0.62, 0.48];
  const ropeMid = [(bow[0] + cleat[0]) * 0.5, 0.60 + (1 - tie) * 0.16 + gust * 0.08, (bow[2] + cleat[2]) * 0.5];
  line(cleat, ropeMid, '#a98d65', 0.022);
  line(ropeMid, bow, '#a98d65', 0.022);
  // A small wake follows the stern, then relaxes during the quiet seam.
  for (let i = 0; i < 3; i++) {
    const p = 0.5 + i * 0.22, r = 0.16 + i * 0.12 + gust * 0.07;
    ring(boatX + 0.85 + i * 0.18, boatZ - 0.18, 0.15 + bob, r, i ? '#6eafb4' : '#9ac7c3', 10, 0.013);
  }

  // Keeper's absolute-time track: patrol, inspect, brace during the gust, tie off, return.
  const route = [
    [0, [-1.10, -1.26]], [7, [-0.20, 0.36]], [12, [0.48, 0.45]],
    [18, [0.54, 0.47]], [28, [0.54, 0.47]], [35, [0.10, 0.35]],
    [44, [-1.10, -1.26]], [46, [-1.10, -1.26]],
  ];
  let keeperX = route[0][1][0], keeperZ = route[0][1][1], routeStart = 0, routeEnd = 1;
  while (routeEnd < route.length && now > route[routeEnd][0]) { routeStart = routeEnd; routeEnd++; }
  const A = route[routeStart], B = route[Math.min(routeEnd, route.length - 1)];
  const move = smooth(A[0], B[0], now);
  keeperX = A[1][0] + (B[1][0] - A[1][0]) * move;
  keeperZ = A[1][1] + (B[1][1] - A[1][1]) * move;
  const walking = (now < 7 || (now > 32 && now < 44)) ? 1 : 0;
  const inspect = smooth(8, 10, now) * (1 - smooth(13, 15, now));
  const brace = gust * (1 - smooth(24, 26, now));
  const tieAction = smooth(23, 25, now) * (1 - smooth(30, 32, now));
  const wave = smooth(31, 33, now) * (1 - smooth(35, 37, now));
  const stride = now * 4.5;
  const bobKeeper = Math.abs(Math.sin(stride)) * walking * 0.035;
  const onPier = smooth(-0.35, 0.05, keeperX) * (1 - smooth(1.25, 1.55, keeperX));
  const kY = 0.20 + onPier * 0.35 + bobKeeper;
  const stepL = Math.sin(stride) * walking * 0.075, stepR = -Math.sin(stride) * walking * 0.075;
  sphere(keeperX, 0.205 + onPier * 0.35, keeperZ, 0.34, 0.035, 0.24, '#59624e', 8, 3);
  // Boots, trousers, coat body, scarf, collar, face, cap, eyes, arms and hands.
  cube(keeperX - 0.15 + stepL, kY, keeperZ - 0.09, 0.13, 0.20, 0.18, '#49392f');
  cube(keeperX + 0.03 + stepR, kY, keeperZ - 0.09, 0.13, 0.20, 0.18, '#49392f');
  cube(keeperX - 0.13 + stepL, kY + 0.18, keeperZ - 0.10, 0.11, 0.22, 0.15, '#354752');
  cube(keeperX + 0.04 + stepR, kY + 0.18, keeperZ - 0.10, 0.11, 0.22, 0.15, '#354752');
  cube(keeperX - 0.18, kY + 0.39, keeperZ - 0.12, 0.36, 0.42, 0.26, '#354b53');
  cube(keeperX - 0.15, kY + 0.61, keeperZ + 0.025, 0.30, 0.075, 0.045, '#cf6e42');
  cube(keeperX - 0.17, kY + 0.73, keeperZ - 0.115, 0.34, 0.09, 0.27, '#465b60');
  sphere(keeperX, kY + 0.88, keeperZ, 0.135, 0.15, 0.13, '#d1a07c', 8, 5);
  sphere(keeperX, kY + 0.99, keeperZ - 0.005, 0.15, 0.075, 0.14, '#46382f', 8, 4);
  cube(keeperX - 0.18, kY + 1.00, keeperZ - 0.16, 0.36, 0.045, 0.31, '#374e56');
  cube(keeperX + 0.025, kY + 0.88, keeperZ + 0.115, 0.035, 0.035, 0.026, '#352d29');
  const reach = Math.max(inspect, tieAction);
  const leftHand = [keeperX - 0.26 - brace * 0.06, kY + 0.42 + brace * 0.05, keeperZ + 0.12];
  const rightHand = [keeperX + 0.34 + reach * 0.24 + brace * 0.08, kY + 0.50 - reach * 0.27 + wave * 0.14, keeperZ + 0.15];
  line([keeperX - 0.16, kY + 0.70, keeperZ], leftHand, '#c49a76', 0.055);
  line([keeperX + 0.16, kY + 0.70, keeperZ], rightHand, '#c49a76', 0.055);
  sphere(...leftHand, 0.065, 0.055, 0.06, '#d1a07c', 6, 4);
  sphere(...rightHand, 0.065, 0.055, 0.06, '#d1a07c', 6, 4);
  if (tieAction > 0.05) line(rightHand, ropeMid, '#a98d65', 0.018);

  // Two gulls loop at different phases; low-profile V-shaped wings remain readable.
  const drawGull = (x, y, z, flap, scale) => {
    const lift = Math.sin(flap) * 0.08;
    line([x - scale, y + lift, z], [x, y + 0.10 + lift, z + 0.01], '#f1eee3', 0.035 * scale);
    line([x, y + 0.10 + lift, z + 0.01], [x + scale, y + lift, z], '#fffaf0', 0.035 * scale);
    line([x - scale * 0.12, y + 0.03, z], [x + scale * 0.10, y + 0.03, z], '#aa8a63', 0.02 * scale);
  };
  const gullPhase = TAU * now / 46;
  drawGull(-2.8 + Math.cos(gullPhase) * 0.65, 2.55 + Math.sin(gullPhase * 2) * 0.16, 2.48 + Math.sin(gullPhase) * 0.28, gullPhase * 18, 0.20);
  drawGull(3.0 + Math.cos(gullPhase + 1.7) * 0.50, 2.85 + Math.sin(gullPhase * 2 + 1.7) * 0.13, -2.60 + Math.sin(gullPhase + 1.7) * 0.24, gullPhase * 16 + 1.7, 0.16);

  // A blinking harbor marker and the lantern on the pier animate on separate phases.
  tube([3.62, 0.15, -2.72], [3.62, 0.92, -2.72], 0.045, '#453e36', 7, 0.035);
  cone(3.62, 0.92, -2.72, 0.15, 0.18, Math.sin(TAU * 9 * now / 46) > 0 ? '#e3b858' : '#b67a45', 0.07, 6);
  for (let i = 0; i < 4; i++) {
    const x = 3.0 + i * 0.38;
    sphere(x, 0.18 + 0.025 * Math.sin(now * 1.4 + i), -3.75 + (i % 2) * 0.22,
      0.09, 0.04, 0.07, i % 2 ? '#6ba0a2' : '#8bb6ae', 6, 3);
  }
  return m;
}
