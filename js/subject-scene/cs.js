/**
 * Computer Science intro: auto-typed terminal unlock (no user input).
 * Canvas2D only — no Three.js vortex. Cheap persistent glyph field after.
 */
const DPR_CAP = 1.25;
const DPR_WEAK = 1;
const GLYPHS = "01<>{};/#$[]=";

const SCRIPT = [
  { kind: "prompt", text: "stem@kgs:~$ ", type: "cd /subjects/computer-science" },
  { kind: "prompt", text: "stem@kgs:cs$ ", type: "./unlock --access society" },
  { kind: "out", text: "verifying…", delay: 180 },
  { kind: "ok", text: "access granted", delay: 120 },
  { kind: "prompt", text: "stem@kgs:cs$ ", type: "open ." },
];

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    return false;
  }
}

function isWeakDevice() {
  try {
    const hc = navigator.hardwareConcurrency || 8;
    const mem = navigator.deviceMemory;
    const conn = navigator.connection;
    const saveData = !!(conn && conn.saveData);
    const slowNet = !!(conn && (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g"));
    return hc <= 4 || (typeof mem === "number" && mem <= 4) || saveData || slowNet;
  } catch (_) {
    return false;
  }
}

function sleep(ms, signal) {
  return new Promise(function (resolve, reject) {
    if (signal && signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        "abort",
        function () {
          window.clearTimeout(id);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
    }
  });
}

function ensureDom() {
  let root = document.getElementById("subject-scene");
  if (!root) {
    root = document.createElement("div");
    root.id = "subject-scene";
    root.className = "subject-scene cs-terminal";
    root.setAttribute("aria-hidden", "true");
    document.body.prepend(root);
  } else {
    root.classList.add("cs-terminal");
  }

  let canvas = root.querySelector(".subject-scene__canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "subject-scene__canvas cs-terminal__bg";
    canvas.setAttribute("aria-hidden", "true");
    root.appendChild(canvas);
  } else {
    canvas.classList.add("cs-terminal__bg");
  }

  let panel = root.querySelector(".cs-terminal__panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "cs-terminal__panel";
    panel.innerHTML =
      '<div class="cs-terminal__chrome" aria-hidden="true">' +
      '<span class="cs-terminal__dot"></span>' +
      '<span class="cs-terminal__dot"></span>' +
      '<span class="cs-terminal__dot"></span>' +
      '<span class="cs-terminal__title">stem — computer-science</span>' +
      "</div>" +
      '<pre class="cs-terminal__output" aria-hidden="true"></pre>' +
      '<div class="cs-terminal__flash" aria-hidden="true"></div>';
    root.appendChild(panel);
  }

  let skip = root.querySelector(".subject-scene__skip");
  if (!skip && !prefersReducedMotion()) {
    skip = document.createElement("button");
    skip.type = "button";
    skip.className = "subject-scene__skip";
    skip.textContent = "Skip intro";
    root.appendChild(skip);
  }

  return {
    root: root,
    canvas: canvas,
    panel: panel,
    output: panel.querySelector(".cs-terminal__output"),
    flash: panel.querySelector(".cs-terminal__flash"),
    skip: skip,
  };
}

function createGlyphField(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const weak = isWeakDevice();
  const mobile = (function () {
    try {
      return window.matchMedia("(max-width: 720px)").matches || weak;
    } catch (_) {
      return weak;
    }
  })();
  const dprCap = weak || mobile ? DPR_WEAK : DPR_CAP;
  const count = weak ? 28 : mobile ? 42 : 64;
  const particles = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  let running = false;
  let raf = 0;
  let last = 0;
  let disposed = false;
  let docVisible = document.visibilityState !== "hidden";

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random(),
      y: Math.random(),
      vy: 0.012 + Math.random() * 0.035,
      ch: GLYPHS[(Math.random() * GLYPHS.length) | 0],
      a: 0.08 + Math.random() * 0.18,
    });
  }

  function resize() {
    if (disposed) return;
    const cssW = Math.max(1, canvas.clientWidth || window.innerWidth);
    const cssH = Math.max(1, canvas.clientHeight || window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    w = cssW;
    h = cssH;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    raf = 0;
    if (disposed || !running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;

    ctx.clearRect(0, 0, w, h);
    ctx.font = '500 13px "DM Mono", "Cascadia Code", Consolas, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y += p.vy * dt * 0.35;
      if (p.y > 1.05) {
        p.y = -0.05;
        p.x = Math.random();
        p.ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      ctx.globalAlpha = p.a;
      ctx.fillStyle = i % 3 === 0 ? "#5eead4" : "#4a8fd4";
      ctx.fillText(p.ch, p.x * w, p.y * h);
    }
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(draw);
  }

  function sync() {
    if (disposed) return;
    const next = docVisible;
    if (next && !running) {
      running = true;
      last = 0;
      raf = requestAnimationFrame(draw);
    } else if (!next && running) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function onVisibility() {
    docVisible = document.visibilityState !== "hidden";
    sync();
  }

  function onResize() {
    resize();
  }

  resize();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", onResize, { passive: true });
  sync();

  return {
    setCalm: function () {
      /* persistent mode already calm; slight opacity drop via CSS */
    },
    dispose: function () {
      if (disposed) return;
      disposed = true;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      try {
        ctx.clearRect(0, 0, w, h);
      } catch (_) { /* ignore */ }
    },
  };
}

/**
 * Standalone CS terminal unlock. Also exported as createCsExperience for boot.js.
 * @param {Function} [mount] Ignored — CS does not use the Three.js mount path.
 */
export function createCsExperience(/* mount */) {
  return startCsTerminal();
}

export function startCsTerminal() {
  const body = document.body;
  const reduced = prefersReducedMotion();
  const dom = ensureDom();
  const ac = new AbortController();
  let finished = false;
  let field = null;
  const failSafe = window.setTimeout(function () {
    finish(true);
  }, 9000);

  body.classList.add("subject-intro-active");
  body.classList.remove("subject-intro-done");

  field = createGlyphField(dom.canvas);

  function finish(skipped) {
    if (finished) return;
    finished = true;
    ac.abort();
    window.clearTimeout(failSafe);
    if (dom.skip) dom.skip.hidden = true;
    if (dom.panel) {
      dom.panel.classList.add("is-exit");
      window.setTimeout(function () {
        if (dom.panel) dom.panel.style.display = "none";
      }, skipped || reduced ? 280 : 520);
    }
    dom.root.classList.add("is-persistent");
    body.classList.remove("subject-intro-active");
    body.classList.add("subject-intro-done");
    if (field) field.setCalm();
  }

  function onSkip(e) {
    e.preventDefault();
    finish(true);
  }

  function onNavClick(e) {
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      const url = new URL(a.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
        dispose();
      }
    } catch (_) { /* ignore */ }
  }

  function dispose() {
    finish(true);
    if (field) field.dispose();
    field = null;
    if (dom.skip) dom.skip.removeEventListener("click", onSkip);
    document.removeEventListener("click", onNavClick);
    window.removeEventListener("pagehide", dispose);
    if (dom.root && dom.root.parentNode) dom.root.remove();
  }

  if (dom.skip) dom.skip.addEventListener("click", onSkip);
  document.addEventListener("click", onNavClick);
  window.addEventListener("pagehide", dispose);

  async function typeLine(prompt, text) {
    const line = document.createElement("div");
    line.className = "cs-terminal__line";
    const promptEl = document.createElement("span");
    promptEl.className = "cs-terminal__prompt";
    promptEl.textContent = prompt;
    const typed = document.createElement("span");
    typed.className = "cs-terminal__typed";
    const caret = document.createElement("span");
    caret.className = "cs-terminal__caret";
    caret.textContent = "█";
    line.appendChild(promptEl);
    line.appendChild(typed);
    line.appendChild(caret);
    dom.output.appendChild(line);
    dom.output.scrollTop = dom.output.scrollHeight;

    for (let i = 0; i < text.length; i++) {
      if (ac.signal.aborted) throw new DOMException("Aborted", "AbortError");
      typed.textContent += text[i];
      dom.output.scrollTop = dom.output.scrollHeight;
      await sleep(18 + Math.random() * 28, ac.signal);
    }
    caret.remove();
  }

  function appendStatic(text, cls) {
    const line = document.createElement("div");
    line.className = "cs-terminal__line " + (cls || "");
    line.textContent = text;
    dom.output.appendChild(line);
    dom.output.scrollTop = dom.output.scrollHeight;
  }

  async function run() {
    if (reduced) {
      // Short reduced-motion path — unlock on next frame, no artificial hold.
      await new Promise(function (resolve) {
        requestAnimationFrame(function () {
          requestAnimationFrame(resolve);
        });
      });
      finish(true);
      return;
    }

    // Typing begins immediately — no leading setTimeout before the first line.
    for (let i = 0; i < SCRIPT.length; i++) {
      if (ac.signal.aborted) return;
      const step = SCRIPT[i];
      if (step.kind === "prompt") {
        await typeLine(step.text, step.type);
        await sleep(160 + Math.random() * 120, ac.signal);
      } else if (step.kind === "out") {
        appendStatic(step.text, "cs-terminal__muted");
        await sleep(step.delay || 160, ac.signal);
      } else if (step.kind === "ok") {
        appendStatic(step.text, "cs-terminal__ok");
        await sleep(step.delay || 120, ac.signal);
      }
    }

    if (dom.flash) {
      dom.flash.classList.add("is-on");
      await sleep(140, ac.signal);
      dom.flash.classList.remove("is-on");
    }
    await sleep(220, ac.signal);
    finish(false);
  }

  run().catch(function (err) {
    if (err && err.name === "AbortError") return;
    finish(true);
  });

  return { dispose: dispose };
}

function autoBoot() {
  if (document.body.getAttribute("data-subject-scene") !== "cs") return;
  // Prefer dedicated CS page script; skip if Three boot already owns the scene
  if (document.body.classList.contains("subject-intro-done") && document.getElementById("subject-scene")) {
    return;
  }
  startCsTerminal();
}

// Module scripts are deferred — DOM is ready; no DOMContentLoaded wait.
autoBoot();
