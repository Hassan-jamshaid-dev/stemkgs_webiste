/**
 * Reusable subject-scene runtime: renderer lifecycle, visibility pause,
 * reduced-motion gate, resize, and clean dispose on leave.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";

export { THREE, gsap };

export function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    return false;
  }
}

export function isMobileBudget() {
  return window.matchMedia("(max-width: 720px)").matches ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
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
  const mobile = isMobileBudget();

  body.classList.add("subject-intro-active");
  body.classList.remove("subject-intro-done");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
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
  let raf = 0;
  let running = true;
  let disposed = false;
  let introDone = false;
  let introTl = null;
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
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function frame() {
    if (disposed || !running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (options.update) options.update(ctx, dt, t);
    renderer.render(scene, camera);
  }

  function setRunning(next) {
    if (disposed) return;
    if (next && !running) {
      running = true;
      clock.start();
      raf = requestAnimationFrame(frame);
    } else if (!next && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  function onVisibility() {
    setRunning(document.visibilityState !== "hidden");
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

  function dispose() {
    if (disposed) return;
    disposed = true;
    running = false;
    cancelAnimationFrame(raf);
    if (introTl && introTl.kill) introTl.kill();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", dispose);
    window.removeEventListener("beforeunload", dispose);
    if (skipBtn) skipBtn.removeEventListener("click", onSkip);

    if (options.disposeExtra) {
      try { options.disposeExtra(ctx); } catch (_) { /* ignore */ }
    }

    disposables.forEach(function (item) {
      try {
        if (!item) return;
        if (item.parent) item.parent.remove(item);
        if (item.geometry && item.geometry.dispose) item.geometry.dispose();
        if (item.material) {
          if (Array.isArray(item.material)) item.material.forEach(function (m) { m.dispose && m.dispose(); });
          else if (item.material.dispose) item.material.dispose();
        }
        if (item.dispose) item.dispose();
        if (item instanceof THREE.Texture) item.dispose();
      } catch (_) { /* ignore */ }
    });

    scene.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose && m.dispose(); });
        else obj.material.dispose && obj.material.dispose();
      }
    });

    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
    root.remove();
  }

  function onSkip(e) {
    e.preventDefault();
    finishIntro(true);
  }

  options.build(ctx);
  resize();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", dispose);
  window.addEventListener("beforeunload", dispose);
  // SPA-style / in-tab navigations via link clicks still tear down GL
  document.addEventListener("click", function onNavClick(e) {
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      const url = new URL(a.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
        dispose();
        document.removeEventListener("click", onNavClick);
      }
    } catch (_) { /* ignore */ }
  });
  if (skipBtn) skipBtn.addEventListener("click", onSkip);

  raf = requestAnimationFrame(frame);

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
