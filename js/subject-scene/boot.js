/**
 * Subject-scene bootstrap — reads data-subject-scene and mounts the experience.
 */
import { mountSubjectScene, prefersReducedMotion } from "./core.js";
import { createCsExperience } from "./cs.js";
import { createMathsExperience } from "./maths.js";
import { createPhysicsExperience } from "./physics.js";
import { createChemistryExperience } from "./chemistry.js";
import { createBiologyExperience } from "./biology.js";
import { createCrimeExperience } from "./crime.js";

const FACTORIES = {
  cs: createCsExperience,
  maths: createMathsExperience,
  physics: createPhysicsExperience,
  chemistry: createChemistryExperience,
  biology: createBiologyExperience,
  crime: createCrimeExperience,
};

function ensureDom(id) {
  let root = document.getElementById("subject-scene");
  if (!root) {
    root = document.createElement("div");
    root.id = "subject-scene";
    root.className = "subject-scene";
    root.setAttribute("aria-hidden", "true");
    document.body.prepend(root);
  }

  let canvas = root.querySelector(".subject-scene__canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "subject-scene__canvas";
    canvas.setAttribute("aria-hidden", "true");
    root.appendChild(canvas);
  }

  let splash = root.querySelector(".subject-scene__splash");
  if (!splash) {
    splash = document.createElement("div");
    splash.className = "subject-scene__splash";
    splash.setAttribute("aria-hidden", "true");
    root.appendChild(splash);
  }

  let skip = root.querySelector(".subject-scene__skip");
  if (!skip && !prefersReducedMotion()) {
    skip = document.createElement("button");
    skip.type = "button";
    skip.className = "subject-scene__skip";
    skip.textContent = "Skip intro";
    root.appendChild(skip);
  }

  root.setAttribute("data-scene", id);
  return { root, canvas, splash, skip };
}

function start() {
  const id = document.body.getAttribute("data-subject-scene");
  if (!id || !FACTORIES[id]) return;

  // Accessibility: skip cinematic WebGL entirely
  if (prefersReducedMotion()) {
    document.body.classList.remove("subject-intro-active");
    document.body.classList.add("subject-intro-done");
    return;
  }

  // WebGL gate
  try {
    const test = document.createElement("canvas");
    const gl = test.getContext("webgl") || test.getContext("experimental-webgl");
    if (!gl) {
      document.body.classList.add("subject-intro-done");
      return;
    }
  } catch (_) {
    document.body.classList.add("subject-intro-done");
    return;
  }

  const dom = ensureDom(id);
  const factory = FACTORIES[id];
  const failSafe = window.setTimeout(function () {
    document.body.classList.remove("subject-intro-active");
    document.body.classList.add("subject-intro-done");
    const sceneRoot = document.getElementById("subject-scene");
    if (sceneRoot) sceneRoot.classList.add("is-persistent");
  }, 9000);

  try {
    factory(function (config) {
      const handle = mountSubjectScene({
        id: config.id || id,
        root: dom.root,
        canvas: dom.canvas,
        splash: dom.splash,
        skip: dom.skip,
        clearColor: config.clearColor,
        fogColor: config.fogColor,
        fogNear: config.fogNear,
        fogFar: config.fogFar,
        build: config.build,
        intro: config.intro,
        update: config.update,
        onPersistent: function (ctx, meta) {
          window.clearTimeout(failSafe);
          if (config.onPersistent) config.onPersistent(ctx, meta);
        },
        disposeExtra: config.disposeExtra,
      });
      return handle;
    });
  } catch (err) {
    window.clearTimeout(failSafe);
    document.body.classList.remove("subject-intro-active");
    document.body.classList.add("subject-intro-done");
    if (dom.root && dom.root.parentNode) dom.root.remove();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
