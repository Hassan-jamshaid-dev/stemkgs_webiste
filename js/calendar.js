(function () {
  var loginForm = document.getElementById("cal-login-form");
  var loginStatus = document.getElementById("cal-login-status");
  var yearSelect = document.getElementById("cal-school-year");
  var monthSelect = document.getElementById("cal-month");
  var viewStatus = document.getElementById("cal-view-status");
  var emptyBanner = document.getElementById("cal-empty-banner");
  var monthLabel = document.getElementById("cal-month-label");
  var grid = document.getElementById("cal-grid");
  var refreshBtn = document.getElementById("cal-refresh-stub");

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

  /* School-year display order: Aug → Jul */
  var SCHOOL_YEAR_MONTHS = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];

  var SOCIETY_LABELS = {
    maths: "Mathematics",
    physics: "Physics",
    chemistry: "Chemistry",
    "computer-science": "Computer Science",
    biology: "Biology",
    robotics: "Robotics",
    astronomy: "Astronomy",
    crime: "Crime"
  };

  var API_BASE =
    (window.STEM_CALENDAR_API && String(window.STEM_CALENDAR_API).replace(/\/$/, "")) ||
    "http://localhost:8000";

  var fetchSeq = 0;

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var message =
        "Editor sign-in wiring lands in the next pass. Use View calendar for the public board.";
      if (loginStatus) {
        loginStatus.textContent = message;
      }
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

  function parseSchoolYear(schoolYear) {
    var parts = String(schoolYear || "2025-2026").split("-");
    var startYear = parseInt(parts[0], 10) || 2025;
    var endYear = parseInt(parts[1], 10) || startYear + 1;
    return { startYear: startYear, endYear: endYear };
  }

  function resolveCalendarYear(schoolYear, monthIndex) {
    var years = parseSchoolYear(schoolYear);
    return monthIndex >= 7 ? years.startYear : years.endYear;
  }

  function isMonthInSchoolYear(schoolYear, calendarYear, monthIndex) {
    var years = parseSchoolYear(schoolYear);
    if (calendarYear === years.startYear && monthIndex >= 7) return true;
    if (calendarYear === years.endYear && monthIndex <= 6) return true;
    return false;
  }

  function defaultMonthIndex(schoolYear) {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    if (isMonthInSchoolYear(schoolYear, y, m)) {
      return m;
    }
    return 7;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatTimeRange(startsAt, endsAt) {
    var start = new Date(startsAt);
    var end = new Date(endsAt);
    var opts = { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" };
    try {
      return (
        start.toLocaleTimeString("en-GB", opts) +
        "–" +
        end.toLocaleTimeString("en-GB", opts)
      );
    } catch (err) {
      return start.toISOString().slice(11, 16) + "–" + end.toISOString().slice(11, 16);
    }
  }

  function karachiYmd(iso) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date(iso));
    } catch (err) {
      return String(iso).slice(0, 10);
    }
  }

  function eventsByDay(events, calendarYear, monthIndex) {
    var map = {};
    var monthStart = new Date(calendarYear, monthIndex, 1);
    var monthEnd = new Date(calendarYear, monthIndex + 1, 0);
    (events || []).forEach(function (ev) {
      var startKey = karachiYmd(ev.starts_at);
      var endKey = karachiYmd(ev.ends_at);
      var cursor = new Date(monthStart.getTime());
      for (; cursor <= monthEnd; cursor.setDate(cursor.getDate() + 1)) {
        var key =
          cursor.getFullYear() +
          "-" +
          String(cursor.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(cursor.getDate()).padStart(2, "0");
        if (key >= startKey && key <= endKey) {
          if (!map[key]) map[key] = [];
          map[key].push(ev);
        }
      }
    });
    return map;
  }

  function renderGrid(periodLabel, calendarYear, monthIndex, events) {
    if (!grid) return;

    var byDay = eventsByDay(events, calendarYear, monthIndex);
    var totalDays = daysInMonth(calendarYear, monthIndex);
    var leading = mondayBasedWeekday(new Date(calendarYear, monthIndex, 1));
    var prevMonthDays = daysInMonth(
      monthIndex === 0 ? calendarYear - 1 : calendarYear,
      monthIndex === 0 ? 11 : monthIndex - 1
    );

    var today = new Date();
    var todayKey =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    var days = [];
    var i;
    for (i = 0; i < leading; i += 1) {
      days.push({ muted: true, num: prevMonthDays - leading + i + 1, key: null });
    }
    for (i = 1; i <= totalDays; i += 1) {
      var key =
        calendarYear +
        "-" +
        String(monthIndex + 1).padStart(2, "0") +
        "-" +
        String(i).padStart(2, "0");
      days.push({ muted: false, num: i, key: key });
    }
    while (days.length % 7 !== 0) {
      days.push({ muted: true, num: days.length - leading - totalDays + 1, key: null });
    }

    grid.innerHTML = "";
    days.forEach(function (day) {
      var cell = document.createElement("div");
      cell.className = "cal-day" + (day.muted ? " is-muted" : "");
      cell.setAttribute("role", "listitem");
      if (!day.muted && day.key === todayKey) {
        cell.classList.add("is-today");
      }

      var num = document.createElement("span");
      num.className = "cal-day-num";
      num.textContent = String(day.num);
      cell.appendChild(num);

      if (!day.muted) {
        var dayEvents = (day.key && byDay[day.key]) || [];
        if (dayEvents.length) {
          dayEvents.forEach(function (ev) {
            var slot = document.createElement("p");
            slot.className = "cal-day-slot";
            var society = SOCIETY_LABELS[ev.society] || ev.society;
            slot.innerHTML =
              "<strong>" +
              escapeHtml(ev.event_name) +
              "</strong><br>" +
              escapeHtml(ev.room) +
              " · " +
              escapeHtml(formatTimeRange(ev.starts_at, ev.ends_at)) +
              "<br><span style=\"opacity:.75\">" +
              escapeHtml(society) +
              "</span>";
            cell.appendChild(slot);
          });
        } else {
          var empty = document.createElement("p");
          empty.className = "cal-day-empty";
          empty.textContent = "No events";
          cell.appendChild(empty);
        }
      }

      grid.appendChild(cell);
    });
  }

  function setStatus(periodLabel, count, errorMessage) {
    if (monthLabel) {
      monthLabel.textContent = periodLabel;
    }
    if (errorMessage) {
      if (viewStatus) {
        viewStatus.textContent = errorMessage;
      }
      if (emptyBanner) {
        emptyBanner.innerHTML = "<strong>Could not load events</strong> — " + escapeHtml(errorMessage);
      }
      return;
    }
    if (viewStatus) {
      viewStatus.innerHTML =
        "Showing <strong>" +
        count +
        "</strong> event" +
        (count === 1 ? "" : "s") +
        " for <strong>" +
        escapeHtml(periodLabel) +
        "</strong>.";
    }
    if (emptyBanner) {
      if (count === 0) {
        emptyBanner.innerHTML =
          "<strong>" +
          escapeHtml(periodLabel) +
          "</strong> — no logistics booked yet for this month.";
      } else {
        emptyBanner.innerHTML =
          "<strong>" +
          escapeHtml(periodLabel) +
          "</strong> — live logistics from the calendar API.";
      }
    }
  }

  function fetchEvents(schoolYear, monthIndex) {
    var url =
      API_BASE +
      "/events?school_year=" +
      encodeURIComponent(schoolYear) +
      "&month=" +
      encodeURIComponent(String(monthIndex));
    return fetch(url, {
      method: "GET",
      credentials: "omit",
      headers: { Accept: "application/json" }
    }).then(function (res) {
      if (!res.ok) {
        throw new Error("API " + res.status);
      }
      return res.json();
    });
  }

  function updateCalendarView() {
    if (!yearSelect) return;

    var year = yearSelect.value || "2025-2026";
    var monthIndex = monthSelect ? parseInt(monthSelect.value, 10) : 7;
    if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      monthIndex = 7;
    }
    if (SCHOOL_YEAR_MONTHS.indexOf(monthIndex) === -1) {
      monthIndex = 7;
    }

    var monthName = MONTH_NAMES[monthIndex];
    var periodLabel = monthName + " · " + year;
    var calendarYear = resolveCalendarYear(year, monthIndex);
    var seq = (fetchSeq += 1);

    if (viewStatus) {
      viewStatus.textContent = "Loading events for " + periodLabel + "…";
    }

    fetchEvents(year, monthIndex)
      .then(function (payload) {
        if (seq !== fetchSeq) return;
        var events = (payload && payload.events) || [];
        setStatus(periodLabel, events.length, null);
        renderGrid(periodLabel, calendarYear, monthIndex, events);
      })
      .catch(function (err) {
        if (seq !== fetchSeq) return;
        setStatus(
          periodLabel,
          0,
          "Could not reach the calendar API at " + API_BASE + ". Is it running?"
        );
        renderGrid(periodLabel, calendarYear, monthIndex, []);
        console.warn("[calendar] fetch failed", err);
      });
  }

  if (refreshBtn) {
    refreshBtn.disabled = false;
    refreshBtn.removeAttribute("title");
    refreshBtn.addEventListener("click", function () {
      updateCalendarView();
    });
  }

  if (yearSelect) {
    if (monthSelect) {
      monthSelect.value = String(defaultMonthIndex(yearSelect.value || "2025-2026"));
      monthSelect.addEventListener("change", updateCalendarView);
    }
    yearSelect.addEventListener("change", function () {
      if (monthSelect) {
        monthSelect.value = String(defaultMonthIndex(yearSelect.value || "2025-2026"));
      }
      updateCalendarView();
    });
    updateCalendarView();
  }
})();
