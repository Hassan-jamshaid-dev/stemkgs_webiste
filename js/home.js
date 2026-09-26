(function () {
  document.documentElement.classList.add("js");

  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");

  var backdrop = document.querySelector(".hero-backdrop");
  if (backdrop) {
    function rebalance() {
      var cells = backdrop.querySelectorAll(".hero-photo");
      var units = 0;
      cells.forEach(function (cell) {
        cell.classList.remove("hero-photo-wide");
        units += cell.classList.contains("hero-photo-tall") ? 2 : 1;
      });
      /* Fill a leftover hole after a failed load without fighting the tall span */
      if (units > 0 && units % 2 === 1) {
        var last = cells[cells.length - 1];
        if (last && !last.classList.contains("hero-photo-tall")) {
          last.classList.add("hero-photo-wide");
        }
      }
    }
    backdrop.querySelectorAll(".hero-photo img").forEach(function (img) {
      function dropBroken() {
        var cell = img.closest(".hero-photo");
        if (cell) cell.remove();
        rebalance();
      }
      img.addEventListener("error", dropBroken);
      if (img.complete && img.naturalWidth === 0) dropBroken();
    });
  }

  if (nav) {
    function onScroll() {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (toggle && links) {
    function setOpen(open) {
      links.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    toggle.addEventListener("click", function () {
      setOpen(!links.classList.contains("is-open"));
    });
    links.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && links.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }
})();
