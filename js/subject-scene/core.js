/**
 * Reusable subject-scene runtime: renderer lifecycle, visibility/offscreen pause,
 * shared rAF loop, perf budgets, reduced-motion gate, resize, and clean dispose.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";

export { THREE, gsap };

/** Shared particle / instance baselines — scenes should prefer budgetCount(). */
export const SCENE_PERF = {
  dprMax: 1.5,
  dprWeak: 1,
  counts: {
    particles: { desktop: 1800, mobile: 900, weak: 480 },
    points: { desktop: 110, mobile: 64, weak: 40 },
    sparks: { desktop: 56, mobile: 32, weak: 20 },
    ions: { desktop: 220, mobile: 120, weak: 72 },
    vesicles: { desktop: 260, mobile: 140, weak: 80 },
    ribbons: { desktop: 5, mobile: 3, weak: 2 },
    waves: { desktop: 5, mobile: 3, weak: 2 },
    segments: { desktop: 96, mobile: 56, weak: 36 },
  },
};

export function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    return false;
  }
}

export function isWeakDevice() {
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

export function isMobileBudget() {
  try {
    return window.matchMedia("(max-width: 720px)").matches || isWeakDevice();
  } catch (_) {
    return isWeakDevice();
  }
}

export function getPixelRatioCap() {
  return isWeakDevice() || isMobileBudget() ? SCENE_PERF.dprWeak : SCENE_PERF.dprMax;
}

/**
 * Scale a count for the current device budget.
 * @param {number} desktop
 * @param {number} [mobile]
 * @param {number} [weak]
 */
export function budgetCount(desktop, mobile, weak) {
  const mid = mobile != null ? mobile : Math.max(1, Math.round(desktop * 0.5));
  const low = weak != null ? weak : Math.max(1, Math.round(mid * 0.55));
  if (isWeakDevice()) return low;
  if (isMobileBudget()) return mid;
  return desktop;
}

/** Resolve a named SCENE_PERF.counts entry for the current device. */
export function budgetFromKey(key) {
  const entry = SCENE_PERF.counts[key];
  if (!entry) return budgetCount(100);
  return budgetCount(entry.desktop, entry.mobile, entry.weak);
}

/**
 * One shared rAF pump for all mounted subject scenes (usually one).
 * Avoids stacked independent loops if multiple mounts ever coexist.
 */
const sharedFrameLoop = {
  subs: new Set(),
  raf: 0,
  add(fn) {
    this.subs.add(fn);
    if (!this.raf) this.raf = requestAnimationFrame((t) => this._tick(t));
  },
  remove(fn) {
    this.subs.delete(fn);
    if (!this.subs.size && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  },
  _tick(now) {
    this.raf = 0;
    if (!this.subs.size) return;
    this.raf = requestAnimationFrame((t) => this._tick(t));
    this.subs.forEach(function (fn) {
      try { fn(now); } catch (_) { /* isolate scene errors */ }
    });
  },
};

function disposeMaterial(mat) {
  if (!mat) return;
  const maps = [
    "map", "alphaMap", "aoMap", "bumpMap", "displacementMap", "emissiveMap",
    "envMap", "lightMap", "metalnessMap", "normalMap", "roughnessMap", "specularMap",
  ];
  for (let i = 0; i < maps.length; i++) {
    const tex = mat[maps[i]];
    if (tex && tex.dispose) {
      try { tex.dispose(); } catch (_) { /* ignore */ }
    }
  }
  if (mat.dispose) {
    try { mat.dispose(); } catch (_) { /* ignore */ }
  }
}

function disposeObject3D(obj) {
  if (!obj) return;
  if (obj.geometry && obj.geometry.dispose) {
    try { obj.geometry.dispose(); } catch (_) { /* ignore */ }
  }
  if (obj.material) {
    if (Array.isArray(obj.material)) obj.material.forEach(disposeMaterial);
    else disposeMaterial(obj.material);
  }
}

/**
 * @param {object} options
 * @param {string} options.id
 * @param {HTMLElement} options.root
 * @param {HTMLCanvasElement} options.canvas
 * @param {HTMLElement} [options.splash]
 * @param {HTMLButtonElement} [options.skip]
 * @param {(ctx: object) => void} options.build
 * @param {(ctx: object) => gsap.core.Timeline | Promise<void> | void} options.intro
 * @param {(ctx: object, dt: number, t: number) => void} [options.update]
 * @param {(ctx: object) => void} [options.onPersistent]
 * @param {(ctx: object) => void} [options.disposeExtra]
 * @param {number} [options.clearColor]
 * @param {number} [options.fogNear]
 * @param {number} [options.fogFar]
 * @param {number} [options.fogColor]
 */
export function mountSubjectScene(options) {
  const body = document.body;
  const root = options.root;
  const canvas = options.canvas;
  const splash = options.splash || null;
  const skipBtn = options.skip || null;
  const reduced = prefersReducedMotion();
  const weak = isWeakDevice();
  const mobile = isMobileBudget();
  const dprCap = getPixelRatioCap();

  body.classList.add("subject-intro-active");
  body.classList.remove("subject-intro-done");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile && !weak,
    alpha: true,
    powerPreference: weak ? "low-power" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setClearColor(options.clearColor ?? 0x070b14, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  if (options.fogColor != null) {
    scene.fog = new THREE.Fog(
      options.fogColor,
      options.fogNear ?? 6,
      options.fogFar ?? 42
    );
  }

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  camera.position.set(0, 0.2, 14);

  const clock = new THREE.Clock();
  let running = false;
  let disposed = false;
  let introDone = false;
  let introTl = null;
  let docVisible = document.visibilityState !== "hidden";
  let canvasVisible = true;
  let resizeQueued = false;
  const disposables = [];

  const ctx = {
    THREE,
    gsap,
    root,
    canvas,
    splash,
    renderer,
    scene,
    camera,
    clock,
    reduced,
    mobile,
    weak,
    perf: SCENE_PERF,
    budgetCount,
    budgetFromKey,
    disposables,
    track(obj) {
      disposables.push(obj);
      return obj;
    },
    setPersistent() {
      finishIntro(true);
    },
  };

  function resize() {
    if (disposed) return;
    // Prefer canvas box (no forced window layout) when available.
    const w = Math.max(1, canvas.clientWidth || root.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || root.clientHeight || window.innerHeight);
    if (camera.aspect !== w / h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    renderer.setSize(w, h, false);
  }

  function queueResize() {
    if (disposed || resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      resize();
    });
  }

  function onFrame() {
    if (disposed || !running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (options.update) options.update(ctx, dt, t);
    renderer.render(scene, camera);
  }

  function syncRunning() {
    if (disposed) return;
    setRunning(docVisible && canvasVisible);
  }

  function setRunning(next) {
    if (disposed) return;
    if (next && !running) {
      running = true;
      // Do not reset clock — preserves elapsedTime for scene update(t).
      clock.getDelta();
      sharedFrameLoop.add(onFrame);
    } else if (!next && running) {
      running = false;
      sharedFrameLoop.remove(onFrame);
    }
  }

  function onVisibility() {
    docVisible = document.visibilityState !== "hidden";
    syncRunning();
  }

  let io = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(
      function (entries) {
        let seen = false;
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting && entries[i].intersectionRatio > 0) {
            seen = true;
            break;
          }
        }
        canvasVisible = seen;
        syncRunning();
      },
      { root: null, threshold: 0 }
    );
    io.observe(canvas);
  }

  function finishIntro(fromSkip) {
    if (introDone || disposed) return;
    introDone = true;
    if (introTl && introTl.kill) introTl.kill();
    if (splash) {
      splash.style.opacity = "0";
      splash.style.transform = "scale(1)";
    }
    if (skipBtn) skipBtn.hidden = true;
    root.classList.add("is-persistent");
    renderer.setClearColor(options.clearColor ?? 0x070b14, 0);
    if (scene.fog) {
      scene.fog.near = Math.max(scene.fog.near, 12);
      scene.fog.far = Math.max(scene.fog.far, 44);
    }
    body.classList.remove("subject-intro-active");
    body.classList.add("subject-intro-done");
    if (options.onPersistent) options.onPersistent(ctx, { skipped: !!fromSkip });
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
    if (disposed) return;
    disposed = true;
    running = false;
    sharedFrameLoop.remove(onFrame);
    if (introTl && introTl.kill) introTl.kill();
    introTl = null;

    window.removeEventListener("resize", queueResize);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", dispose);
    window.removeEventListener("beforeunload", dispose);
    document.removeEventListener("click", onNavClick);
    if (skipBtn) skipBtn.removeEventListener("click", onSkip);
    if (io) {
      try { io.disconnect(); } catch (_) { /* ignore */ }
      io = null;
    }

    if (options.disposeExtra) {
      try { options.disposeExtra(ctx); } catch (_) { /* ignore */ }
    }

    disposables.forEach(function (item) {
      try {
        if (!item) return;
        if (item.parent) item.parent.remove(item);
        if (item instanceof THREE.Texture) {
          item.dispose();
          return;
        }
        disposeObject3D(item);
        if (item.dispose && item !== item.geometry && item !== item.material) {
          try { item.dispose(); } catch (_) { /* ignore */ }
        }
      } catch (_) { /* ignore */ }
    });
    disposables.length = 0;

    scene.traverse(function (obj) {
      disposeObject3D(obj);
    });
    while (scene.children.length) {
      scene.remove(scene.children[0]);
    }

    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
    if (renderer.domElement && renderer.domElement.remove) {
      /* canvas stays in DOM until root.remove */
    }
    root.remove();
  }

  function onSkip(e) {
    e.preventDefault();
    finishIntro(true);
  }

  options.build(ctx);
  resize();
  window.addEventListener("resize", queueResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", dispose);
  window.addEventListener("beforeunload", dispose);
  document.addEventListener("click", onNavClick);
  if (skipBtn) skipBtn.addEventListener("click", onSkip);

  syncRunning();

  Promise.resolve()
    .then(function () {
      if (disposed) return;
      if (reduced) {
        finishIntro(true);
        return;
      }
      const result = options.intro(ctx);
      if (result && typeof result.then === "function") {
        return result.then(function () { finishIntro(false); });
      }
      if (result && result.eventCallback) {
        introTl = result;
        result.eventCallback("onComplete", function () { finishIntro(false); });
        return;
      }
      finishIntro(false);
    })
    .catch(function () {
      finishIntro(true);
    });

  return { dispose, ctx };
}

export function makeCharAtlas(THREERef, chars, opts) {
  const options = opts || {};
  const size = options.size || 64;
  const cols = Math.ceil(Math.sqrt(chars.length));
  const rows = Math.ceil(chars.length / cols);
  const canvas = document.createElement("canvas");
  canvas.width = cols * size;
  canvas.height = rows * size;
  const ctx2d = canvas.getContext("2d", { alpha: true });
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  ctx2d.fillStyle = options.color || "#5eead4";
  ctx2d.font = "600 " + Math.floor(size * 0.62) + "px \"DM Mono\", \"Cascadia Code\", Consolas, \"Courier New\", monospace";
  ctx2d.textAlign = "center";
  ctx2d.textBaseline = "middle";
  for (let i = 0; i < chars.length; i++) {
    const x = (i % cols) * size + size / 2;
    const y = Math.floor(i / cols) * size + size / 2;
    ctx2d.globalAlpha = 0.2;
    ctx2d.fillText(chars[i], x + 1.5, y + 1.5);
    ctx2d.globalAlpha = 1;
    ctx2d.fillText(chars[i], x, y);
  }
  const tex = new THREERef.CanvasTexture(canvas);
  tex.colorSpace = THREERef.SRGBColorSpace;
  tex.premultiplyAlpha = false;
  tex.needsUpdate = true;
  return { texture: tex, cols, rows, chars };
}
