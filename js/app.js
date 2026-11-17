// Main app: tabs, wheel details, daily check-in, journal, and reminders.
// Everything the user writes is stored in this browser's localStorage only.

(function () {
  "use strict";

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hueOf = Object.fromEntries(WHEEL.map((c) => [c.name, c.hue]));

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
  const DRAFT_KEY = "ew.draft";
  const ENTRIES_KEY = "ew.entries";

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      toast("Your browser can't read aloud — try saying it yourself!");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  function chip(id, { removable = false } = {}) {
    const n = BY_ID[id];
    if (!n) return "";
    const title = pathOf(id).map((p) => p.word).join(" › ");
    return `<span class="chip" style="--h:${hueOf[n.core]}" title="${esc(title)}">${esc(n.word)}${
      removable ? `<button class="chip-x" data-remove="${esc(id)}" aria-label="Remove ${esc(n.word)}">×</button>` : ""
    }</span>`;
  }

  function download(filename, text, type = "text/plain") {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  // ---------- Tabs ----------
  const TABS = ["wheel", "checkin", "journal", "guide"];
  function showTab(name) {
    if (!TABS.includes(name)) name = "wheel";
    for (const t of TABS) {
      $(`#tab-${t}`).hidden = t !== name;
      $(`[data-tab="${t}"]`).setAttribute("aria-selected", t === name);
    }
    if (name === "journal") renderJournal();
    if (name === "checkin") renderStep();
  }
  $$("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      location.hash = b.dataset.tab;
    })
  );
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

  // ---------- Wheel tab ----------
  const mainWheel = createWheel($("#main-wheel"), { onPick: (n) => selectNode(n.id) });

  // Search box suggestions (unique words).
  const uniqueWords = [...new Set(NODES.map((n) => n.word))].sort();
  $("#all-words").innerHTML = uniqueWords.map((w) => `<option value="${esc(w)}">`).join("");
  $("#wheel-search").addEventListener("input", (e) => {
    const matches = nodesForWord(e.target.value);
    if (matches.length) {
      selectNode(matches[0].id);
      e.target.blur();
    }
  });

  // List view.
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

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-node]");
    if (b && !b.closest("#checkin-body")) {
      selectNode(b.dataset.node);
      if (b.closest("#word-list")) $("#main-wheel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  let currentNode = null;
  function selectNode(id) {
    const n = BY_ID[id];
    if (!n) return;
    currentNode = n;
    mainWheel.setHighlight(pathOf(id).map((p) => p.id));
    renderDetail(n);
  }

  function renderDetail(n) {
    const need = NEEDS[n.core];
    const path = pathOf(n.id);
    const others = nodesForWord(n.word).filter((o) => o.id !== n.id);
    let related, relatedLabel;
    if (n.level === 2) {
      related = NODES.filter((o) => o.parent === n.parent && o.id !== n.id);
      relatedLabel = "Nearby words";
    } else {
      related = NODES.filter((o) => o.parent === n.id);
      relatedLabel = "More specific words";
    }
    const inDraft = getDraft().picked.includes(n.id);

    $("#detail").style.setProperty("--h", hueOf[n.core]);
    $("#detail").innerHTML = `
      <nav class="crumbs" aria-label="Where this word sits">${path
        .map((p, i) =>
          i === path.length - 1
            ? `<span>${esc(p.word)}</span>`
            : `<button class="linkish" data-node="${esc(p.id)}">${esc(p.word)}</button> ›`
        )
        .join(" ")}</nav>
      <h2 class="big-word">${esc(n.word)}</h2>
      <p class="wants"><strong>${esc(n.core)}</strong> wants <strong>${esc(need.wants)}</strong>.</p>
      <ul class="ideas">${need.ideas.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
      <p class="ifnot"><span class="label">If you can't give it that:</span> ${esc(need.ifNot)}</p>
      ${
        others.length
          ? `<p class="muted small">This word also appears under ${others
              .map((o) => `<button class="linkish" data-node="${esc(o.id)}">${esc(pathOf(o.id).slice(0, -1).map((p) => p.word).join(" › "))}</button>`)
              .join(" and ")}. The same word can have different roots — which one fits?</p>`
          : ""
      }
      <p class="related"><span class="label">${relatedLabel}:</span> ${related
        .map((r) => `<button class="linkish" data-node="${esc(r.id)}">${esc(r.word)}</button>`)
        .join(", ")}</p>
      <div class="btn-row">
        <button class="btn primary" id="add-to-checkin">${inDraft ? "✓ In today's check-in" : "Add to today's check-in"}</button>
        <button class="btn ghost" id="say-it">Say it out loud</button>
      </div>`;
    $("#add-to-checkin").addEventListener("click", () => {
      const d = getDraft();
      if (!d.picked.includes(n.id)) {
        d.picked.push(n.id);
        saveDraft(d);
        toast(`Added “${n.word}” to today's check-in`);
      } else {
        d.picked = d.picked.filter((x) => x !== n.id);
        saveDraft(d);
        toast(`Removed “${n.word}”`);
      }
      renderDetail(n);
    });
    $("#say-it").addEventListener("click", () => speak(`I'm feeling ${n.word.toLowerCase()}.`));
  }

  // ---------- Guide tab ----------
  $("#needs-grid").innerHTML = WHEEL.map(
    (c) => `<div class="need-card" style="--h:${c.hue}">
      <div class="need-name">${esc(c.name)}</div>
      <div class="need-wants">wants <strong>${esc(c.wants)}</strong></div>
      <p class="small">${esc(NEEDS[c.name].ifNot)}</p>
    </div>`
  ).join("");

  $("#reminder-download").addEventListener("click", () => {
    const [hh, mm] = ($("#reminder-time").value || "18:00").split(":");
    const now = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const url = location.href.split("#")[0] + "#checkin";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Emotions Wheel//EN",
      "BEGIN:VEVENT",
      `UID:emotions-checkin-${Date.now()}@emotions-wheel`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${date}T${hh}${mm}00`,
      "DURATION:PT15M",
      "RRULE:FREQ=DAILY",
      "SUMMARY:Emotions check-in",
      `DESCRIPTION:How did I feel today? Write a few words first\\, then check the wheel. ${url}`,
      `URL:${url}`,
      "BEGIN:VALARM",
      "TRIGGER:PT0M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Emotions check-in",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    download("emotions-checkin-reminder.ics", ics, "text/calendar");
    toast("Reminder downloaded — open it to add to your calendar");
  });

  // ---------- Check-in ----------
  function newDraft() {
    return {
      id: `e${Date.now()}`,
      step: 0,
      basics: {},
      basicsNote: "",
      freewrite: "",
      picked: [],
      matchNote: "",
      needs: {},
      sentence: { feeling: "", connected: "", body: "", action: "" },
      saidAloud: false,
      therapy: false,
    };
  }
  function getDraft() {
    const d = store.get(DRAFT_KEY, null);
    return d ? Object.assign(newDraft(), d) : newDraft();
  }
  function saveDraft(d) {
    store.set(DRAFT_KEY, d);
  }

  const STEPS = [
    { title: "Pause", render: stepBasics },
    { title: "Write", render: stepFreewrite },
    { title: "Wheel", render: stepWheel },
    { title: "Needs", render: stepNeeds },
    { title: "Thought", render: stepSentence },
    { title: "Say it", render: stepSay },
  ];

  let draft = getDraft();
  let done = false;

  function update(fn) {
    fn(draft);
    saveDraft(draft);
  }

  function renderStep() {
    draft = getDraft();
    const body = $("#checkin-body");
    if (done) {
      $("#step-dots").innerHTML = "";
      body.innerHTML = `
        <div class="done">
          <h2>Saved. Nice work.</h2>
          <p>You took it all the way through. That's the practice.</p>
          <div class="btn-row center">
            <a class="btn ghost" href="#journal">View journal</a>
            <button class="btn primary" id="again">Start a new check-in</button>
          </div>
        </div>`;
      $("#again").addEventListener("click", () => {
        done = false;
        renderStep();
      });
      $(".step-nav").hidden = true;
      return;
    }
    $(".step-nav").hidden = false;
    $("#step-dots").innerHTML = STEPS.map(
      (s, i) =>
        `<li class="${i === draft.step ? "current" : i < draft.step ? "past" : ""}"><span class="dot">${i + 1}</span><span class="dot-label">${s.title}</span></li>`
    ).join("");
    STEPS[draft.step].render(body);
    $("#step-back").disabled = draft.step === 0;
    $("#step-next").textContent = draft.step === STEPS.length - 1 ? "Save to journal" : "Next";
  }

  $("#step-back").addEventListener("click", () => {
    update((d) => (d.step = Math.max(0, d.step - 1)));
    renderStep();
    $("#tab-checkin").scrollIntoView({ block: "start" });
  });
  $("#step-next").addEventListener("click", () => {
    if (draft.step === STEPS.length - 1) {
      saveEntry();
      return;
    }
    update((d) => (d.step = Math.min(STEPS.length - 1, d.step + 1)));
    renderStep();
    $("#tab-checkin").scrollIntoView({ block: "start" });
  });

  function bindField(root, sel, setter) {
    $$(sel, root).forEach((input) =>
      input.addEventListener("input", () => update((d) => setter(d, input)))
    );
  }

  function stepBasics(body) {
    body.innerHTML = `
      <h2>First, a quick body check</h2>
      <p>Are any of these true right now? These basic needs have to be met first, if possible.</p>
      <div class="basics">${BASICS.map(
        (b) => `<label class="basic"><input type="checkbox" data-basic="${b.id}" ${draft.basics[b.id] ? "checked" : ""}>
          <span><strong>${b.label}</strong><span class="muted small">needs ${b.need}</span></span></label>`
      ).join("")}</div>
      <p class="muted small" id="basics-msg"></p>
      <label class="field">Anything to note? <span class="muted small">(optional)</span>
        <textarea id="basics-note" rows="2" placeholder="e.g. skipped lunch, slept badly">${esc(draft.basicsNote)}</textarea></label>`;
    const msg = () => {
      const any = BASICS.filter((b) => draft.basics[b.id]);
      $("#basics-msg", body).textContent = any.length
        ? `If you can, take care of ${any.map((b) => b.need).join(", ")} first. It's fine to pause here and come back — your progress is saved.`
        : "";
    };
    msg();
    $$("[data-basic]", body).forEach((cb) =>
      cb.addEventListener("change", () => {
        update((d) => (d.basics[cb.dataset.basic] = cb.checked));
        msg();
      })
    );
    bindField(body, "#basics-note", (d, i) => (d.basicsNote = i.value));
  }

  function stepFreewrite(body) {
    body.innerHTML = `
      <h2>How did you feel today?</h2>
      <p><strong>Don't look at the wheel yet.</strong> Just write down some words that describe how you felt during the day — whatever comes to mind.</p>
      <label class="field"><span class="visually-hidden">Your words</span>
        <textarea id="freewrite" rows="5" placeholder="tired, kind of on edge, relieved after the call…">${esc(draft.freewrite)}</textarea></label>`;
    bindField(body, "#freewrite", (d, i) => (d.freewrite = i.value));
  }

  function stepWheel(body) {
    body.innerHTML = `
      <h2>Now consult the wheel</h2>
      ${draft.freewrite.trim() ? `<div class="echo"><span class="label">You wrote:</span> ${esc(draft.freewrite)}</div>` : ""}
      <p>Tap the words that fit your experience. Try to get as specific as you can — the outer ring is the most specific.</p>
      <div class="wheel small-wheel" id="ci-wheel"></div>
      <div class="picked" id="picked"></div>
      <label class="field">Did the wheel match what you wrote? Did you find a more accurate word?
        <textarea id="match-note" rows="3">${esc(draft.matchNote)}</textarea></label>`;
    const w = createWheel($("#ci-wheel", body), {
      onPick: (n) => {
        update((d) => {
          d.picked = d.picked.includes(n.id) ? d.picked.filter((x) => x !== n.id) : [...d.picked, n.id];
        });
        refresh();
      },
    });
    function refresh() {
      w.setMarked(draft.picked);
      $("#picked", body).innerHTML = draft.picked.length
        ? `<span class="label">Your words:</span> ${draft.picked.map((id) => chip(id, { removable: true })).join(" ")}`
        : `<span class="muted">No words picked yet.</span>`;
      $$("[data-remove]", body).forEach((b) =>
        b.addEventListener("click", () => {
          update((d) => (d.picked = d.picked.filter((x) => x !== b.dataset.remove)));
          refresh();
        })
      );
    }
    refresh();
    bindField(body, "#match-note", (d, i) => (d.matchNote = i.value));
  }

  function coresPicked() {
    return [...new Set(draft.picked.map((id) => BY_ID[id] && BY_ID[id].core).filter(Boolean))];
  }

  function stepNeeds(body) {
    const cores = coresPicked();
    if (!cores.length) {
      body.innerHTML = `<h2>What is it asking for?</h2>
        <p>You haven't picked any words from the wheel yet. Go back a step to choose some — or continue if you'd rather skip this part today.</p>`;
      return;
    }
    body.innerHTML = `
      <h2>What is it asking for?</h2>
      <p>Each emotion wants something from you. Can you give it what it's asking for?</p>
      ${cores
        .map((c) => {
          const n = NEEDS[c];
          const st = draft.needs[c] || {};
          const words = draft.picked.filter((id) => BY_ID[id].core === c);
          return `<div class="need-block" style="--h:${hueOf[c]}" data-core="${c}">
            <div class="need-head">${words.map((id) => chip(id)).join(" ")} <span class="muted">→</span> <strong>${c}</strong> wants <strong>${esc(n.wants)}</strong></div>
            <ul class="ideas">${n.ideas.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
            <fieldset class="radios"><legend>Can you give it that?</legend>
              ${[["yes", "Yes"], ["no", "Not right now"], ["unsure", "Not sure"]]
                .map(([v, l]) => `<label><input type="radio" name="can-${c}" value="${v}" ${st.can === v ? "checked" : ""}> ${l}</label>`)
                .join("")}
            </fieldset>
            <div class="if-not" ${st.can && st.can !== "yes" ? "" : "hidden"}>
              <p class="ifnot">${esc(n.ifNot)}</p>
              ${
                c === "Fear"
                  ? `<label class="check-inline"><input type="checkbox" class="therapy-cb" ${draft.therapy ? "checked" : ""}> Write it down and bring it to therapy</label>`
                  : ""
              }
              <label class="field">What's left? Is there a secondary emotion you can tend to as well?
                <textarea rows="2" class="secondary">${esc(st.secondary || "")}</textarea></label>
            </div>
            <label class="field">What would giving it ${esc(n.wants)} look like? <span class="muted small">(optional)</span>
              <textarea rows="2" class="need-note">${esc(st.note || "")}</textarea></label>
          </div>`;
        })
        .join("")}`;
    $$(".need-block", body).forEach((blk) => {
      const c = blk.dataset.core;
      const set = (k, v) => update((d) => (d.needs[c] = { ...(d.needs[c] || {}), [k]: v }));
      $$("input[type=radio]", blk).forEach((r) =>
        r.addEventListener("change", () => {
          set("can", r.value);
          $(".if-not", blk).hidden = r.value === "yes";
        })
      );
      $(".secondary", blk).addEventListener("input", (e) => set("secondary", e.target.value));
      $(".need-note", blk).addEventListener("input", (e) => set("note", e.target.value));
      const t = $(".therapy-cb", blk);
      if (t) t.addEventListener("change", () => update((d) => (d.therapy = t.checked)));
    });
  }

  function composeSentence(s) {
    const blank = (v) => (v && v.trim() ? v.trim() : "___");
    return `I'm feeling ${blank(s.feeling)}, I know it's connected to ${blank(s.connected)}, my body needs ${blank(
      s.body
    )}, and this is what I'm going to do about it: ${blank(s.action).replace(/\.$/, "")}.`;
  }

  function listJoin(arr) {
    if (arr.length <= 1) return arr.join("");
    return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
  }

  function stepSentence(body) {
    // Helpful pre-fills, only if the user hasn't typed anything yet.
    update((d) => {
      if (!d.sentence.feeling && d.picked.length)
        d.sentence.feeling = listJoin(d.picked.map((id) => BY_ID[id].word.toLowerCase()));
      if (!d.sentence.body) {
        const needs = BASICS.filter((b) => d.basics[b.id]).map((b) => b.need);
        if (needs.length) d.sentence.body = listJoin(needs);
      }
    });
    const s = draft.sentence;
    body.innerHTML = `
      <h2>Complete the whole thought</h2>
      <p>Take it all the way through. Edit anything that doesn't sound right.</p>
      <label class="field">I'm feeling…<input type="text" data-k="feeling" value="${esc(s.feeling)}"></label>
      <label class="field">I know it's connected to…<input type="text" data-k="connected" value="${esc(s.connected)}" placeholder="what happened, or what it's about"></label>
      <label class="field">My body needs…<input type="text" data-k="body" value="${esc(s.body)}"></label>
      <label class="field">And this is what I'm going to do about it:<textarea data-k="action" rows="2">${esc(s.action)}</textarea></label>
      <blockquote class="sentence" id="preview"></blockquote>`;
    const preview = () => ($("#preview", body).textContent = composeSentence(draft.sentence));
    preview();
    $$("[data-k]", body).forEach((i) =>
      i.addEventListener("input", () => {
        update((d) => (d.sentence[i.dataset.k] = i.value));
        preview();
      })
    );
  }

  function stepSay(body) {
    const text = composeSentence(draft.sentence);
    body.innerHTML = `
      <h2>Say it out loud</h2>
      <p>Using more than one sense helps it sink in. Read this out loud — and if you can, say it into a mirror.</p>
      <blockquote class="sentence big">${esc(text)}</blockquote>
      <div class="btn-row">
        <button class="btn ghost" id="hear">Hear it read aloud</button>
      </div>
      <label class="check-inline"><input type="checkbox" id="said" ${draft.saidAloud ? "checked" : ""}> I said it out loud</label>
      <label class="check-inline"><input type="checkbox" id="therapy" ${draft.therapy ? "checked" : ""}> Bring this to therapy</label>`;
    $("#hear", body).addEventListener("click", () => speak(text));
    $("#said", body).addEventListener("change", (e) => update((d) => (d.saidAloud = e.target.checked)));
    $("#therapy", body).addEventListener("change", (e) => update((d) => (d.therapy = e.target.checked)));
  }

  function saveEntry() {
    const d = getDraft();
    const entry = { ...d, savedAt: new Date().toISOString(), sentenceText: composeSentence(d.sentence) };
    delete entry.step;
    const entries = store.get(ENTRIES_KEY, []);
    entries.push(entry);
    if (!store.set(ENTRIES_KEY, entries)) {
      toast("Couldn't save — this browser may be blocking storage.");
      return;
    }
    store.set(DRAFT_KEY, newDraft());
    done = true;
    renderStep();
    toast("Saved to your journal");
  }

  // ---------- Journal ----------
  function renderJournal() {
    const all = store.get(ENTRIES_KEY, []).slice().reverse();
    const onlyTherapy = $("#filter-therapy").checked;
    const list = onlyTherapy ? all.filter((e) => e.therapy) : all;

    // Vocabulary card
    const used = new Set();
    for (const e of all) for (const id of e.picked || []) BY_ID[id] && used.add(BY_ID[id].word);
    const total = uniqueWords.length;
    $("#vocab").innerHTML = all.length
      ? `<h3>Your vocabulary</h3>
         <p>You've named <strong>${used.size}</strong> of the ${total} words on the wheel across <strong>${all.length}</strong> check-in${all.length === 1 ? "" : "s"}.</p>
         <div class="meter" role="img" aria-label="${used.size} of ${total} words used"><span style="width:${(used.size / total) * 100}%"></span></div>`
      : `<h3>Your vocabulary</h3><p>Once you've done a check-in, you'll see how many words from the wheel you've used here.</p>`;

    $("#journal-list").innerHTML = list.length
      ? list
          .map((e) => {
            const date = new Date(e.savedAt);
            const basics = BASICS.filter((b) => e.basics && e.basics[b.id]).map((b) => b.label);
            const needs = Object.entries(e.needs || {});
            return `<article class="card entry">
              <header>
                <time datetime="${esc(e.savedAt)}">${esc(date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}
                  <span class="muted small">${esc(date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }))}</span></time>
                <span class="flags">${e.therapy ? `<span class="flag">For therapy</span>` : ""}${e.saidAloud ? `<span class="flag soft">Said aloud</span>` : ""}</span>
              </header>
              ${(e.picked || []).length ? `<div class="chips">${e.picked.map((id) => chip(id)).join(" ")}</div>` : ""}
              <blockquote class="sentence">${esc(e.sentenceText)}</blockquote>
              <details><summary>Details</summary>
                ${basics.length ? `<p><span class="label">Body check:</span> ${esc(basics.join(", "))}${e.basicsNote ? ` — ${esc(e.basicsNote)}` : ""}</p>` : ""}
                ${e.freewrite ? `<p><span class="label">Words before the wheel:</span> ${esc(e.freewrite)}</p>` : ""}
                ${e.matchNote ? `<p><span class="label">Did it match?</span> ${esc(e.matchNote)}</p>` : ""}
                ${needs
                  .map(
                    ([c, n]) => `<p><span class="label">${esc(c)} wants ${esc(NEEDS[c] ? NEEDS[c].wants : "")}:</span>
                    ${esc({ yes: "Could give it that.", no: "Couldn't right now.", unsure: "Not sure." }[n.can] || "")}
                    ${n.note ? esc(n.note) : ""}${n.secondary ? ` <em>Secondary:</em> ${esc(n.secondary)}` : ""}</p>`
                  )
                  .join("")}
                <button class="btn ghost small danger" data-delete="${esc(e.id)}">Delete this entry</button>
              </details>
            </article>`;
          })
          .join("")
      : `<div class="card empty"><p>${
          onlyTherapy ? "No entries marked “bring to therapy” yet." : "No entries yet. Your saved check-ins will show up here."
        }</p>${onlyTherapy ? "" : `<a class="btn primary" href="#checkin">Start a check-in</a>`}</div>`;

    $$("[data-delete]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!confirm("Delete this entry? This can't be undone.")) return;
        store.set(ENTRIES_KEY, store.get(ENTRIES_KEY, []).filter((e) => e.id !== b.dataset.delete));
        renderJournal();
      })
    );
  }
  $("#filter-therapy").addEventListener("change", renderJournal);

  $("#export-txt").addEventListener("click", () => {
    const all = store.get(ENTRIES_KEY, []);
    if (!all.length) return toast("Nothing to download yet");
    const txt = all
      .map((e) => {
        const words = (e.picked || []).map((id) => BY_ID[id] && pathOf(id).map((p) => p.word).join(" > ")).filter(Boolean);
        return [
          new Date(e.savedAt).toLocaleString(),
          e.therapy ? "[Bring to therapy]" : "",
          e.freewrite ? `Words before the wheel: ${e.freewrite}` : "",
          words.length ? `From the wheel: ${words.join("; ")}` : "",
          e.matchNote ? `Did it match? ${e.matchNote}` : "",
          ...Object.entries(e.needs || {}).map(
            ([c, n]) => `${c} wants ${NEEDS[c] ? NEEDS[c].wants : ""}${n.note ? ` — ${n.note}` : ""}${n.secondary ? ` (secondary: ${n.secondary})` : ""}`
          ),
          e.sentenceText,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n----------\n\n");
    download("emotions-journal.txt", txt);
  });

  $("#export-json").addEventListener("click", () => {
    const all = store.get(ENTRIES_KEY, []);
    if (!all.length) return toast("Nothing to back up yet");
    download(`emotions-journal-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(all, null, 2), "application/json");
  });

  $("#import-json").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text());
      if (!Array.isArray(incoming)) throw new Error();
      const existing = store.get(ENTRIES_KEY, []);
      const ids = new Set(existing.map((x) => x.id));
      const added = incoming.filter((x) => x && x.id && x.savedAt && !ids.has(x.id));
      store.set(ENTRIES_KEY, [...existing, ...added].sort((a, b) => a.savedAt.localeCompare(b.savedAt)));
      toast(`Restored ${added.length} entr${added.length === 1 ? "y" : "ies"}`);
      renderJournal();
    } catch {
      toast("That file doesn't look like a journal backup");
    }
    e.target.value = "";
  });

  // ---------- Start ----------
  showTab(location.hash.slice(1) || "wheel");
})();
