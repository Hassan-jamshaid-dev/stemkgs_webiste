/**
 * Subject-scene bootstrap — reads data-subject-scene and mounts the experience.
 * Loads only the active subject module (no eager import of all six).
 */
import { mountSubjectScene, prefersReducedMotion } from "./core.js";

const LOADERS = {
  cs: function () {
    return import("./cs.js").then(function (m) {
      return m.createCsExperience;
    });
  },
  maths: function () {
    return import("./maths.js").then(function (m) {
      return m.createMathsExperience;
    });
  },
  physics: function () {
    return import("./physics.js").then(function (m) {
      return m.createPhysicsExperience;
    });
  },
  chemistry: function () {
    return import("./chemistry.js").then(function (m) {
      return m.createChemistryExperience;
    });
  },
  biology: function () {
    return import("./biology.js").then(function (m) {
      return m.createBiologyExperience;
    });
  },
  crime: function () {
    return import("./crime.js").then(function (m) {
      return m.createCrimeExperience;
    });
  },
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
  if (!id || !LOADERS[id]) return;

  // Lock chrome on the first boot tick — before async subject import resolves.
  document.body.classList.add("subject-intro-active");
  document.body.classList.remove("subject-intro-done");

  // Kick the subject module fetch immediately (overlaps WebGL probe / DOM ensure).
  const factoryPromise = LOADERS[id]();

  const reduced = prefersReducedMotion();
  // Accessibility: skip cinematic WebGL for most subjects.
  // Biology still mounts a short settle + cheap persistent field.
  if (reduced && id !== "biology") {
    document.body.classList.remove("subject-intro-active");
    document.body.classList.add("subject-intro-done");
    return;
  }

  // WebGL gate
  try {
    const test = document.createElement("canvas");
    const gl = test.getContext("webgl") || test.getContext("experimental-webgl");
    if (!gl) {
      document.body.classList.remove("subject-intro-active");
      document.body.classList.add("subject-intro-done");
      return;
    }
  } catch (_) {
    document.body.classList.remove("subject-intro-active");
    document.body.classList.add("subject-intro-done");
    return;
  }

  const dom = ensureDom(id);
  let failSafe = 0;

  factoryPromise
    .then(function (factory) {
      factory(function (config) {
        const failMs =
          typeof config.failSafeMs === "number" && config.failSafeMs > 0
            ? config.failSafeMs
            : 9000;
        // Fail-safe only forces unlock if intro never completes — not a start offset.
        failSafe = window.setTimeout(function () {
          document.body.classList.remove("subject-intro-active");
          document.body.classList.add("subject-intro-done");
          const sceneRoot = document.getElementById("subject-scene");
          if (sceneRoot) sceneRoot.classList.add("is-persistent");
        }, failMs);

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
    })
    .catch(function () {
      if (failSafe) window.clearTimeout(failSafe);
      document.body.classList.remove("subject-intro-active");
      document.body.classList.add("subject-intro-done");
      if (dom.root && dom.root.parentNode) dom.root.remove();
    });
}

// Module scripts are deferred — DOM is ready when this runs. No DOMContentLoaded wait.
start();
