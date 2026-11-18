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
      <span class="basic-label">${
        b === "Thirsty" ? [...`${b}?`].map((ch, i) => `<span class="ch" style="--i:${i}">${esc(ch)}</span>`).join("") : `${esc(b)}?`
      }</span></button></li>`
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
    clearTimeout(btn._fxDone);
    btn._fxDone = setTimeout(() => btn.classList.remove(cls), 2000); // tidy up once it's played
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
    },
    triggered(btn) {
      restart(btn, "fx-triggered");
      spawn(btn, "vein", "💢", {});
    },
  };
  $("#basics").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fx]");
    if (!btn) return;
    EFFECTS[btn.dataset.fx](btn);
    suggest(btn.dataset.fx);
  });

  // Tapping a condition swaps the line under the buttons for a suggestion,
  // which fades away once the animation has played, leaving the space blank.
  const SUGGEST = {
    tired: ["Rest!", 1600],
    hungry: ["Eat something!", 1100],
    thirsty: ["Drink some water!", 1200],
    triggered: ["Take a break!", 1100],
  };
  function suggest(kind) {
    const ask = $("#gate-ask");
    const [text, ms] = SUGGEST[kind];
    clearTimeout(suggest._t);
    ask.textContent = text;
    ask.className = "gate-ask";
    void ask.offsetWidth; // replay the pop-in for each tap
    ask.classList.add("suggestion");
    suggest._t = setTimeout(() => ask.classList.add("fade"), ms);
  }

  // The check, with a short countdown before Continue unlocks.
  const CHECK_KEY = "ew.checked";
  let countdownTimer = null;
  function openCheck() {
    const go = $("#gate-go");
    const ask = $("#gate-ask");
    clearTimeout(countdownTimer);
    clearTimeout(suggest._t);
    ask.className = "gate-ask";
    ask.textContent = "These needs have to be met first, if possible.";
    document.documentElement.classList.remove("checked");
    $("#gate").hidden = false;
    $(".page").inert = true;
    go.disabled = true;
    let n = 5;
    const tick = () => {
      if (n > 0) {
        go.textContent = `Continue in ${n}…`;
        n--;
        countdownTimer = setTimeout(tick, 1000);
      } else {
        go.textContent = "Continue";
        go.disabled = false;
      }
    };
    tick();
  }
  function closeCheck() {
    clearTimeout(countdownTimer);
    $("#gate").hidden = true;
    $(".page").inert = false;
  }
  $("#gate-go").addEventListener("click", () => {
    closeCheck();
    try {
      localStorage.setItem(CHECK_KEY, String(Date.now())); // skip it for the next 15 minutes
    } catch {}
  });
  $("#show-check").addEventListener("click", openCheck);
  if (document.documentElement.classList.contains("checked")) closeCheck();
  else openCheck();

  // ---------- State ----------
  let state;
  function resetState() {
    state = {
      active: "primary", // which emotion a tap on the wheel sets
      cantGive: false,
      wantsSecondary: null, // answer to "is there a secondary emotion?": null (unanswered), true or false
      primary: { id: null, action: "", cant: false },
      secondary: { id: null, action: "", cant: false },
    };
  }
  resetState();

  // ---------- Wheel ----------
  const wheel = createWheel($("#main-wheel"), { onPick: (n) => tapWheel(n.id) });

  function whichForWheel() {
    return state.cantGive && state.wantsSecondary ? state.active : "primary";
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
      dropSecondary();
    }
    if (which === "secondary" && prev && BY_ID[prev].core !== BY_ID[id].core) state.secondary.cant = false;
    state[which].id = id;
    state.active = which;
    showActiveOnWheel();
    renderPanel();
  }

  // "I can't give this emotion what it wants": the main emotion's lives in state.cantGive
  // (it opens the secondary-emotion flow); the secondary's lives on the secondary itself.
  const cantOf = (which) => (which === "primary" ? state.cantGive : state.secondary.cant);

  function dropSecondary() {
    state.secondary = { id: null, action: "", cant: false };
    state.wantsSecondary = null;
    state.active = "primary";
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
    $("#search").hidden = lockedIn; // no need to search once an outer-ring word is chosen
    // On touch screens the wheel only spins while nothing is selected.
    const touch = window.matchMedia("(pointer: coarse)").matches;
    $("#spin-hint").hidden = lockedIn || (touch && !!id);
    renderChoosing();
  }

  function setActive(which) {
    if (state.active === which) return;
    state.active = which;
    $$(".emo").forEach((c) => c.classList.toggle("active", c.dataset.which === which));
    showActiveOnWheel();
  }

  // Shows which emotion a tap on the wheel will set (only when there are two).
  // Above the wheel: the Primary/Secondary switch with "Remove secondary emotion" while a
  // secondary emotion is active; otherwise "Reset" once an outer-ring word is chosen
  // (the search bar is hidden then), plus "Add a secondary emotion" after a "No".
  function renderChoosing() {
    const box = $("#choosing");
    const id = state[state.active].id;
    const secondaryOn = state.cantGive && state.wantsSecondary === true;
    const showAdd = state.cantGive && state.wantsSecondary === false;
    const showReset = !secondaryOn && !!id && BY_ID[id].level === 2;
    box.hidden = !(secondaryOn || showAdd || showReset);
    if (box.hidden) return;
    if (!secondaryOn) {
      box.innerHTML =
        (showAdd ? `<button class="btn ghost small-btn" data-secondary-ctl="add">+ Add a secondary emotion</button>` : "") +
        (showReset ? `<button class="btn ghost small-btn" data-reset>Reset</button>` : "");
      return;
    }
    const label = (w) => (state[w].id ? BY_ID[state[w].id].word : "none");
    box.innerHTML = `<span class="small">Emotion:</span>
      <div class="seg" role="group" aria-label="Which emotion the wheel selects">
        ${["primary", "secondary"]
          .map(
            (w) => `<button data-set-active="${w}" aria-pressed="${state.active === w}">
              ${w === "primary" ? "Primary" : "Secondary"}<span class="seg-sub">${esc(label(w))}</span></button>`
          )
          .join("")}
      </div>
      <button class="btn ghost small-btn" data-secondary-ctl="remove">Remove secondary emotion</button>`;
  }
  $("#choosing").addEventListener("click", (e) => {
    const b = e.target.closest("[data-set-active]");
    if (b) setActive(b.dataset.setActive);
    const ctl = e.target.closest("[data-secondary-ctl]");
    if (ctl) answerSecondary(ctl.dataset.secondaryCtl === "add");
    if (e.target.closest("[data-reset]")) startOver();
  });

  // Yes / add: the wheel can now select a secondary emotion. No / remove: back to just the primary.
  function answerSecondary(yes) {
    if (yes) {
      state.wantsSecondary = true;
      state.active = "secondary";
    } else {
      state.secondary = { id: null, action: "", cant: false };
      state.wantsSecondary = false;
      state.active = "primary";
    }
    showActiveOnWheel();
    renderPanel();
    if (yes) {
      if (isPhone()) $("#choosing").scrollIntoView({ behavior: "smooth", block: "start" });
      toast("Select a secondary emotion on the wheel");
    }
  }

  // ---------- Search & list ----------
  // Suggestions while typing. Matches anywhere in a word ("shame" finds "Ashamed"),
  // with words that start with what you typed listed first.
  const searchInput = $("#wheel-search");
  const results = $("#search-results");
  let matches = [];
  let cursor = -1; // highlighted suggestion, for the arrow keys

  function findMatches(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    return NODES.map((n) => ({ n, at: n.word.toLowerCase().indexOf(q) }))
      .filter((m) => m.at >= 0)
      .sort((a, b) => (b.at === 0) - (a.at === 0) || a.n.word.localeCompare(b.n.word) || a.n.level - b.n.level)
      .slice(0, 8);
  }
  function showResults() {
    const q = searchInput.value.trim();
    if (!q) return closeResults();
    matches = findMatches(q);
    cursor = matches.length ? 0 : -1;
    results.innerHTML = matches.length
      ? matches
          .map(({ n, at }, i) => {
            const w = n.word;
            const word = `${esc(w.slice(0, at))}<b>${esc(w.slice(at, at + q.length))}</b>${esc(w.slice(at + q.length))}`;
            const where = pathOf(n.id).slice(0, -1).map((x) => x.word).join(" › ") || "center emotion";
            return `<li role="option" id="sr-${i}" data-node="${esc(n.id)}" style="--h:${CORE[n.core].hue}">
              <span class="dot" aria-hidden="true"></span><span class="sr-word">${word}</span>
              <span class="sr-where">${esc(where)}</span></li>`;
          })
          .join("")
      : `<li class="sr-none">No matching emotion</li>`;
    results.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    highlight();
  }
  function highlight() {
    $$("[role=option]", results).forEach((li, i) => li.classList.toggle("on", i === cursor));
    if (cursor >= 0) searchInput.setAttribute("aria-activedescendant", `sr-${cursor}`);
    else searchInput.removeAttribute("aria-activedescendant");
  }
  function closeResults() {
    matches = [];
    results.hidden = true;
    results.innerHTML = "";
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
  }
  function choose(id) {
    searchInput.value = "";
    closeResults();
    searchInput.blur();
    pick(id);
  }
  searchInput.addEventListener("input", showResults);
  searchInput.addEventListener("focus", showResults);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!matches.length) return;
      e.preventDefault();
      cursor = (cursor + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      highlight();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[cursor]) choose(matches[cursor].n.id);
    } else if (e.key === "Escape") {
      closeResults();
    }
  });
  // Keep the box focused while a suggestion is being tapped or clicked.
  results.addEventListener("mousedown", (e) => e.preventDefault());
  results.addEventListener("click", (e) => {
    const li = e.target.closest("[data-node]");
    if (li) choose(li.dataset.node);
  });
  searchInput.addEventListener("blur", () => setTimeout(closeResults, 150));

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
    b.closest("details").open = false; // back to the exercise
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

  function part(which) {
    const cant = cantOf(which);
    let t = sentence(which, { withAction: !cant });
    if (cant) t += `\n\nI can't give my ${ROOT_NOUN[BY_ID[state[which].id].core]} what it wants right now.`;
    return t;
  }
  function fullText() {
    let t = part("primary");
    if (state.cantGive && state.secondary.id) t += `\n\nSecondary emotion: ${part("secondary")}`;
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
    const cant = cantOf(which);
    const showAction = !cant;
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
        <h3 class="cta" ${thoughtDone(which) ? "hidden" : ""}>Complete the whole thought:</h3>
        <p class="given">I'm feeling <strong>${esc(p.feeling)}</strong>.</p>
        ${p.connected ? `<p class="given">This is connected to <strong>${esc(p.connected)}</strong>.</p>` : ""}
        <p class="needs">${esc(p.needsPrefix)} <strong>${esc(p.body)}</strong>.</p>
        ${need.guidance ? `<p class="guidance">${esc(need.guidance)}</p>` : ""}
        ${
          showAction
            ? `<label class="field">What I'm going to do about it:
                <textarea rows="2" data-action placeholder="e.g. I'm going to…">${esc(s.action)}</textarea></label>`
            : ""
        }
        <label class="check-inline cant" ${s.action.trim() ? "hidden" : ""}>
          <input type="checkbox" data-cant ${cant ? "checked" : ""}>
          <span>I can't give this emotion what it wants right now</span></label>
        ${
          showAction
            ? `<details class="ideas">
                <summary><span aria-hidden="true">?</span> Ideas</summary>
                <ul>${need.ideas.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
              </details>`
            : ""
        }
      </div>
    </article>`;
  }

  // "What's left?": shown when the main emotion can't get what it wants.
  // Before a secondary emotion is chosen it asks for one; afterwards only
  // the closing notes remain, and they move below the whole thought.
  // Asked once after "I can't give…" is checked; disappears once answered.
  function secondaryQuestionCard() {
    if (state.wantsSecondary === null)
      return `
      <section class="card ask">
        <p>If you can't give the emotion what it wants, is there a <strong>secondary emotion</strong> you're feeling that you can tend to as well?</p>
        <div class="btn-row" role="group" aria-label="Is there a secondary emotion?">
          <button class="btn yes" data-secondary="yes">Yes</button>
          <button class="btn no" data-secondary="no">No</button>
        </div>
      </section>`;
    if (state.wantsSecondary && !state.secondary.id)
      return `<section class="card ask"><p class="pick-prompt">Select a secondary emotion on the wheel.</p></section>`;
    return "";
  }
  // Always last in the stack while "I can't give…" is checked.
  function leftoverCard() {
    const cores = ["primary", "secondary"].filter((w) => state[w].id && cantOf(w)).map((w) => BY_ID[state[w].id].core);
    const notes = [...new Set(cores)].map((c) => NEEDS[c].ifNot).filter(Boolean);
    return `
    <section class="card leftover">
      <h3>What's left?</h3>
      ${notes.map((x) => `<p class="guidance">${esc(x)}</p>`).join("")}
      <p class="still-stuck">If you're still stuck, write it down and bring it to your therapist.</p>
    </section>`;
  }

  // An emotion's part is done once its action is written (or, for the
  // main emotion, once "I can't give…" is checked).
  function thoughtDone(which) {
    return !!state[which].action.trim() || cantOf(which);
  }
  // The whole thought only appears once it says more than the emotion box does.
  function showWhole() {
    return state.cantGive || !!state.primary.action.trim() || !!state.secondary.action.trim();
  }

  function renderPanel() {
    if (!state.primary.id) {
      panel.innerHTML = `<div class="card empty"><p>Select an emotion on the wheel.</p></div>`;
      renderChoosing();
      return;
    }
    panel.innerHTML = `
      ${emotionCard("primary")}
      ${state.cantGive ? secondaryQuestionCard() : ""}
      ${state.cantGive && state.secondary.id ? emotionCard("secondary") : ""}
      <section class="card copy" style="--h:${CORE[BY_ID[state.primary.id].core].hue}" ${showWhole() ? "" : "hidden"}>
        <h3>Your whole thought</h3>
        <blockquote class="sentence" id="full-text"></blockquote>
        <div class="btn-row">
          <button class="btn primary" id="copy">Copy</button>
        </div>
        <p class="muted small">Say it out loud, into a mirror if you can.</p>
      </section>
      ${state.cantGive ? leftoverCard() : ""}
      <div class="start-over-row"><button class="btn ghost" id="start-over">Start over</button></div>`;
    $("#full-text").textContent = fullText();
    renderChoosing();
  }

  // Typing the action: update state and the preview without redrawing.
  panel.addEventListener("input", (e) => {
    const card = e.target.closest(".emo");
    if (!card || !e.target.hasAttribute("data-action")) return;
    const which = card.dataset.which;
    state[which].action = e.target.value;
    $("#full-text").textContent = fullText();
    $(".cta", card).hidden = thoughtDone(which);
    $(".cant", card).hidden = !!e.target.value.trim(); // typing a solution replaces the "can't" option
    $(".copy").hidden = !showWhole();
  });

  // Working in a card makes it the one the wheel shows.
  const activate = (e) => {
    const card = e.target.closest(".emo");
    if (card && !e.target.closest("[data-pick]")) setActive(card.dataset.which);
  };
  panel.addEventListener("focusin", activate);
  panel.addEventListener("click", activate); // not pointerdown: that also fires when a scroll starts

  panel.addEventListener("change", (e) => {
    if (!e.target.hasAttribute("data-cant")) return;
    if (e.target.closest(".emo").dataset.which === "secondary") {
      state.secondary.cant = e.target.checked;
      renderPanel();
      return;
    }
    state.cantGive = e.target.checked;
    if (!state.cantGive) {
      dropSecondary();
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
    const yn = e.target.closest("[data-secondary]");
    if (yn) {
      answerSecondary(yn.dataset.secondary === "yes");
      return;
    }
    if (e.target.id === "copy") copyText(fullText());
    if (e.target.id === "start-over") startOver();
  });

  function startOver() {
    const typed = state.primary.action.trim() || state.secondary.action.trim();
    if (typed && !confirm("Clear everything and start over?")) return;
    resetState();
    showActiveOnWheel(); // clears the highlight, unlocks the wheel, shows the search bar again
    wheel.reset();
    renderPanel();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
