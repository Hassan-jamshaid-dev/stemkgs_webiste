/* Home-page scroll driver for the STEM journey.
   The viewport is pinned with CSS sticky. Scroll progress comes from ScrollTrigger
   when that library has loaded, otherwise from the section's own layout.
   Wheel and touch scrolling stay native. */
(function () {
  var section = document.querySelector(".stem-journey");
  if (!section) return;

  var pin = section.querySelector(".stem-journey-pin");
  var canvas = section.querySelector(".stem-journey-canvas");
  var copyEl = section.querySelector(".stem-journey-copy");
  var nameEl = document.getElementById("stem-journey-name");
  var titleEl = document.getElementById("stem-journey-title");
  var bodyEl = document.getElementById("stem-journey-body");
  var indexEl = document.getElementById("stem-journey-index");
  var eqEl = document.getElementById("stem-journey-eq");
  var progressEl = section.querySelector(".stem-journey-progress");
  var dots = progressEl ? [].slice.call(progressEl.querySelectorAll("span")) : [];
  var reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  var stages = [].slice.call(section.querySelectorAll(".stem-journey-fallback li")).map(function (li) {
    function text(sel) {
      var node = li.querySelector(sel);
      return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
    }
    return {
      id: li.getAttribute("data-stage") || "",
      name: text(".stem-journey-kicker"),
      title: text("h3"),
      body: text(".stem-journey-body")
    };
  });

  var sceneApi = null;
  var st = null;
  var raf = 0;
  var alive = false;
  var inView = false;
  var current = -1;
  var mathOn = false;
  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

  function showStatic() {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    section.classList.remove("is-live");
    section.classList.add("is-static");
    if (st) {
      try { st.kill(); } catch (err) { /* leave the page scrollable */ }
      st = null;
    }
    if (sceneApi) {
      var api = sceneApi;
      sceneApi = null;
      try { api.dispose(); } catch (err2) { /* static list remains */ }
    }
  }

  if (reduceMq.addEventListener) {
    reduceMq.addEventListener("change", function () {
      if (reduceMq.matches) showStatic();
    });
  }

  if (reduceMq.matches || !canvas || !pin || !window.StemJourneyScene) {
    showStatic();
    return;
  }

  import(THREE_URL).then(function (THREE) {
    if (reduceMq.matches || section.classList.contains("is-static")) return;
    try {
      boot(THREE);
    } catch (err) {
      showStatic();
    }
  }).catch(function () {
    showStatic();
  });

  function readProgress() {
    var viewH = pin.offsetHeight || window.innerHeight || 1;
    var total = section.offsetHeight - viewH;
    if (total <= 1) return 0;
    var y = -section.getBoundingClientRect().top;
    if (y <= 0) return 0;
    if (y >= total) return 1;
    return y / total;
  }

  function currentProgress() {
    var measured = readProgress();
    if (!st || typeof st.progress !== "number") return measured;
    if (Math.abs(st.progress - measured) > 0.12) return measured;
    return st.progress;
  }

  function applyView(view) {
    if (!view || !stages.length) return;
    var stage = stages[view.stage] || stages[0];
    if (view.stage !== current) {
      current = view.stage;
      if (nameEl) nameEl.textContent = stage.name;
      if (titleEl) titleEl.textContent = stage.title;
      if (bodyEl) bodyEl.textContent = stage.body;
      if (indexEl) indexEl.textContent = view.stage < 9 ? "0" + (view.stage + 1) : String(view.stage + 1);
      for (var i = 0; i < dots.length; i++) {
        if (i === view.stage) dots[i].classList.add("is-on");
        else dots[i].classList.remove("is-on");
      }
    }
    var fading = view.copyOpacity < 0.08;
    var id = fading ? "convergence" : stage.id;
    if (section.getAttribute("data-stage") !== id) section.setAttribute("data-stage", id);
    if (view.showMath !== mathOn) {
      mathOn = view.showMath;
      if (eqEl) eqEl.hidden = !mathOn;
    }
    var opacity = String(view.copyOpacity);
    if (copyEl) copyEl.style.opacity = opacity;
    if (progressEl) progressEl.style.opacity = opacity;
  }

  function bindScroll() {
    if (window.gsap && window.ScrollTrigger) {
      try {
        window.gsap.registerPlugin(window.ScrollTrigger);
        st = window.ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          invalidateOnRefresh: true
        });
        window.ScrollTrigger.refresh();
      } catch (err) {
        st = null;
      }
    }
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function startLoop() {
    if (!alive || !inView || document.hidden || raf) return;
    raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    raf = 0;
    if (!alive || !inView || document.hidden || !sceneApi) return;
    try {
      applyView(sceneApi.render(currentProgress(), now * 0.001));
    } catch (err) {
      showStatic();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function boot(THREE) {
    if (reduceMq.matches || section.classList.contains("is-static")) return;
    alive = true;
    var lite = window.innerWidth < 800 || window.innerHeight < 700;
    sceneApi = window.StemJourneyScene(THREE, {
      canvas: canvas,
      viewport: pin,
      lite: lite
    });
    sceneApi.resize();
    bindScroll();
    applyView(sceneApi.render(readProgress(), 0));
    section.classList.add("is-live");

    canvas.addEventListener("webglcontextlost", function (event) {
      event.preventDefault();
      if (alive) showStatic();
    }, false);

    function onResize() {
      if (sceneApi) sceneApi.resize();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
    window.addEventListener("resize", onResize, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(pin);

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) startLoop();
        else stopLoop();
      }, { rootMargin: "80px 0px", threshold: 0 });
      observer.observe(section);
    }
    var rect = section.getBoundingClientRect();
    inView = rect.bottom > -80 && rect.top < window.innerHeight + 80;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopLoop();
      else if (inView) startLoop();
    });
    window.addEventListener("load", onResize);
    startLoop();
  }
})();
