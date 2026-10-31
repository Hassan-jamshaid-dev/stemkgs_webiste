/* Desktop: prefer stitched hero.jpg. Mobile: always show 3 stacked panels. */
(function () {
  var panels = document.getElementById("ec-hero-panels");
  var stitched = document.querySelector(".ec-hero-stitched");
  if (!panels || !stitched) return;

  var mq = window.matchMedia("(max-width: 720px)");
  var hasStitch = false;

  function apply() {
    if (mq.matches || !hasStitch) {
      stitched.hidden = true;
      panels.hidden = false;
    } else {
      stitched.hidden = false;
      panels.hidden = true;
    }
  }

  var probe = new Image();
  probe.onload = function () {
    hasStitch = true;
    apply();
  };
  probe.onerror = function () {
    hasStitch = false;
    apply();
  };
  probe.src = "assets/images/exec-council/hero.jpg";

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", apply);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(apply);
  }
})();
