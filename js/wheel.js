// Builds a flat index of every word on the wheel and draws the wheel as SVG.
// The wheel can rotate (to bring a selection to the right-hand side) and be
// spun by dragging its outer edge. Labels flip so they always read upright.

const SEG = 5; // degrees per outer-ring word (72 words x 5 = 360)
const START = -40; // where "Hurt" begins, in degrees clockwise from 12 o'clock
const R = { core: 150, mid: 305, outer: 490, grip: 532 };
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
 * Draw a wheel into `container`. onPick(node) is called when a word is tapped.
 * Returns { setHighlight(ids), focus(id), reset() }.
 */
function createWheel(container, { onPick }) {
  const svg = el("svg", {
    viewBox: `${-R.grip - 4} ${-R.grip - 4} ${2 * R.grip + 8} ${2 * R.grip + 8}`,
    class: "wheel-svg",
    role: "img",
    "aria-label": "Emotions wheel. Use the search box or the list below to choose a word.",
  });
  const rotor = el("g", { class: "rotor" }, svg);
  const cells = {};
  const labels = [];
  const hue = Object.fromEntries(WHEEL.map((c) => [c.name, c.hue]));

  // Grip ring: the part you can grab to spin the wheel.
  const grip = el("g", { class: "grip" }, rotor);
  el("circle", { r: (R.outer + R.grip) / 2, class: "grip-band", "stroke-width": R.grip - R.outer }, grip);
  for (let a = 0; a < 360; a += 5) {
    const [x1, y1] = pt(R.outer + 12, a);
    const [x2, y2] = pt(R.grip - 10, a);
    el("line", { x1, y1, x2, y2, class: "grip-tick" }, grip);
  }

  const order = [...NODES].sort((a, b) => b.level - a.level);
  for (const n of order) {
    const [r1, r2] = n.level === 0 ? [0, R.core] : n.level === 1 ? [R.core, R.mid] : [R.mid, R.outer];
    const g = el("g", { class: `cell lvl${n.level}`, "data-id": n.id, style: `--h:${hue[n.core]}` }, rotor);
    el("path", { d: sectorPath(r1, r2, n.a1, n.a2) }, g);

    const mid = (n.a1 + n.a2) / 2;
    const lr1 = n.level === 0 ? 22 : r1; // keep core labels clear of the very center
    const r = (lr1 + r2) / 2;
    const [x, y] = pt(r, mid);
    const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, g);
    t.textContent = n.word.toUpperCase();
    const maxLen = r2 - lr1 - 18;
    const base = [26, 23, 21][n.level];
    const est = n.word.length * base * 0.66;
    t.setAttribute("font-size", est > maxLen ? ((base * maxLen) / est).toFixed(1) : base);
    labels.push({ t, x: x.toFixed(1), y: y.toFixed(1), mid, flipped: null });
    el("title", {}, g).textContent = pathOf(n.id).map((p) => p.word).join(" › ");
    cells[n.id] = g;
  }
  const dividers = el("g", { class: "dividers" }, rotor);
  for (const c of NODES.filter((n) => n.level === 0)) {
    const [x, y] = pt(R.outer, c.a1);
    el("line", { x1: 0, y1: 0, x2: x, y2: y, class: "divider" }, dividers);
  }
  el("circle", { r: R.outer, class: "rim" }, rotor);
  container.appendChild(svg);

  // ---- Rotation ----
  let rot = 0;
  let anim = null;
  function setRot(r) {
    rot = r;
    rotor.setAttribute("transform", `rotate(${rot.toFixed(2)})`);
    for (const L of labels) {
      // Flip based on where the label ends up on screen, so it reads upright.
      const flipped = norm360(L.mid + rot) > 180;
      if (flipped === L.flipped) continue;
      L.flipped = flipped;
      const a = flipped ? L.mid + 90 : L.mid - 90;
      L.t.setAttribute("transform", `translate(${L.x} ${L.y}) rotate(${a.toFixed(1)})`);
    }
  }
  function animateTo(target) {
    cancelAnimationFrame(anim);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = rot;
    const dur = Math.min(900, 300 + Math.abs(target - from) * 2.5);
    if (reduce || Math.abs(target - from) < 0.1) return setRot(target);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
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
    animateTo(target);
  }
  setRot(0);

  // ---- Tapping and spinning ----
  function local(e) {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return { r: Math.hypot(p.x, p.y), a: (Math.atan2(p.x, -p.y) * 180) / Math.PI };
  }
  let down = null;
  svg.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const p = local(e);
    const cell = e.target.closest(".cell");
    down = { id: cell && cell.dataset.id, canSpin: p.r > R.mid, last: p.a, startX: e.clientX, startY: e.clientY, moved: false };
    if (down.canSpin) svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!down || !down.canSpin) return;
    const p = local(e);
    if (!down.moved && Math.hypot(e.clientX - down.startX, e.clientY - down.startY) < 6) return;
    if (!down.moved) {
      down.moved = true;
      cancelAnimationFrame(anim);
      svg.classList.add("spinning");
    }
    let d = p.a - down.last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    down.last = p.a;
    setRot(rot + d);
  });
  const end = () => {
    if (down && !down.moved && down.id) onPick && onPick(BY_ID[down.id]);
    down = null;
    svg.classList.remove("spinning");
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", () => {
    down = null;
    svg.classList.remove("spinning");
  });
  // On touch screens, stop the page from scrolling when you grab the edge to spin.
  svg.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      if (t && local(t).r > R.mid) e.preventDefault();
    },
    { passive: false }
  );

  let picked = null;
  // Pop a slice up larger while the mouse is over it, so small text is readable.
  // Only one slice is ever popped; it's tracked here rather than with
  // enter/leave events, which browsers drop when an element is moved.
  let hovered = null;
  function setHovered(g) {
    if (g === hovered) return;
    if (hovered) {
      hovered.classList.remove("pop");
      if (hovered !== picked) lower(hovered);
    }
    hovered = g;
    if (g) {
      g.classList.add("pop");
      rotor.appendChild(g); // draw on top of its neighbours
    } else raisePicked();
  }
  svg.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || (down && down.moved)) return setHovered(null);
    setHovered(e.target.closest ? e.target.closest(".cell") : null);
  });
  svg.addEventListener("pointerleave", () => setHovered(null));
  const lower = (g) => rotor.insertBefore(g, dividers); // back under the divider lines
  function raisePicked() {
    if (picked) rotor.appendChild(picked);
  }

  return {
    // ids: the selected word and its parents; leaf: the selected word itself (shown larger)
    setHighlight(ids, leaf) {
      for (const g of Object.values(cells)) g.classList.remove("on", "picked");
      for (const id of ids) cells[id] && cells[id].classList.add("on");
      svg.classList.toggle("has-on", ids.length > 0);
      if (picked && picked !== hovered) lower(picked);
      picked = leaf ? cells[leaf] : null;
      if (picked) picked.classList.add("picked");
      raisePicked();
      if (hovered) rotor.appendChild(hovered); // a popped slice stays on top
    },
    focus,
    reset: () => animateTo(0),
  };
}
