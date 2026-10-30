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
  var modeBadge = document.getElementById("cal-mode-badge");
  var lead = document.getElementById("cal-lead");
  var editor = document.getElementById("cal-editor");
  var editorForm = document.getElementById("cal-editor-form");
  var editorMeta = document.getElementById("cal-editor-meta");
  var editorStatus = document.getElementById("cal-editor-status");
  var editId = document.getElementById("cal-edit-id");
  var editName = document.getElementById("cal-edit-name");
  var editRoom = document.getElementById("cal-edit-room");
  var editStart = document.getElementById("cal-edit-start");
  var editEnd = document.getElementById("cal-edit-end");
  var editSave = document.getElementById("cal-edit-save");
  var editReset = document.getElementById("cal-edit-reset");
  var editDelete = document.getElementById("cal-edit-delete");
  var signInLink = document.getElementById("cal-signin-link");
  var logoutBtn = document.getElementById("cal-logout-btn");

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
  var CURRENT_SCHOOL_YEAR = "2025-2026";
  var API_BASE =
    (window.STEM_CALENDAR_API && String(window.STEM_CALENDAR_API).replace(/\/$/, "")) ||
    "http://localhost:8000";

  var fetchSeq = 0;
  var authUser = null;
  var csrfToken = null;
  var lastEvents = [];

  function api(path, options) {
    var opts = options || {};
    var headers = Object.assign({ Accept: "application/json" }, opts.headers || {});
    if (opts.json !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (opts.csrf && csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
    return fetch(API_BASE + path, {
      method: opts.method || "GET",
      credentials: "include",
      headers: headers,
      body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (err) {
            data = { detail: text };
          }
        }
        return { ok: res.ok, status: res.status, data: data, res: res };
      });
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function mondayBasedWeekday(date) {
    var day = date.getDay();
    return day === 0 ? 6 : day - 1;
  }

  function parseSchoolYear(schoolYear) {
    var parts = String(schoolYear || CURRENT_SCHOOL_YEAR).split("-");
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
    if (isMonthInSchoolYear(schoolYear, y, m)) return m;
    return 7;
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

  function toDatetimeLocalValue(iso) {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(new Date(iso));
    var map = {};
    parts.forEach(function (p) {
      if (p.type !== "literal") map[p.type] = p.value;
    });
    return map.year + "-" + map.month + "-" + map.day + "T" + map.hour + ":" + map.minute;
  }

  function fromDatetimeLocalValue(value) {
    /* Treat as Asia/Karachi wall time → ISO with +05:00 (no DST in PK). */
    if (!value) return null;
    return value + ":00+05:00";
  }

  function canEditYear(schoolYear) {
    return !!(authUser && schoolYear === CURRENT_SCHOOL_YEAR);
  }

  function detailMessage(data) {
    if (!data) return "Request failed.";
    if (typeof data.detail === "string") return data.detail;
    if (data.detail && data.detail.message) return data.detail.message;
    if (Array.isArray(data.detail) && data.detail[0] && data.detail[0].msg) {
      return data.detail[0].msg;
    }
    return "Request failed.";
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

  function setEditorVisible(show) {
    if (!editor) return;
    if (show) {
      editor.hidden = false;
    } else {
      editor.hidden = true;
    }
  }

  function resetEditorForm() {
    if (!editorForm) return;
    editId.value = "";
    editorForm.reset();
    if (editDelete) editDelete.hidden = true;
    if (editSave) editSave.textContent = "Save event";
    if (editorStatus) editorStatus.textContent = "";
  }

  function loadEventIntoEditor(ev) {
    if (!editorForm || !ev) return;
    editId.value = ev.id;
    editName.value = ev.event_name;
    editRoom.value = ev.room;
    editStart.value = toDatetimeLocalValue(ev.starts_at);
    editEnd.value = toDatetimeLocalValue(ev.ends_at);
    if (editDelete) editDelete.hidden = false;
    if (editSave) editSave.textContent = "Update event";
    if (editorStatus) {
      editorStatus.textContent = "Editing “" + ev.event_name + "”.";
    }
    editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function updateAuthChrome(schoolYear) {
    var editing = canEditYear(schoolYear);
    if (modeBadge) {
      modeBadge.textContent = editing ? "Editor · " + (SOCIETY_LABELS[authUser.society] || authUser.society) : "View only";
      modeBadge.classList.toggle("is-editor", editing);
    }
    if (lead) {
      lead.textContent = editing
        ? "You can create, update, or delete your society’s bookings for " + CURRENT_SCHOOL_YEAR + "."
        : authUser
          ? "Signed in, but this school year is view-only. Edits are limited to " + CURRENT_SCHOOL_YEAR + "."
          : "Event, room, and time slots appear here by school year. Presidents and vice presidents edit after sign-in.";
    }
    if (signInLink) signInLink.hidden = !!authUser;
    if (logoutBtn) logoutBtn.hidden = !authUser;
    setEditorVisible(editing);
    if (editorMeta && authUser) {
      editorMeta.textContent =
        "Signed in as " +
        authUser.email +
        " · " +
        (SOCIETY_LABELS[authUser.society] || authUser.society) +
        ". Room conflicts require a ≥2 hour gap.";
    }
  }

  function renderGrid(periodLabel, calendarYear, monthIndex, events, schoolYear) {
    if (!grid) return;
    var byDay = eventsByDay(events, calendarYear, monthIndex);
    var editing = canEditYear(schoolYear);
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
      days.push({
        muted: false,
        num: i,
        key:
          calendarYear +
          "-" +
          String(monthIndex + 1).padStart(2, "0") +
          "-" +
          String(i).padStart(2, "0")
      });
    }
    while (days.length % 7 !== 0) {
      days.push({ muted: true, num: days.length - leading - totalDays + 1, key: null });
    }

    grid.innerHTML = "";
    days.forEach(function (day) {
      var cell = document.createElement("div");
      cell.className = "cal-day" + (day.muted ? " is-muted" : "");
      cell.setAttribute("role", "listitem");
      if (!day.muted && day.key === todayKey) cell.classList.add("is-today");

      var num = document.createElement("span");
      num.className = "cal-day-num";
      num.textContent = String(day.num);
      cell.appendChild(num);

      if (!day.muted) {
        var dayEvents = (day.key && byDay[day.key]) || [];
        if (dayEvents.length) {
          dayEvents.forEach(function (ev) {
            var slot = document.createElement("button");
            slot.type = "button";
            slot.className = "cal-day-slot";
            var mine = authUser && ev.society === authUser.society;
            if (editing && mine) slot.classList.add("is-editable");
            else slot.disabled = true;
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
            if (editing && mine) {
              slot.addEventListener("click", function () {
                loadEventIntoEditor(ev);
              });
            }
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
    if (monthLabel) monthLabel.textContent = periodLabel;
    if (errorMessage) {
      if (viewStatus) viewStatus.textContent = errorMessage;
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
      emptyBanner.innerHTML =
        count === 0
          ? "<strong>" + escapeHtml(periodLabel) + "</strong> — no logistics booked yet for this month."
          : "<strong>" + escapeHtml(periodLabel) + "</strong> — live logistics from the calendar API.";
    }
  }

  function updateCalendarView() {
    if (!yearSelect) return;
    var year = yearSelect.value || CURRENT_SCHOOL_YEAR;
    var monthIndex = monthSelect ? parseInt(monthSelect.value, 10) : 7;
    if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) monthIndex = 7;
    if (SCHOOL_YEAR_MONTHS.indexOf(monthIndex) === -1) monthIndex = 7;

    var periodLabel = MONTH_NAMES[monthIndex] + " · " + year;
    var calendarYear = resolveCalendarYear(year, monthIndex);
    var seq = (fetchSeq += 1);
    updateAuthChrome(year);
    if (viewStatus) viewStatus.textContent = "Loading events for " + periodLabel + "…";

    api("/events?school_year=" + encodeURIComponent(year) + "&month=" + encodeURIComponent(String(monthIndex)))
      .then(function (result) {
        if (seq !== fetchSeq) return;
        if (!result.ok) throw new Error(detailMessage(result.data));
        var events = (result.data && result.data.events) || [];
        lastEvents = events;
        setStatus(periodLabel, events.length, null);
        renderGrid(periodLabel, calendarYear, monthIndex, events, year);
      })
      .catch(function (err) {
        if (seq !== fetchSeq) return;
        lastEvents = [];
        setStatus(periodLabel, 0, "Could not reach the calendar API at " + API_BASE + ".");
        renderGrid(periodLabel, calendarYear, monthIndex, [], year);
        console.warn("[calendar] fetch failed", err);
      });
  }

  function refreshSession() {
    return api("/auth/session").then(function (result) {
      if (result.ok && result.data && result.data.authenticated) {
        authUser = result.data.user;
        csrfToken = result.data.csrf_token;
      } else {
        authUser = null;
        csrfToken = null;
      }
      return authUser;
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var emailEl = document.getElementById("cal-email");
      var passwordEl = document.getElementById("cal-password");
      var societyEl = document.getElementById("cal-society");
      if (loginStatus) loginStatus.textContent = "Signing in…";
      api("/auth/login", {
        method: "POST",
        json: {
          email: emailEl ? emailEl.value : "",
          password: passwordEl ? passwordEl.value : "",
          society: societyEl ? societyEl.value : ""
        }
      }).then(function (result) {
        if (!result.ok) {
          if (loginStatus) loginStatus.textContent = detailMessage(result.data);
          return;
        }
        if (loginStatus) loginStatus.textContent = "Signed in. Opening calendar…";
        window.location.href = "calendar.html";
      }).catch(function () {
        if (loginStatus) {
          loginStatus.textContent = "Could not reach the API at " + API_BASE + ".";
        }
      });
    });
  }

  if (editorForm) {
    editorForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!canEditYear(yearSelect ? yearSelect.value : CURRENT_SCHOOL_YEAR)) return;
      var payload = {
        event_name: editName.value.trim(),
        room: editRoom.value.trim(),
        starts_at: fromDatetimeLocalValue(editStart.value),
        ends_at: fromDatetimeLocalValue(editEnd.value),
        school_year: CURRENT_SCHOOL_YEAR
      };
      var id = editId.value;
      var req = id
        ? api("/events/" + encodeURIComponent(id), { method: "PUT", csrf: true, json: payload })
        : api("/events", { method: "POST", csrf: true, json: payload });
      if (editorStatus) editorStatus.textContent = "Saving…";
      req.then(function (result) {
        if (!result.ok) {
          if (editorStatus) editorStatus.textContent = detailMessage(result.data);
          return;
        }
        if (editorStatus) editorStatus.textContent = id ? "Updated." : "Created.";
        resetEditorForm();
        updateCalendarView();
      }).catch(function () {
        if (editorStatus) editorStatus.textContent = "Save failed — is the API running?";
      });
    });
  }

  if (editReset) {
    editReset.addEventListener("click", function () {
      resetEditorForm();
    });
  }

  if (editDelete) {
    editDelete.addEventListener("click", function () {
      var id = editId.value;
      if (!id) return;
      if (!window.confirm("Delete this event permanently?")) return;
      if (editorStatus) editorStatus.textContent = "Deleting…";
      api("/events/" + encodeURIComponent(id), { method: "DELETE", csrf: true }).then(function (result) {
        if (!result.ok) {
          if (editorStatus) editorStatus.textContent = detailMessage(result.data);
          return;
        }
        resetEditorForm();
        if (editorStatus) editorStatus.textContent = "Deleted.";
        updateCalendarView();
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      api("/auth/logout", { method: "POST", csrf: true }).finally(function () {
        authUser = null;
        csrfToken = null;
        resetEditorForm();
        updateCalendarView();
      });
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
      monthSelect.value = String(defaultMonthIndex(yearSelect.value || CURRENT_SCHOOL_YEAR));
      monthSelect.addEventListener("change", updateCalendarView);
    }
    yearSelect.addEventListener("change", function () {
      if (monthSelect) {
        monthSelect.value = String(defaultMonthIndex(yearSelect.value || CURRENT_SCHOOL_YEAR));
      }
      updateCalendarView();
    });
    refreshSession()
      .catch(function () {
        authUser = null;
        csrfToken = null;
      })
      .finally(function () {
        updateCalendarView();
      });
  }
})();
