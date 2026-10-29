(function () {
  var loginForm = document.getElementById("cal-login-form");
  var loginStatus = document.getElementById("cal-login-status");
  var yearSelect = document.getElementById("cal-school-year");
  var monthSelect = document.getElementById("cal-month");
  var viewStatus = document.getElementById("cal-view-status");
  var emptyBanner = document.getElementById("cal-empty-banner");
  var monthLabel = document.getElementById("cal-month-label");
  var grid = document.getElementById("cal-grid");

  var MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

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

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function mondayBasedWeekday(date) {
    var day = date.getDay();
    return day === 0 ? 6 : day - 1;
  }

  function resolveCalendarYear(schoolYear, monthIndex) {
    var parts = String(schoolYear || "2025-2026").split("-");
    var startYear = parseInt(parts[0], 10) || 2025;
    var endYear = parseInt(parts[1], 10) || startYear + 1;
    /* School year months: Sep–Dec = start year; Jan–Aug = end year */
    return monthIndex >= 8 ? startYear : endYear;
  }

  function renderPlaceholderGrid(periodLabel, calendarYear, monthIndex) {
    if (!grid) return;

    var sample = {
      index: 11,
      label: "Team meeting",
      meta: "Lab 2 · 15:30"
    };

    var totalDays = daysInMonth(calendarYear, monthIndex);
    var leading = mondayBasedWeekday(new Date(calendarYear, monthIndex, 1));
    var prevMonthDays = daysInMonth(
      monthIndex === 0 ? calendarYear - 1 : calendarYear,
      monthIndex === 0 ? 11 : monthIndex - 1
    );

    var days = [];
    var i;
    for (i = 0; i < leading; i += 1) {
      days.push({ muted: true, num: prevMonthDays - leading + i + 1, sample: false });
    }
    for (i = 1; i <= totalDays; i += 1) {
      days.push({ muted: false, num: i, sample: i === sample.index });
    }
    while (days.length % 7 !== 0) {
      days.push({ muted: true, num: days.length - leading - totalDays + 1, sample: false });
    }

    grid.innerHTML = "";
    days.forEach(function (day) {
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
          periodLabel +
          "</span>";
        cell.appendChild(slot);
      } else if (!day.muted) {
        var empty = document.createElement("p");
        empty.className = "cal-day-empty";
        empty.textContent = "No events";
        cell.appendChild(empty);
      }

      grid.appendChild(cell);
    });
  }

  function updateCalendarView() {
    if (!yearSelect) return;

    var year = yearSelect.value || "2025-2026";
    var monthIndex = monthSelect ? parseInt(monthSelect.value, 10) : 8;
    if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      monthIndex = 8;
    }

    var monthName = MONTH_NAMES[monthIndex];
    var periodLabel = monthName + " · " + year;
    var calendarYear = resolveCalendarYear(year, monthIndex);

    if (viewStatus) {
      viewStatus.innerHTML =
        "Showing placeholder layout for <strong>" +
        periodLabel +
        "</strong>. Live data arrives with the API.";
    }
    if (emptyBanner) {
      emptyBanner.innerHTML =
        "<strong>" +
        periodLabel +
        "</strong> — placeholder board. Live logistics load when the API is connected.";
    }
    if (monthLabel) {
      monthLabel.textContent = periodLabel;
    }
    renderPlaceholderGrid(periodLabel, calendarYear, monthIndex);
    console.info("[calendar] period selected", { year: year, month: monthName });
  }

  if (yearSelect) {
    yearSelect.addEventListener("change", updateCalendarView);
    if (monthSelect) {
      monthSelect.addEventListener("change", updateCalendarView);
    }
    updateCalendarView();
  }
})();
