/**
 * KGSO page motion — progressive enhancement only.
 * Content stays visible if this script never runs.
 */
(function () {
  "use strict";

  var page = document.body;
  if (!page || !page.classList.contains("kgso-page")) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initHeroField() {
    var hero = document.querySelector(".kgso-hero");
    if (!hero) return;

    if (!hero.querySelector(".kgso-hero-field")) {
      var field = document.createElement("div");
      field.className = "kgso-hero-field";
      field.setAttribute("aria-hidden", "true");
      hero.insertBefore(field, hero.firstChild);
    }

    if (reduceMotion) return;

    var canvas = hero.querySelector(".kgso-stars");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "kgso-stars";
      canvas.setAttribute("aria-hidden", "true");
      hero.insertBefore(canvas, hero.firstChild);
    }

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var points = [];
    var raf = 0;
    var running = false;

    function resize() {
      var rect = hero.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(48, Math.max(18, Math.floor((rect.width * rect.height) / 28000)));
      points = [];
      for (var i = 0; i < count; i++) {
        points.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          r: 0.6 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.08,
          a: 0.25 + Math.random() * 0.55,
          hue: Math.random() > 0.7 ? "magenta" : Math.random() > 0.45 ? "cyan" : "white"
        });
      }
    }

    function colorFor(p) {
      if (p.hue === "magenta") return "rgba(255, 45, 155," + p.a + ")";
      if (p.hue === "cyan") return "rgba(62, 200, 255," + p.a + ")";
      return "rgba(255, 245, 220," + p.a + ")";
    }

    function frame() {
      if (!running) return;
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;
        ctx.beginPath();
        ctx.fillStyle = colorFor(p);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
    }

    resize();
    start();

    var resizeTimer = 0;
    window.addEventListener(
      "resize",
      function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 120);
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });
  }

  function initModuleTilt() {
    var modules = document.querySelectorAll(".kgso-module");
    if (!modules.length) return;

    modules.forEach(function (card) {
      function clearTilt() {
        card.style.setProperty("--kgso-tilt-x", "0deg");
        card.style.setProperty("--kgso-tilt-y", "0deg");
        card.classList.remove("is-lit");
      }

      card.addEventListener("pointerenter", function () {
        card.classList.add("is-lit");
      });

      card.addEventListener("pointerleave", clearTilt);

      if (reduceMotion) return;

      card.addEventListener("pointermove", function (event) {
        var rect = card.getBoundingClientRect();
        var px = (event.clientX - rect.left) / rect.width;
        var py = (event.clientY - rect.top) / rect.height;
        var tiltY = (px - 0.5) * 10;
        var tiltX = (0.5 - py) * 8;
        card.style.setProperty("--kgso-tilt-x", tiltX.toFixed(2) + "deg");
        card.style.setProperty("--kgso-tilt-y", tiltY.toFixed(2) + "deg");
        card.classList.add("is-lit");
      });
    });
  }

  initHeroField();
  initModuleTilt();
})();
