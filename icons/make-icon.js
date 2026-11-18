// To redraw the icon SVGs: node icons/make-icon.js icons
// Draws the site icon: a simplified emotions wheel (six slices, three rings).
const fs = require('fs');
const out = process.argv[2];
const CORES = [ // name, hue, slice size in degrees (matches the real wheel)
  ['Anger', 8, 80], ['Disgust', 80, 40], ['Sad', 212, 60],
  ['Happy', 44, 80], ['Surprise', 160, 40], ['Fear', 285, 60],
];
const pt = (r, d) => { const a = d * Math.PI / 180; return [(r * Math.sin(a)).toFixed(2), (-r * Math.cos(a)).toFixed(2)]; };
function sector(r1, r2, a1, a2) {
  const L = a2 - a1 > 180 ? 1 : 0;
  const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
  if (!r1) return `M0 0L${x1} ${y1}A${r2} ${r2} 0 ${L} 1 ${x2} ${y2}Z`;
  return `M${x1} ${y1}A${r2} ${r2} 0 ${L} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${L} 0 ${x4} ${y4}Z`;
}
function wheel(R) {
  const rings = [[0, R, 70]]; // one solid piece per slice
  let s = '', a = -40;
  const lines = [];
  for (const [, h, w] of CORES) {
    for (const [r1, r2, l] of rings) s += `<path d="${sector(r1, r2, a, a + w)}" fill="hsl(${h} 62% ${l}%)"/>`;
    lines.push(a);
    a += w;
  }
  const ink = '#2b2a27', sw = R * 0.035;
  for (const d of lines) { const [x, y] = pt(R, d); s += `<line x1="0" y1="0" x2="${x}" y2="${y}" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`; }
  s += `<circle r="${R}" fill="none" stroke="${ink}" stroke-width="${sw * 1.4}"/>`;
  return s;
}
// Tab icon: just the wheel, transparent around it.
fs.writeFileSync(out + '/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">${wheel(47)}</svg>\n`);
// Home-screen icon: wheel on the site's cream background, inside the safe zone phones crop to.
fs.writeFileSync(out + '/icon-square.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><rect x="-50" y="-50" width="100" height="100" fill="#f7f4ec"/>${wheel(38)}</svg>\n`);
