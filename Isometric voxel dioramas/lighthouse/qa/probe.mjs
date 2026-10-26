import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const root = path.resolve(project, '..');
const sceneSource = fs.readFileSync(path.join(project, 'scene.js'), 'utf8');
const gallery = fs.readFileSync(path.join(root, 'scenes.html'), 'utf8');
const inline = gallery.match(/<script>\s*([\s\S]*?)<\/script>/);
if (!inline) throw new Error('Could not find the gallery inline script.');
new Function(inline[1]);
const build = Function(`${sceneSource}\nreturn buildLighthouseScene;`)();

function makeProbe() {
  const record = { counts: { tri: 0, quad: 0, cube: 0, tube: 0, sphere: 0, cone: 0 }, bounds: [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], signature: [] };
  const addPoint = (p, pad = 0) => {
    if (!Array.isArray(p) || p.length < 3 || !p.slice(0, 3).every(Number.isFinite)) throw new Error(`Invalid point: ${JSON.stringify(p)}`);
    record.bounds[0] = Math.min(record.bounds[0], p[0] - pad);
    record.bounds[1] = Math.min(record.bounds[1], p[1] - pad);
    record.bounds[2] = Math.min(record.bounds[2], p[2] - pad);
    record.bounds[3] = Math.max(record.bounds[3], p[0] + pad);
    record.bounds[4] = Math.max(record.bounds[4], p[1] + pad);
    record.bounds[5] = Math.max(record.bounds[5], p[2] + pad);
  };
  const g = { m: record };
  g.tri = (...args) => { record.counts.tri++; args.slice(0, 3).forEach(point => addPoint(point)); record.signature.push(['tri', ...args]); };
  g.quad = (...args) => { record.counts.quad++; args.slice(0, 4).forEach(point => addPoint(point)); record.signature.push(['quad', ...args]); };
  g.cube = (x, y, z, w, h, d, color) => {
    record.counts.cube++;
    [[x, y, z], [x + w, y + h, z + d]].forEach(p => addPoint(p));
    record.signature.push(['cube', x, y, z, w, h, d, color]);
  };
  g.tube = (a, b, radius, color, segs, rEnd = radius) => {
    record.counts.tube++;
    [a, b].forEach(p => addPoint(p, Math.max(radius, rEnd)));
    record.signature.push(['tube', a, b, radius, color, segs, rEnd]);
  };
  g.sphere = (x, y, z, rx, ry, rz, color, segs, rings) => {
    record.counts.sphere++;
    addPoint([x, y, z]); addPoint([x - rx, y - ry, z - rz]); addPoint([x + rx, y + ry, z + rz]);
    record.signature.push(['sphere', x, y, z, rx, ry, rz, color, segs, rings]);
  };
  g.cone = (x, y, z, radius, height, color, rEnd = 0, segs = 12) => {
    record.counts.cone++;
    addPoint([x - radius, y, z - radius]); addPoint([x + radius, y + height, z + radius]);
    record.signature.push(['cone', x, y, z, radius, height, color, rEnd, segs]);
  };
  return { g, record };
}

const beats = [0, 9, 18, 28, 40, 45.9];
const samples = beats.map(seconds => {
  const { g, record } = makeProbe();
  build(g, seconds);
  const [minX, minY, minZ, maxX, maxY, maxZ] = record.bounds;
  if (minX < -5.05 || maxX > 5.05 || minZ < -5.05 || maxZ > 5.05 || minY < -1 || maxY > 5.5) {
    throw new Error(`Scene exceeds the authored frame at ${seconds}s: ${record.bounds.join(', ')}`);
  }
  return { seconds, counts: record.counts, bounds: record.bounds };
});

const first = makeProbe(), seam = makeProbe();
build(first.g, 0); build(seam.g, 46);
if (JSON.stringify(first.record.signature) !== JSON.stringify(seam.record.signature)) {
  throw new Error('Loop endpoints differ: t=0 and t=46 must build the same geometry.');
}

const reportPath = path.join(here, 'report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
report.checks.sceneScriptSyntax = 'pass';
report.checks.galleryInlineScriptSyntax = 'pass';
report.checks.geometryFiniteAtBeats = 'pass';
report.checks.loopSeamGeometry = 'pass';
report.beats = samples;
report.seam = { status: 'pass', comparedTimes: [0, 46], sameDrawCalls: true };
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'pass', beats: samples, seam: 't=0 matches t=46' }, null, 2));
