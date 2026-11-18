// Builds a flat index of every word on the wheel and draws the wheel as SVG.
// The wheel can rotate (to bring a selection to the right-hand side) and be
// spun by dragging its outer edge. Labels flip so they always read upright.

const SEG = 5; // degrees per outer-ring word (72 words x 5 = 360)
const START = -40; // where "Hurt" begins, in degrees clockwise from 12 o'clock
const R = { core: 140, mid: 310, outer: 490, grip: 532 };
const FOCUS_ANGLE = 90; // 3 o'clock: where a selected slice is turned to

// ---- Index ---------------------------------------------------------------
const NODES = [];
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
function childrenOf(id) {
  return NODES.filter((n) => n.parent === id);
}
function nodesForWord(word) {
  const w = word.trim().toLowerCase();
  return NODES.filter((n) => n.word.toLowerCase() === w);
}

// ---- Drawing -------------------------------------------------------------
const SVG_NS = "http://www.w3.org/2000/svg";
const norm360 = (a) => ((a % 360) + 360) % 360;

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
  if (r1 === 0) return `M0 0L${x1} ${y1}A${r2} ${r2} 0 ${large} 1 ${x2} ${y2}Z`;
  return `M${x1} ${y1}A${r2} ${r2} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${large} 0 ${x4} ${y4}Z`;
}

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

/**
 * Draw a wheel into `container`. onPick(node) is called when a word is chosen.
 * Returns { setHighlight(ids, leaf), focus(id), reset() }.
 *
 * Interaction:
 *  - Mouse: hover enlarges a slice; click selects; drag anywhere spins.
 *  - Touch: press and slide to preview slices, lift to select;
 *           press on the outer edge and slide to spin.
 */
function createWheel(container, { onPick }) {
  const SPIN_EDGE = R.outer - 30; // on touch, spinning starts from here outward
  let rot = 0; // current rotation of the wheel, in degrees
  let anim = null;
  const svg = el("svg", {
    viewBox: `${-R.grip - 4} ${-R.grip - 4} ${2 * R.grip + 8} ${2 * R.grip + 8}`,
    class: "wheel-svg",
    role: "img",
    "aria-label": "Emotions wheel. Use the search box or the list below to choose a word.",
  });
  const rotor = el("g", { class: "rotor" }, svg);
  container.appendChild(svg); // in the page early, so words can be measured
  const cells = {};
  const labels = []; // every label that needs to stay upright as the wheel turns
  const hue = Object.fromEntries(WHEEL.map((c) => [c.name, c.hue]));

  // Grip ring: the edge you can grab to spin the wheel.
  const grip = el("g", { class: "grip" }, rotor);
  el("circle", { r: (R.outer + R.grip) / 2, class: "grip-band", "stroke-width": R.grip - R.outer }, grip);
  for (let a = 0; a < 360; a += 5) {
    const [x1, y1] = pt(R.outer + 12, a);
    const [x2, y2] = pt(R.grip - 10, a);
    el("line", { x1, y1, x2, y2, class: "grip-tick" }, grip);
  }

  const ringOf = (level) => (level === 0 ? [0, R.core] : level === 1 ? [R.core, R.mid] : [R.mid, R.outer]);

  // A radial label centered between radii lr1 and r2.
  function addLabel(parent, n, lr1, r2, mid, size) {
    const [x, y] = pt((lr1 + r2) / 2, mid);
    const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-size": size.toFixed(1) }, parent);
    t.textContent = n.word.toUpperCase();
    const L = { t, x: x.toFixed(1), y: y.toFixed(1), mid, flipped: null };
    labels.push(L);
    flip(L);
    return L;
  }
  const innerR = (n) => (n.level === 0 ? 22 : ringOf(n.level)[0]); // core labels stay clear of the very center

  const order = [...NODES].sort((a, b) => b.level - a.level);
  for (const n of order) {
    const [r1, r2] = ringOf(n.level);
    const g = el("g", { class: `cell lvl${n.level}`, "data-id": n.id, style: `--h:${hue[n.core]}` }, rotor);
    el("path", { d: sectorPath(r1, r2, n.a1, n.a2) }, g);
    cells[n.id] = { g, L: addLabel(g, n, innerR(n), r2, (n.a1 + n.a2) / 2, 20) };
    el("title", {}, g).textContent = pathOf(n.id).map((p) => p.word).join(" › ");
  }
  // Every word on the wheel gets the same size, like the printed wheel:
  // the largest size at which the longest word still fits its ring.
  const LEN20 = {}; // each word's length at size 20
  let BASE = 21;
  for (const n of NODES) {
    let len = 0;
    try { len = cells[n.id].L.t.getComputedTextLength(); } catch {}
    LEN20[n.id] = len > 0 ? len : n.word.length * 13.5;
    const room = ringOf(n.level)[1] - innerR(n) - 16;
    BASE = Math.min(BASE, (20 * room) / LEN20[n.id]);
  }
  for (const n of NODES) cells[n.id].L.t.setAttribute("font-size", BASE.toFixed(1));
  for (const id in cells) cells[id] = cells[id].g;

  const dividers = el("g", { class: "dividers" }, rotor);
  for (const c of NODES.filter((n) => n.level === 0)) {
    const [x, y] = pt(R.outer, c.a1);
    el("line", { x1: 0, y1: 0, x2: x, y2: y, class: "divider" }, dividers);
  }
  el("circle", { r: R.outer, class: "rim" }, rotor);
  // Enlarged copies of slices are drawn on these layers, on top of everything.
  // They ignore the pointer, so they never get in the way of tapping.
  const pickLayer = el("g", { class: "pop-layer" }, rotor);
  const hoverLayer = el("g", { class: "pop-layer" }, rotor);

  // Shows the word under your finger while sliding on a touch screen.
  const readout = document.createElement("div");
  readout.className = "readout";
  readout.hidden = true;
  container.appendChild(readout);

  // ---- Enlarged slices ----
  // Every word grows by the same amount. A slice may grow sideways within its
  // own ring and outward past it, but never inward over the ring inside it.
  const HOVER_SCALE = 1.6;
  const PICK_SCALE = 1.3;
  function drawPop(layer, n, scale) {
    for (const L of [...labels]) if (layer.contains(L.t)) labels.splice(labels.indexOf(L), 1);
    layer.replaceChildren();
    if (!n) return;
    const size = BASE * scale;
    const [r1, ringEnd] = ringOf(n.level);
    const lr1 = innerR(n);
    const r2 = Math.max(ringEnd, lr1 + (LEN20[n.id] * size) / 20 + 28);
    const mid = (n.a1 + n.a2) / 2;
    const w = n.a2 - n.a1;
    const needed = (((size * 1.6) / (lr1 + 8)) * 180) / Math.PI; // wide enough for the letters
    const nw = n.level === 0 ? w : Math.max(w, needed);
    const g = el("g", { class: `pop lvl${n.level}`, style: `--h:${hue[n.core]}` }, layer);
    el("path", { d: sectorPath(r1, r2, mid - nw / 2, mid + nw / 2) }, g);
    addLabel(g, n, lr1, r2, mid, size);
  }
  let hovered = null;
  let picked = null;
  function setHovered(n) {
    if (n === hovered) return;
    hovered = n;
    drawPop(hoverLayer, n, HOVER_SCALE);
    for (const g of Object.values(cells)) g.classList.remove("hover");
    if (n) cells[n.id].classList.add("hover");
  }

  // ---- Rotation ----
  function flip(L) {
    // Flip based on where the label ends up on screen, so it reads upright.
    const flipped = norm360(L.mid + rot) > 180;
    if (flipped === L.flipped) return;
    L.flipped = flipped;
    const a = flipped ? L.mid + 90 : L.mid - 90;
    L.t.setAttribute("transform", `translate(${L.x} ${L.y}) rotate(${a.toFixed(1)})`);
  }
  function setRot(r) {
    rot = r;
    rotor.setAttribute("transform", `rotate(${rot.toFixed(2)})`);
    labels.forEach(flip);
  }
  let locked = false; // when true, the wheel resists spinning and springs back
  let home = 0; // where the wheel rests when locked
  function animateTo(target, bounce) {
    cancelAnimationFrame(anim);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = rot;
    const dur = Math.min(900, 300 + Math.abs(target - from) * 2.5);
    if (reduce || Math.abs(target - from) < 0.1) return setRot(target);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = bounce
        ? 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2) // overshoot a little, then settle
        : p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setRot(from + (target - from) * e);
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function focus(id) {
    const n = BY_ID[id];
    if (!n) return;
    let target = FOCUS_ANGLE - (n.a1 + n.a2) / 2;
    target += Math.round((rot - target) / 360) * 360; // take the shortest way round
    home = target;
    animateTo(target);
  }
  setRot(0);

  // ---- Finding the slice under the pointer (by geometry) ----
  function local(e) {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return { r: Math.hypot(p.x, p.y), a: (Math.atan2(p.x, -p.y) * 180) / Math.PI };
  }
  function nodeAt(p) {
    if (p.r > R.outer) return null;
    const level = p.r < R.core ? 0 : p.r < R.mid ? 1 : 2;
    const a = START + norm360(p.a - rot - START);
    return NODES.find((n) => n.level === level && a >= n.a1 && a < n.a2) || null;
  }

  // ---- Pointer handling ----
  let down = null;
  const isMouse = (e) => e.pointerType === "mouse";
  const showReadout = (n) => {
    readout.hidden = !n;
    if (n) readout.textContent = pathOf(n.id).map((x) => x.word).join(" › ");
  };

  svg.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const p = local(e);
    const mode = isMouse(e) ? "mouse" : p.r > SPIN_EDGE ? "spin" : "scrub";
    down = { mode, last: p.a, x: e.clientX, y: e.clientY, moved: false, node: nodeAt(p) };
    svg.setPointerCapture(e.pointerId);
    if (mode === "scrub") {
      setHovered(down.node);
      showReadout(down.node);
    }
  });

  svg.addEventListener("pointermove", (e) => {
    const p = local(e);
    if (!down) {
      if (isMouse(e)) setHovered(nodeAt(p));
      return;
    }
    if (down.mode === "scrub") {
      const n = nodeAt(p);
      setHovered(n);
      showReadout(n);
      return;
    }
    // mouse or spin: spin once the pointer has moved a little
    if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) return;
    if (!down.moved) {
      down.moved = true;
      cancelAnimationFrame(anim);
      svg.classList.add("spinning");
      setHovered(null);
    }
    let d = p.a - down.last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    down.last = p.a;
    if (locked) {
      // Resist: follow the drag only a little, like pulling against a spring.
      down.pull = (down.pull || 0) + d;
      setRot(home + 14 * Math.tanh(down.pull / 40));
    } else setRot(rot + d);
  });

  svg.addEventListener("pointerup", (e) => {
    if (!down) return;
    let chosen = null;
    if (down.mode === "scrub") chosen = hovered;
    else if (!down.moved) chosen = down.node;
    const wasMouse = down.mode === "mouse";
    if (down.moved && locked) animateTo(home, true);
    down = null;
    svg.classList.remove("spinning");
    showReadout(null);
    if (!wasMouse) setHovered(null);
    if (chosen && onPick) onPick(chosen);
    if (wasMouse) setHovered(nodeAt(local(e)));
  });
  svg.addEventListener("pointercancel", () => {
    if (down && down.moved && locked) animateTo(home, true);
    down = null;
    svg.classList.remove("spinning");
    showReadout(null);
    setHovered(null);
  });
  svg.addEventListener("pointerleave", (e) => {
    if (isMouse(e) && !down) setHovered(null);
  });
  // Stop the page from scrolling or zooming while a finger is on the wheel.
  svg.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });

  return {
    // ids: the selected word and its parents; leaf: the selected word itself (shown larger)
    setHighlight(ids, leaf) {
      for (const g of Object.values(cells)) g.classList.remove("on");
      for (const id of ids) cells[id] && cells[id].classList.add("on");
      svg.classList.toggle("has-on", ids.length > 0);
      picked = leaf ? BY_ID[leaf] : null;
      // Only outer-ring selections stay enlarged; inner ones go back to normal size.
      drawPop(pickLayer, picked && picked.level === 2 ? picked : null, PICK_SCALE);
    },
    focus,
    setLocked(v) {
      locked = v;
    },
    reset: () => animateTo(0),
  };
}
