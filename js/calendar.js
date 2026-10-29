(function () {
  var loginForm = document.getElementById("cal-login-form");
  var loginStatus = document.getElementById("cal-login-status");
  var yearSelect = document.getElementById("cal-school-year");
  var viewStatus = document.getElementById("cal-view-status");
  var grid = document.getElementById("cal-grid");

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = document.getElementById("cal-email");
      var society = document.getElementById("cal-society");
      var message =
        "Sign-in is not connected yet. Backend auth comes later — no account is checked on this frontend pass.";
      if (loginStatus) {
        loginStatus.textContent = message;
      }
      console.info("[calendar] login stub", {
        email: email ? email.value : "",
        society: society ? society.value : ""
      });
      window.alert(message);
    });
  }

  function renderPlaceholderGrid(yearLabel) {
    if (!grid) return;

    /* Sample placeholder: one sample slot so the board looks ready for data */
    var sample = {
      index: 11,
      label: "Team meeting",
      meta: "Lab 2 · 15:30"
    };

    var days = [];
    var i;
    for (i = 0; i < 2; i += 1) {
      days.push({ muted: true, num: 30 + i, sample: false });
    }
    for (i = 1; i <= 31; i += 1) {
      days.push({ muted: false, num: i, sample: i === sample.index });
    }
    while (days.length % 7 !== 0) {
      days.push({ muted: true, num: days.length - 32, sample: false });
    }

    grid.innerHTML = "";
    days.forEach(function (day, index) {
      var cell = document.createElement("div");
      cell.className = "cal-day" + (day.muted ? " is-muted" : "");
      cell.setAttribute("role", "listitem");
      if (!day.muted && day.num === 1) {
        cell.classList.add("is-today");
      }

      var num = document.createElement("span");
      num.className = "cal-day-num";
      num.textContent = String(day.num);
      cell.appendChild(num);

      if (day.sample) {
        var slot = document.createElement("p");
        slot.className = "cal-day-slot";
        slot.innerHTML =
          "<strong>" +
          sample.label +
          "</strong><br>" +
          sample.meta +
          "<br><span style=\"opacity:.75\">" +
          yearLabel +
          "</span>";
        cell.appendChild(slot);
      } else if (!day.muted) {
        var empty = document.createElement("p");
        empty.className = "cal-day-empty";
        empty.textContent = "No events";
        cell.appendChild(empty);
      }

      grid.appendChild(cell);
      void index;
    });
  }

  function updateYearStatus() {
    if (!yearSelect || !viewStatus) return;
    var year = yearSelect.value;
    viewStatus.innerHTML =
      "Showing placeholder layout for <strong>" +
      year +
      "</strong>. Live data arrives with the API.";
    renderPlaceholderGrid(year);
    console.info("[calendar] school year selected", year);
  }

  if (yearSelect) {
    yearSelect.addEventListener("change", updateYearStatus);
    updateYearStatus();
  }
})();
