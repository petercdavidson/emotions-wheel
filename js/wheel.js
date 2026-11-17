// Builds a flat index of every word on the wheel and draws the wheel as SVG.

const SEG = 5; // degrees per outer-ring word (72 words x 5 = 360)
const START = -40; // where "Hurt" begins, in degrees clockwise from 12 o'clock
const R = { core: 150, mid: 305, outer: 490 };

// ---- Index ---------------------------------------------------------------
const NODES = []; // every word, with its place on the wheel
const BY_ID = {};

(function buildIndex() {
  let angle = START;
  for (const core of WHEEL) {
    const coreNode = { id: core.name, word: core.name, level: 0, core: core.name, parent: null, a1: angle };
    NODES.push(coreNode);
    for (const [mid, outers] of core.children) {
      const midNode = { id: `${core.name}/${mid}`, word: mid, level: 1, core: core.name, parent: coreNode.id, a1: angle };
      NODES.push(midNode);
      for (const outer of outers) {
        NODES.push({
          id: `${midNode.id}/${outer}`, word: outer, level: 2, core: core.name,
          parent: midNode.id, a1: angle, a2: angle + SEG,
        });
        angle += SEG;
      }
      midNode.a2 = angle;
    }
    coreNode.a2 = angle;
  }
  for (const n of NODES) BY_ID[n.id] = n;
})();

function pathOf(id) {
  const out = [];
  for (let n = BY_ID[id]; n; n = BY_ID[n.parent]) out.unshift(n);
  return out;
}

function nodesForWord(word) {
  const w = word.trim().toLowerCase();
  return NODES.filter((n) => n.word.toLowerCase() === w);
}

// ---- Drawing -------------------------------------------------------------
const SVG_NS = "http://www.w3.org/2000/svg";

function pt(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

function sectorPath(r1, r2, a1, a2) {
  const large = a2 - a1 > 180 ? 1 : 0;
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r2, a2);
  const [x3, y3] = pt(r1, a2);
  const [x4, y4] = pt(r1, a1);
  if (r1 === 0) {
    return `M0 0L${x1} ${y1}A${r2} ${r2} 0 ${large} 1 ${x2} ${y2}Z`;
  }
  return `M${x1} ${y1}A${r2} ${r2} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${large} 0 ${x4} ${y4}Z`;
}

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

/**
 * Draw a wheel into `container`.
 * onPick(node) is called when a word is tapped.
 * Returns an object with setHighlight(ids) and setMarked(ids).
 */
function createWheel(container, { onPick }) {
  const svg = el("svg", {
    viewBox: "-500 -500 1000 1000",
    class: "wheel-svg",
    role: "img",
    "aria-label": "Emotions wheel. Use the search box or the list below to choose a word.",
  });
  const cells = {};
  const coreHue = Object.fromEntries(WHEEL.map((c) => [c.name, c.hue]));

  // Draw outer rings first so inner labels sit on top.
  const order = [...NODES].sort((a, b) => b.level - a.level);
  for (const n of order) {
    let [r1, r2] = n.level === 0 ? [0, R.core] : n.level === 1 ? [R.core, R.mid] : [R.mid, R.outer];
    const g = el("g", { class: `cell lvl${n.level}`, "data-id": n.id, style: `--h:${coreHue[n.core]}` }, svg);
    el("path", { d: sectorPath(r1, r2, n.a1, n.a2) }, g);

    const mid = (n.a1 + n.a2) / 2;
    const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, g);
    t.textContent = n.word.toUpperCase();
    {
      if (n.level === 0) r1 = 22; // keep core labels clear of the very center
      const r = (r1 + r2) / 2;
      const [x, y] = pt(r, mid);
      const norm = ((mid % 360) + 360) % 360;
      const rot = norm <= 180 ? mid - 90 : mid + 90; // keep text right-side up
      t.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
      // Shrink long words so they fit their ring.
      const maxLen = r2 - r1 - 18;
      const base = [26, 23, 21][n.level];
      const est = n.word.length * base * 0.66;
      if (est > maxLen) t.setAttribute("font-size", (base * maxLen / est).toFixed(1));
      else t.setAttribute("font-size", base);
    }
    const title = el("title", {}, g);
    title.textContent = pathOf(n.id).map((p) => p.word).join(" › ");
    g.addEventListener("click", () => onPick && onPick(n));
    cells[n.id] = g;
  }
  // Bold dividers between core emotions.
  for (const c of NODES.filter((n) => n.level === 0)) {
    const [x, y] = pt(R.outer, c.a1);
    el("line", { x1: 0, y1: 0, x2: x, y2: y, class: "divider" }, svg);
  }
  el("circle", { r: R.outer, class: "rim" }, svg);
  container.appendChild(svg);

  function setClass(cls, ids) {
    for (const g of Object.values(cells)) g.classList.remove(cls);
    for (const id of ids) cells[id] && cells[id].classList.add(cls);
    svg.classList.toggle(`has-${cls}`, ids.length > 0);
  }
  return {
    setHighlight: (ids) => setClass("on", ids),
    setMarked: (ids) => setClass("marked", ids),
  };
}
