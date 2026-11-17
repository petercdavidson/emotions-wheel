// Main app. Nothing is stored: everything lives in memory and is gone
// when the page is closed or reloaded.

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CORE = Object.fromEntries(WHEEL.map((c) => [c.name, c]));
  const isPhone = () => window.matchMedia("(max-width: 820px)").matches;

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // ---------- Olympian Mode (monochrome) ----------
  $("#mono").addEventListener("change", (e) => document.documentElement.classList.toggle("mono", e.target.checked));

  // ---------- First: basic needs (pop-up with a short countdown) ----------
  $("#basics").innerHTML = BASICS.map((b) => `<li>${esc(b)}?</li>`).join("");
  (function countdown() {
    const go = $("#gate-go");
    let n = 5;
    const tick = () => {
      if (n > 0) {
        go.textContent = `Continue in ${n}…`;
        n--;
        setTimeout(tick, 1000);
      } else {
        go.textContent = "I've checked. Continue";
        go.disabled = false;
        go.focus();
      }
    };
    tick();
    go.addEventListener("click", () => {
      $("#gate").hidden = true;
      $(".page").inert = false;
    });
  })();

  // ---------- State ----------
  const blankThought = () => ({ feeling: "", connected: "", body: "", action: "" });
  let state;
  function resetState() {
    state = {
      active: "primary", // which emotion a tap on the wheel sets
      cantGive: false,
      primary: { id: null, f: blankThought() },
      secondary: { id: null, f: blankThought() },
    };
  }
  resetState();

  // ---------- Wheel ----------
  const wheel = createWheel($("#main-wheel"), { onPick: (n) => pick(n.id) });

  function pick(id, which) {
    which = which || (state.cantGive ? state.active : "primary");
    const s = state[which];
    // Autofill the first three parts, unless you've typed your own words there.
    const before = s.id ? autofill(s.id) : {};
    const after = autofill(id);
    for (const k of Object.keys(after)) {
      const cur = s.f[k].trim().toLowerCase();
      if (!cur || cur === (before[k] || "").toLowerCase()) s.f[k] = after[k];
    }
    s.id = id;
    state.active = which;
    showActiveOnWheel();
    renderPanel();
  }

  const ROOT_NOUN = { Anger: "anger", Disgust: "disgust", Sad: "sadness", Happy: "happiness", Surprise: "surprise", Fear: "fear" };
  function autofill(id) {
    const n = BY_ID[id];
    return { feeling: n.word.toLowerCase(), connected: ROOT_NOUN[n.core], body: CORE[n.core].wants };
  }

  function showActiveOnWheel() {
    const id = state[state.active].id;
    wheel.setHighlight(id ? pathOf(id).map((p) => p.id) : []);
    if (id) wheel.focus(id);
    renderChoosing();
  }

  function setActive(which) {
    if (state.active === which) return;
    state.active = which;
    $$(".emo").forEach((c) => c.classList.toggle("active", c.dataset.which === which));
    showActiveOnWheel();
  }

  // Shows which emotion a tap on the wheel will set (only when there are two).
  function renderChoosing() {
    const box = $("#choosing");
    box.hidden = !state.cantGive;
    if (!state.cantGive) return;
    const label = (w) => (state[w].id ? BY_ID[state[w].id].word : "not chosen yet");
    box.innerHTML = `<span class="small">Tapping the wheel sets:</span>
      <div class="seg" role="group" aria-label="Which emotion the wheel sets">
        ${["primary", "secondary"]
          .map(
            (w) => `<button data-set-active="${w}" aria-pressed="${state.active === w}">
              ${w === "primary" ? "Emotion" : "Secondary"}<span class="seg-sub">${esc(label(w))}</span></button>`
          )
          .join("")}
      </div>`;
  }
  $("#choosing").addEventListener("click", (e) => {
    const b = e.target.closest("[data-set-active]");
    if (b) setActive(b.dataset.setActive);
  });

  // ---------- Search & list ----------
  const uniqueWords = [...new Set(NODES.map((n) => n.word))].sort();
  $("#all-words").innerHTML = uniqueWords.map((w) => `<option value="${esc(w)}">`).join("");
  $("#wheel-search").addEventListener("input", (e) => {
    const matches = nodesForWord(e.target.value);
    if (matches.length) {
      pick(matches[0].id);
      e.target.value = "";
      e.target.blur();
    }
  });

  $("#word-list").innerHTML = WHEEL.map(
    (core) => `
    <div class="list-core" style="--h:${core.hue}">
      <h3><button class="linkish" data-node="${esc(core.name)}">${esc(core.name)}</button>
        <span class="muted small">wants ${esc(core.wants)}</span></h3>
      <ul>${core.children
        .map(
          ([mid, outers]) => `<li><button class="linkish strong" data-node="${esc(core.name + "/" + mid)}">${esc(mid)}</button>:
          ${outers.map((o) => `<button class="linkish" data-node="${esc(core.name + "/" + mid + "/" + o)}">${esc(o)}</button>`).join(", ")}</li>`
        )
        .join("")}</ul>
    </div>`
  ).join("");
  $("#word-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-node]");
    if (!b) return;
    pick(b.dataset.node);
    $("#main-wheel").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#wants-list").innerHTML = WHEEL.map((c) => `<li><strong>${esc(c.name)}</strong> wants ${esc(c.wants)}.</li>`).join("");

  // ---------- Panel ----------
  const panel = $("#panel");

  function sentence(f) {
    const b = (v) => (v && v.trim() ? v.trim().replace(/[.,;:]+$/, "") : "___");
    const a = f.action ? f.action.trim() : "";
    const action = a ? (a[0].toUpperCase() + a.slice(1)).replace(/([^.!?])$/, "$1.") : "___.";
    return `I'm feeling ${b(f.feeling)}. This is connected to ${b(f.connected)}. My body needs ${b(f.body)}. ${action}`;
  }

  function fullText() {
    let t = sentence(state.primary.f);
    if (state.cantGive && state.primary.id) {
      t += `\n\nI can't give ${BY_ID[state.primary.id].core.toLowerCase()} what it wants right now.`;
      if (state.secondary.id) t += `\n\nSecondary emotion: ${sentence(state.secondary.f)}`;
    }
    return t;
  }

  const FIELDS = [
    ["feeling", "I'm feeling…"],
    ["connected", "This is connected to…"],
    ["body", "My body needs…"],
    ["action", "What I'm going to do about it:"],
  ];

  function emotionCard(which) {
    const s = state[which];
    const n = BY_ID[s.id];
    const core = CORE[n.core];
    const need = NEEDS[n.core];
    const path = pathOf(n.id);
    const others = nodesForWord(n.word).filter((o) => o.id !== n.id);
    const kids = childrenOf(n.id);
    return `
    <article class="card emo ${state.active === which ? "active" : ""}" data-which="${which}" style="--h:${core.hue}">
      ${which === "secondary" ? `<div class="emo-label">Secondary emotion</div>` : ""}
      <nav class="crumbs" aria-label="Where this word sits">${path
        .map((p, i) =>
          i === path.length - 1 ? `<span>${esc(p.word)}</span>` : `<button class="linkish" data-pick="${esc(p.id)}">${esc(p.word)}</button> ›`
        )
        .join(" ")}</nav>
      <h2 class="big-word">${esc(n.word)}</h2>
      ${
        kids.length
          ? `<div class="specific">
              <p class="specific-q">Can you get more specific?</p>
              <div class="specific-opts">${kids
                .map((k) => `<button class="opt" data-pick="${esc(k.id)}">${esc(k.word)}</button>`)
                .join("")}</div>
            </div>`
          : ""
      }
      <p class="wants"><strong>${esc(core.name)}</strong> wants <strong>${esc(core.wants)}</strong>.</p>
      ${need.guidance ? `<p class="guidance">${esc(need.guidance)}</p>` : ""}
      ${
        others.length
          ? `<p class="muted small">Also on the wheel under ${others
              .map((o) => `<button class="linkish" data-pick="${esc(o.id)}">${esc(pathOf(o.id).slice(0, -1).map((p) => p.word).join(" › "))}</button>`)
              .join(" and ")}.</p>`
          : ""
      }
      <div class="thought">
        <div class="thought-head">
          <h3>Complete the whole thought</h3>
        </div>
        ${FIELDS.map(
          ([k, label]) => `<label class="field">${label}
            ${
              k === "action"
                ? `<textarea rows="2" data-k="${k}">${esc(s.f[k])}</textarea>`
                : `<input type="text" data-k="${k}" value="${esc(s.f[k])}">`
            }</label>`
        ).join("")}
        <details class="ideas">
          <summary><span aria-hidden="true">?</span> Ideas</summary>
          <p class="ideas-note">General suggestions written for this site. These are interpretations, not therapeutic guidance.</p>
          <ul>${need.ideas.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        </details>
      </div>
      ${
        which === "primary"
          ? `<label class="check-inline cant"><input type="checkbox" id="cant-give" ${state.cantGive ? "checked" : ""}>
              I can't give this emotion what it wants right now</label>
            ${
              state.cantGive
                ? `<div class="cant-body">
                    ${need.ifNot ? `<p class="guidance">${esc(need.ifNot)}</p>` : ""}
                    <p>What's left? Is there a secondary emotion you're feeling that you can tend to as well?</p>
                    ${
                      state.secondary.id
                        ? ""
                        : `<button class="btn primary" id="choose-secondary">Choose it on the wheel</button>`
                    }
                  </div>`
                : ""
            }`
          : ""
      }
    </article>`;
  }

  function renderPanel() {
    if (!state.primary.id) {
      panel.innerHTML = `<div class="card empty"><p>Tap a feeling on the wheel.</p></div>`;
      return;
    }
    panel.innerHTML = `
      ${emotionCard("primary")}
      ${state.cantGive && state.secondary.id ? emotionCard("secondary") : ""}
      <section class="card copy">
        <h3>Your whole thought</h3>
        <blockquote class="sentence" id="full-text"></blockquote>
        <div class="btn-row">
          <button class="btn primary" id="copy">Copy</button>
          <button class="btn ghost" id="start-over">Start over</button>
        </div>
        <p class="muted small">Say it out loud. Say it out loud into a mirror.</p>
      </section>`;
    $("#full-text").textContent = fullText();
    renderChoosing();
  }

  // Typing in a field: update state and the preview without redrawing.
  panel.addEventListener("input", (e) => {
    const k = e.target.dataset.k;
    const card = e.target.closest(".emo");
    if (!k || !card) return;
    state[card.dataset.which].f[k] = e.target.value;
    $("#full-text").textContent = fullText();
  });

  // Working in a card makes it the one the wheel shows.
  const activate = (e) => {
    const card = e.target.closest(".emo");
    if (card && !e.target.closest("[data-pick]")) setActive(card.dataset.which);
  };
  panel.addEventListener("focusin", activate);
  panel.addEventListener("pointerdown", activate);

  panel.addEventListener("change", (e) => {
    if (e.target.id !== "cant-give") return;
    state.cantGive = e.target.checked;
    if (!state.cantGive) {
      state.secondary = { id: null, f: blankThought() };
      state.active = "primary";
      showActiveOnWheel();
    }
    renderPanel();
  });

  panel.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]");
    if (p) {
      pick(p.dataset.pick, p.closest(".emo").dataset.which);
      return;
    }
    if (e.target.id === "choose-secondary") {
      state.active = "secondary";
      showActiveOnWheel();
      if (isPhone()) $("#choosing").scrollIntoView({ behavior: "smooth", block: "start" });
      toast("Tap the secondary emotion on the wheel");
    }
    if (e.target.id === "copy") copyText(fullText());
    if (e.target.id === "start-over") {
      const typed = ["primary", "secondary"].some((w) => state[w].f.action.trim());
      if (typed && !confirm("Clear everything and start over?")) return;
      resetState();
      wheel.setHighlight([]);
      wheel.reset();
      renderPanel();
      renderChoosing();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("Copied to clipboard");
  }

  renderPanel();
})();
