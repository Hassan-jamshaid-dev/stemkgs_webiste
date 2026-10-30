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
  var editStartDate = document.getElementById("cal-edit-start-date");
  var editStartTime = document.getElementById("cal-edit-start-time");
  var editEndDate = document.getElementById("cal-edit-end-date");
  var editEndTime = document.getElementById("cal-edit-end-time");
  var editSave = document.getElementById("cal-edit-save");
  var editReset = document.getElementById("cal-edit-reset");
  var editClearSel = document.getElementById("cal-edit-clear-sel");
  var editDelete = document.getElementById("cal-edit-delete");
  var selectionSummary = document.getElementById("cal-selection-summary");
  var legendSelect = document.getElementById("cal-legend-select");
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
    "stem-society": "STEM Society",
    maths: "Mathematics",
    physics: "Physics",
    chemistry: "Chemistry",
    "computer-science": "Computer Science",
    biology: "Biology",
    robotics: "Robotics",
    astronomy: "Astronomy",
    crime: "Crime"
  };
  var CURRENT_SCHOOL_YEAR = "2026-2027";
  var PROD_API_BASE = "https://stem-society-calendar-api.onrender.com";
  function resolveApiBase() {
    if (window.STEM_CALENDAR_API) {
      return String(window.STEM_CALENDAR_API).replace(/\/$/, "");
    }
    var host = (window.location && window.location.hostname) || "";
    if (/\.vercel\.app$/i.test(host)) {
      return PROD_API_BASE;
    }
    return "http://localhost:8000";
  }
  var API_BASE = resolveApiBase();

  var fetchSeq = 0;
  var authUser = null;
  var csrfToken = null;
  var lastEvents = [];
  var selectedStartKey = null;
  var selectedEndKey = null;
  var DEFAULT_START_TIME = "09:00";
  var DEFAULT_END_TIME = "17:00";

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
    var startYear = parseInt(parts[0], 10) || 2026;
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
    var startKey = karachiYmd(startsAt);
    var endKey = karachiYmd(endsAt);
    var timeOpts = { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" };
    var start = new Date(startsAt);
    var end = new Date(endsAt);
    var startTime;
    var endTime;
    try {
      startTime = start.toLocaleTimeString("en-GB", timeOpts);
      endTime = end.toLocaleTimeString("en-GB", timeOpts);
    } catch (err) {
      startTime = String(startsAt).slice(11, 16);
      endTime = String(endsAt).slice(11, 16);
    }
    if (startKey === endKey) {
      return startTime + "–" + endTime;
    }
    return startKey.slice(5) + " " + startTime + " → " + endKey.slice(5) + " " + endTime;
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

  function toKarachiParts(iso) {
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
    return {
      date: map.year + "-" + map.month + "-" + map.day,
      time: map.hour + ":" + map.minute
    };
  }

  function combineDateAndTime(dateValue, timeValue) {
    /* Asia/Karachi wall time → ISO with +05:00 (no DST in PK). */
    if (!dateValue || !timeValue) return null;
    var time = timeValue.length === 5 ? timeValue + ":00" : timeValue;
    return dateValue + "T" + time + "+05:00";
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

  function clearDaySelection(keepFormDates) {
    selectedStartKey = null;
    selectedEndKey = null;
    paintDaySelection();
    updateSelectionSummary();
    if (!keepFormDates && editId && !editId.value) {
      if (editStartDate) editStartDate.value = "";
      if (editEndDate) editEndDate.value = "";
    }
  }

  function selectedRangeKeys() {
    if (!selectedStartKey) return [];
    var a = selectedStartKey;
    var b = selectedEndKey || selectedStartKey;
    var start = a <= b ? a : b;
    var end = a <= b ? b : a;
    var keys = [];
    var cursor = new Date(
      parseInt(start.slice(0, 4), 10),
      parseInt(start.slice(5, 7), 10) - 1,
      parseInt(start.slice(8, 10), 10)
    );
    var endDate = new Date(
      parseInt(end.slice(0, 4), 10),
      parseInt(end.slice(5, 7), 10) - 1,
      parseInt(end.slice(8, 10), 10)
    );
    while (cursor <= endDate) {
      keys.push(
        cursor.getFullYear() +
          "-" +
          String(cursor.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(cursor.getDate()).padStart(2, "0")
      );
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }

  function paintDaySelection() {
    if (!grid) return;
    var selected = {};
    selectedRangeKeys().forEach(function (key) {
      selected[key] = true;
    });
    Array.prototype.forEach.call(grid.querySelectorAll(".cal-day[data-date]"), function (cell) {
      var key = cell.getAttribute("data-date");
      cell.classList.toggle("is-selected", !!(key && selected[key]));
      cell.setAttribute("aria-selected", key && selected[key] ? "true" : "false");
    });
  }

  function formatKeyLabel(key) {
    if (!key) return "";
    var y = parseInt(key.slice(0, 4), 10);
    var m = parseInt(key.slice(5, 7), 10) - 1;
    var d = parseInt(key.slice(8, 10), 10);
    return MONTH_NAMES[m] + " " + d + ", " + y;
  }

  function updateSelectionSummary() {
    if (!selectionSummary) return;
    var keys = selectedRangeKeys();
    if (!keys.length) {
      selectionSummary.hidden = true;
      selectionSummary.textContent = "";
      return;
    }
    selectionSummary.hidden = false;
    if (keys.length === 1) {
      selectionSummary.textContent = "Selected day: " + formatKeyLabel(keys[0]) + " — customize below.";
    } else {
      selectionSummary.textContent =
        "Selected " +
        keys.length +
        " days: " +
        formatKeyLabel(keys[0]) +
        " → " +
        formatKeyLabel(keys[keys.length - 1]) +
        " — customize name, room, and times below.";
    }
  }

  function applySelectionToEditor(options) {
    var opts = options || {};
    var keys = selectedRangeKeys();
    if (!keys.length || !editorForm) return;
    if (!opts.keepEventId) {
      editId.value = "";
      if (editDelete) editDelete.hidden = true;
      if (editSave) editSave.textContent = "Save event";
    }
    if (editStartDate) editStartDate.value = keys[0];
    if (editEndDate) editEndDate.value = keys[keys.length - 1];
    if (editStartTime && (!editStartTime.value || opts.forceDefaultTimes)) {
      editStartTime.value = DEFAULT_START_TIME;
    }
    if (editEndTime && (!editEndTime.value || opts.forceDefaultTimes)) {
      editEndTime.value = DEFAULT_END_TIME;
    }
    updateSelectionSummary();
    if (editorStatus) {
      editorStatus.textContent =
        keys.length === 1
          ? "New booking on " + formatKeyLabel(keys[0]) + "."
          : "New booking spanning " + keys.length + " days.";
    }
    if (editor && !editor.hidden) {
      editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function handleDaySelect(key) {
    if (!key) return;
    if (!selectedStartKey || (selectedStartKey && selectedEndKey)) {
      selectedStartKey = key;
      selectedEndKey = null;
    } else if (key === selectedStartKey) {
      selectedEndKey = key;
    } else {
      selectedEndKey = key;
    }
    paintDaySelection();
    applySelectionToEditor({ forceDefaultTimes: false });
  }

  function resetEditorForm() {
    if (!editorForm) return;
    editId.value = "";
    editorForm.reset();
    if (editDelete) editDelete.hidden = true;
    if (editSave) editSave.textContent = "Save event";
    if (editorStatus) editorStatus.textContent = "";
    clearDaySelection(true);
  }

  function loadEventIntoEditor(ev) {
    if (!editorForm || !ev) return;
    editId.value = ev.id;
    editName.value = ev.event_name;
    editRoom.value = ev.room;
    var startParts = toKarachiParts(ev.starts_at);
    var endParts = toKarachiParts(ev.ends_at);
    if (editStartDate) editStartDate.value = startParts.date;
    if (editStartTime) editStartTime.value = startParts.time;
    if (editEndDate) editEndDate.value = endParts.date;
    if (editEndTime) editEndTime.value = endParts.time;
    selectedStartKey = startParts.date;
    selectedEndKey = endParts.date;
    paintDaySelection();
    updateSelectionSummary();
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
        ? "Click days on the grid to select a booking range for " +
          CURRENT_SCHOOL_YEAR +
          ", then customize name, room, and times below."
        : authUser
          ? "Signed in, but this school year is view-only. Edits are limited to " + CURRENT_SCHOOL_YEAR + "."
          : "Event, room, and time slots appear here by school year. Presidents and vice presidents edit after sign-in.";
    }
    if (legendSelect) {
      legendSelect.textContent = editing
        ? "Editors: click a day, then another day to set the range. Click an event chip to edit it."
        : "Empty cells are ready for scheduled logistics.";
    }
    if (signInLink) signInLink.hidden = !!authUser;
    if (logoutBtn) logoutBtn.hidden = !authUser;
    setEditorVisible(editing);
    if (!editing) clearDaySelection(true);
    if (editorMeta && authUser) {
      editorMeta.textContent =
        "Signed in as " +
        authUser.email +
        " · " +
        (SOCIETY_LABELS[authUser.society] || authUser.society) +
        ". Click days to select · room conflicts need a ≥2 hour gap.";
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
      if (!day.muted && day.key) {
        cell.setAttribute("data-date", day.key);
        cell.setAttribute("aria-selected", "false");
      }
      if (!day.muted && day.key === todayKey) cell.classList.add("is-today");
      if (!day.muted && editing) {
        cell.classList.add("is-selectable");
        cell.title = "Click to select this day for a booking";
        cell.addEventListener("click", function (evt) {
          if (evt.target.closest && evt.target.closest(".cal-day-slot")) return;
          handleDaySelect(day.key);
        });
        cell.addEventListener("keydown", function (evt) {
          if (evt.key === "Enter" || evt.key === " ") {
            evt.preventDefault();
            handleDaySelect(day.key);
          }
        });
        cell.tabIndex = 0;
      }

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
              slot.addEventListener("click", function (evt) {
                evt.stopPropagation();
                loadEventIntoEditor(ev);
              });
            }
            cell.appendChild(slot);
          });
        } else {
          var empty = document.createElement("p");
          empty.className = "cal-day-empty";
          empty.textContent = editing ? "Click to book" : "No events";
          cell.appendChild(empty);
        }
      }
      grid.appendChild(cell);
    });
    paintDaySelection();
    updateSelectionSummary();
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
      var startDate = editStartDate ? editStartDate.value : "";
      var startTime = editStartTime ? editStartTime.value : "";
      var endDate = editEndDate ? editEndDate.value : "";
      var endTime = editEndTime ? editEndTime.value : "";
      var startsAt = combineDateAndTime(startDate, startTime);
      var endsAt = combineDateAndTime(endDate, endTime);
      if (!startsAt || !endsAt) {
        if (editorStatus) {
          editorStatus.textContent = "Enter starting date + start time and ending date + end time.";
        }
        return;
      }
      if (endsAt <= startsAt) {
        if (editorStatus) {
          editorStatus.textContent = "Ending date/time must be after starting date/time.";
        }
        return;
      }
      var payload = {
        event_name: editName.value.trim(),
        room: editRoom.value.trim(),
        start_date: startDate,
        start_time: startTime.length === 5 ? startTime + ":00" : startTime,
        end_date: endDate,
        end_time: endTime.length === 5 ? endTime + ":00" : endTime,
        starts_at: startsAt,
        ends_at: endsAt,
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
        clearDaySelection(true);
        resetEditorForm();
        updateCalendarView();
      }).catch(function () {
        if (editorStatus) editorStatus.textContent = "Save failed — is the API running?";
      });
    });
  }

  function syncSelectionFromDateInputs() {
    if (!editStartDate || !editEndDate || !editStartDate.value) return;
    selectedStartKey = editStartDate.value;
    selectedEndKey = editEndDate.value || editStartDate.value;
    paintDaySelection();
    updateSelectionSummary();
  }

  if (editStartDate) {
    editStartDate.addEventListener("change", syncSelectionFromDateInputs);
  }
  if (editEndDate) {
    editEndDate.addEventListener("change", syncSelectionFromDateInputs);
  }

  if (editClearSel) {
    editClearSel.addEventListener("click", function () {
      clearDaySelection(false);
      if (editorStatus) editorStatus.textContent = "Day selection cleared. Click days on the grid to book.";
    });
  }

  if (editReset) {
    editReset.addEventListener("click", function () {
      resetEditorForm();
      if (editorStatus) {
        editorStatus.textContent = "Ready for a new booking — click days on the grid.";
      }
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
      monthSelect.addEventListener("change", function () {
        clearDaySelection(true);
        updateCalendarView();
      });
    }
    yearSelect.addEventListener("change", function () {
      if (monthSelect) {
        monthSelect.value = String(defaultMonthIndex(yearSelect.value || CURRENT_SCHOOL_YEAR));
      }
      clearDaySelection(true);
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
