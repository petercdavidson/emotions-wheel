// Main app. Nothing is stored: everything lives in memory and is gone
// when the page is closed or reloaded.

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CORE = Object.fromEntries(WHEEL.map((c) => [c.name, c]));
  const ROOT_NOUN = { Anger: "anger", Disgust: "disgust", Sad: "sadness", Happy: "happiness", Surprise: "surprise", Fear: "fear" };
  const isPhone = () => window.matchMedia("(max-width: 820px)").matches;

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // ---------- Display settings (the only things remembered between visits) ----------
  for (const [id, key] of [["dark", "ew.dark"], ["mono", "ew.mono"]]) {
    const box = $("#" + id);
    box.checked = document.documentElement.classList.contains(id);
    box.addEventListener("change", () => {
      document.documentElement.classList.toggle(id, box.checked);
      try {
        localStorage.setItem(key, box.checked ? "1" : "0");
      } catch {}
    });
  }

  // ---------- First: basic needs (pop-up with a short countdown) ----------
  $("#basics").innerHTML = BASICS.map(
    (b) => `<li><button type="button" class="basic" data-fx="${b.toLowerCase()}">
      <span class="cracks" aria-hidden="true"></span><span class="basic-label">${esc(b)}?</span></button></li>`
  ).join("");

  // Just for fun while the countdown runs. Nothing is selected or recorded.
  function spawn(btn, cls, text, style) {
    const s = document.createElement("span");
    s.className = `fx ${cls}`;
    s.setAttribute("aria-hidden", "true");
    s.textContent = text;
    Object.assign(s.style, style);
    btn.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
    setTimeout(() => s.remove(), 3000);
  }
  function restart(btn, cls) {
    btn.classList.remove(cls);
    void btn.offsetWidth; // let the animation play again
    btn.classList.add(cls);
  }
  const EFFECTS = {
    tired(btn) {
      restart(btn, "fx-tired");
      [["z", 0, 14], ["Z", 0.35, 20], ["Z", 0.7, 27]].forEach(([t, d, size], i) =>
        spawn(btn, "zzz", t, { animationDelay: `${d}s`, fontSize: `${size}px`, right: `${18 - i * 4}px` })
      );
    },
    hungry(btn) {
      restart(btn, "fx-hungry");
      for (let i = 0; i < 3; i++) {
        spawn(btn, "rumble left", "(", { animationDelay: `${i * 0.18}s` });
        spawn(btn, "rumble right", ")", { animationDelay: `${i * 0.18}s` });
      }
    },
    thirsty(btn) {
      restart(btn, "fx-thirsty");
      [20, 50, 78].forEach((left, i) => spawn(btn, "heat", "", { left: `${left}%`, animationDelay: `${0.25 + i * 0.2}s` }));
    },
    triggered(btn) {
      restart(btn, "fx-triggered");
      spawn(btn, "vein", "💢", {});
    },
  };
  $("#basics").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fx]");
    if (btn) EFFECTS[btn.dataset.fx](btn);
  });

  (function countdown() {
    const go = $("#gate-go");
    let n = 5;
    const tick = () => {
      if (n > 0) {
        go.textContent = `Continue in ${n}…`;
        n--;
        setTimeout(tick, 1000);
      } else {
        go.textContent = "Continue";
        go.disabled = false;
      }
    };
    tick();
    go.addEventListener("click", () => {
      $("#gate").hidden = true;
      $(".page").inert = false;
    });
  })();

  // ---------- State ----------
  let state;
  function resetState() {
    state = {
      active: "primary", // which emotion a tap on the wheel sets
      cantGive: false,
      primary: { id: null, action: "" },
      secondary: { id: null, action: "" },
    };
  }
  resetState();

  // ---------- Wheel ----------
  const wheel = createWheel($("#main-wheel"), { onPick: (n) => tapWheel(n.id) });

  function whichForWheel() {
    return state.cantGive ? state.active : "primary";
  }

  // Tapping a slice that's already selected deselects it (back to its parent).
  // Deselecting the center emotion clears the selection entirely.
  function tapWheel(id) {
    const which = whichForWheel();
    const cur = state[which].id;
    if (cur && pathOf(cur).some((p) => p.id === id)) {
      const parent = BY_ID[id].parent;
      if (parent) pick(parent, which);
      else clear(which);
    } else {
      pick(id, which);
    }
  }

  function pick(id, which) {
    which = which || whichForWheel();
    // A new center emotion for the main emotion starts the "can't give" part over.
    const prev = state[which].id;
    if (which === "primary" && prev && BY_ID[prev].core !== BY_ID[id].core && state.cantGive) {
      state.cantGive = false;
      state.secondary = { id: null, action: "" };
    }
    state[which].id = id;
    state.active = which;
    showActiveOnWheel();
    renderPanel();
  }

  function clear(which) {
    if (which === "primary") resetState();
    else {
      state.secondary.id = null;
    }
    showActiveOnWheel();
    renderPanel();
  }

  function showActiveOnWheel() {
    const id = state[state.active].id;
    wheel.setHighlight(id ? pathOf(id).map((p) => p.id) : [], id);
    if (id) wheel.focus(id);
    // Once an outer-ring word is chosen, the wheel stays put.
    const lockedIn = !!id && BY_ID[id].level === 2;
    wheel.setLocked(lockedIn);
    $("#spin-hint").hidden = lockedIn;
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
    const label = (w) => (state[w].id ? BY_ID[state[w].id].word : "none");
    box.innerHTML = `<span class="small">Wheel selects:</span>
      <div class="seg" role="group" aria-label="Which emotion the wheel selects">
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

  // ---------- The whole thought ----------
  // The first three parts come straight from the selected word; only the action is typed.
  function parts(id) {
    const n = BY_ID[id];
    return {
      feeling: n.word.toLowerCase(),
      connected: n.level > 0 ? ROOT_NOUN[n.core] : null, // redundant for a center emotion
      body: CORE[n.core].wants,
      needsPrefix: NEEDS[n.core].needsPrefix || "My body needs",
    };
  }

  function sentence(which, { withAction = true } = {}) {
    const s = state[which];
    const p = parts(s.id);
    let t = `I'm feeling ${p.feeling}.`;
    if (p.connected) t += ` This is connected to ${p.connected}.`;
    t += ` ${p.needsPrefix} ${p.body}.`;
    const a = withAction ? s.action.trim() : "";
    if (a) t += " " + (a[0].toUpperCase() + a.slice(1)).replace(/([^.!?])$/, "$1.");
    return t;
  }

  function fullText() {
    if (!state.cantGive) return sentence("primary");
    let t = sentence("primary", { withAction: false });
    t += `\n\nI can't give ${ROOT_NOUN[BY_ID[state.primary.id].core]} what it wants right now.`;
    if (state.secondary.id) t += `\n\nSecondary emotion: ${sentence("secondary")}`;
    return t;
  }

  // ---------- Panel ----------
  const panel = $("#panel");

  function emotionCard(which) {
    const s = state[which];
    const n = BY_ID[s.id];
    const core = CORE[n.core];
    const need = NEEDS[n.core];
    const p = parts(s.id);
    const path = pathOf(n.id);
    const others = nodesForWord(n.word).filter((o) => o.id !== n.id);
    const kids = childrenOf(n.id);
    const showAction = !(which === "primary" && state.cantGive);
    return `
    <article class="card emo ${state.active === which ? "active" : ""}" data-which="${which}" style="--h:${core.hue}">
      ${which === "secondary" ? `<div class="emo-label">Secondary emotion</div>` : ""}
      <nav class="crumbs" aria-label="Where this word sits">${path
        .map((x, i) =>
          i === path.length - 1 ? `<span>${esc(x.word)}</span>` : `<button class="linkish" data-pick="${esc(x.id)}">${esc(x.word)}</button> ›`
        )
        .join(" ")}</nav>
      <h2 class="big-word">${esc(n.word)}</h2>
      ${
        kids.length
          ? `<div class="specific">
              <p class="specific-q">Select a more specific emotion:</p>
              <div class="specific-opts">${kids
                .map((k) => `<button class="opt" data-pick="${esc(k.id)}">${esc(k.word)}</button>`)
                .join("")}</div>
            </div>`
          : ""
      }
      ${
        others.length
          ? `<p class="muted small">Also on the wheel under ${others
              .map((o) => `<button class="linkish" data-pick="${esc(o.id)}">${esc(pathOf(o.id).slice(0, -1).map((x) => x.word).join(" › "))}</button>`)
              .join(" and ")}.</p>`
          : ""
      }
      <div class="thought">
        <h3>Complete the whole thought</h3>
        <p class="given">I'm feeling <strong>${esc(p.feeling)}</strong>.</p>
        ${p.connected ? `<p class="given">This is connected to <strong>${esc(p.connected)}</strong>.</p>` : ""}
        <p class="needs">${esc(p.needsPrefix)} <strong>${esc(p.body)}</strong>.</p>
        ${need.guidance ? `<p class="guidance">${esc(need.guidance)}</p>` : ""}
        ${
          showAction
            ? `<label class="field">What I'm going to do about it:
                <textarea rows="2" data-action placeholder="e.g. I'm going to…">${esc(s.action)}</textarea></label>
              <details class="ideas">
                <summary><span aria-hidden="true">?</span> Ideas</summary>
                <p class="ideas-note">General suggestions written for this site. These are interpretations, not therapeutic guidance.</p>
                <ul>${need.ideas.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
              </details>`
            : ""
        }
      </div>
      ${
        which === "primary"
          ? `<label class="check-inline cant"><input type="checkbox" id="cant-give" ${state.cantGive ? "checked" : ""}>
              I can't give this emotion what it wants right now</label>`
          : ""
      }
    </article>`;
  }

  function leftoverCard() {
    const core = BY_ID[state.primary.id].core;
    const need = NEEDS[core];
    return `
    <section class="card leftover">
      <h3>What's left?</h3>
      <p>If you can't give the emotion what it wants, is there a secondary emotion you're feeling that you can tend to as well?</p>
      ${need.ifNot ? `<p class="guidance">${esc(need.ifNot)}</p>` : ""}
      ${
        state.secondary.id
          ? ""
          : `<button class="btn primary" id="choose-secondary">Select a secondary emotion on the wheel</button>`
      }
    </section>`;
  }

  function renderPanel() {
    if (!state.primary.id) {
      panel.innerHTML = `<div class="card empty"><p>Select an emotion on the wheel.</p></div>`;
      renderChoosing();
      return;
    }
    panel.innerHTML = `
      ${emotionCard("primary")}
      ${state.cantGive ? leftoverCard() : ""}
      ${state.cantGive && state.secondary.id ? emotionCard("secondary") : ""}
      <section class="card copy">
        <h3>Your whole thought</h3>
        <blockquote class="sentence" id="full-text"></blockquote>
        <div class="btn-row">
          <button class="btn primary" id="copy">Copy</button>
          <button class="btn ghost" id="start-over">Start over</button>
        </div>
        <p class="muted small">Say it out loud, into a mirror if you can.</p>
      </section>`;
    $("#full-text").textContent = fullText();
    renderChoosing();
  }

  // Typing the action: update state and the preview without redrawing.
  panel.addEventListener("input", (e) => {
    const card = e.target.closest(".emo");
    if (!card || !e.target.hasAttribute("data-action")) return;
    state[card.dataset.which].action = e.target.value;
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
      state.secondary = { id: null, action: "" };
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
      toast("Select a secondary emotion on the wheel");
    }
    if (e.target.id === "copy") copyText(fullText());
    if (e.target.id === "start-over") {
      const typed = state.primary.action.trim() || state.secondary.action.trim();
      if (typed && !confirm("Clear everything and start over?")) return;
      resetState();
      wheel.setHighlight([]);
      wheel.reset();
      renderPanel();
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
