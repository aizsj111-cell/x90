(function () {
  var ua = navigator.userAgent || "";
  var isAppleMobile = /iPhone|iPad|iPod/i.test(ua);
  if (!isAppleMobile) {
    return;
  }

  var STORAGE_KEY = "x90-app-state";
  var TASK_KEYS = [
    "breakfast",
    "lunch",
    "dinner",
    "water",
    "walk",
    "strength",
    "noMilkTea",
    "noLateSnack",
    "noSugaryDrink",
    "noBeer",
    "sleepEarly",
  ];
  var VIOLATION_KEYS = ["lateSnack", "milkTea", "sugaryDrink", "beer", "lateSleep"];

  function todayString() {
    var now = new Date();
    var offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
  }

  function createPlan() {
    return {
      startDate: todayString(),
      days: 90,
      startWeight: 72,
      targetWeight: 57,
      waterGoal: 2,
      walkMinutesGoal: 40,
      sleepTimeGoal: "23:30",
    };
  }

  function createProfile() {
    return {
      nickname: "",
      gender: "female",
      age: null,
      heightCm: null,
      completed: false,
    };
  }

  function createTasks() {
    var tasks = {};
    for (var i = 0; i < TASK_KEYS.length; i += 1) {
      tasks[TASK_KEYS[i]] = false;
    }
    return tasks;
  }

  function createViolations() {
    var violations = {};
    for (var i = 0; i < VIOLATION_KEYS.length; i += 1) {
      violations[VIOLATION_KEYS[i]] = false;
    }
    return violations;
  }

  function dayIndex(startDate, currentDate) {
    var start = new Date(startDate);
    var current = new Date(currentDate);
    var diff = Math.floor((current.getTime() - start.getTime()) / 86400000);
    return Math.max(1, diff + 1);
  }

  function emptyRecord(plan, date) {
    return {
      date: date,
      dayIndex: dayIndex(plan.startDate, date),
      weight: null,
      waist: null,
      mood: "normal",
      exercise: "none",
      tasks: createTasks(),
      violations: createViolations(),
      note: "",
      completionRate: 0,
    };
  }

  function defaultState() {
    var plan = createPlan();
    return {
      profile: createProfile(),
      plan: plan,
      records: [emptyRecord(plan, todayString())],
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var state = defaultState();
      state.profile = parsed.profile || state.profile;
      state.plan = parsed.plan || state.plan;
      state.records = parsed.records || state.records;
      return state;
    } catch (error) {
      return defaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function completionRate(record) {
    var done = 0;
    for (var i = 0; i < TASK_KEYS.length; i += 1) {
      if (record.tasks[TASK_KEYS[i]]) done += 1;
    }
    return Math.round((done / TASK_KEYS.length) * 100);
  }

  function activeRecord(record) {
    if (record.weight !== null || record.waist !== null || (record.note || "").trim()) return true;
    for (var i = 0; i < TASK_KEYS.length; i += 1) if (record.tasks[TASK_KEYS[i]]) return true;
    for (var j = 0; j < VIOLATION_KEYS.length; j += 1) if (record.violations[VIOLATION_KEYS[j]]) return true;
    return false;
  }

  function getTodayRecord(state) {
    var date = todayString();
    for (var i = 0; i < state.records.length; i += 1) {
      if (state.records[i].date === date) return state.records[i];
    }
    var record = emptyRecord(state.plan, date);
    state.records.push(record);
    return record;
  }

  function normalizeState(state) {
    var date = todayString();
    var record = getTodayRecord(state);
    record.dayIndex = dayIndex(state.plan.startDate, date);
    for (var i = 0; i < state.records.length; i += 1) {
      state.records[i].dayIndex = dayIndex(state.plan.startDate, state.records[i].date);
      state.records[i].completionRate = completionRate(state.records[i]);
    }
    state.records.sort(function (a, b) {
      return a.date < b.date ? -1 : 1;
    });
    return state;
  }

  function latestWeight(state) {
    var value = state.plan.startWeight;
    for (var i = 0; i < state.records.length; i += 1) {
      if (state.records[i].weight !== null) value = state.records[i].weight;
    }
    return value;
  }

  function streak(state) {
    var active = state.records.filter(activeRecord).sort(function (a, b) {
      return a.date > b.date ? -1 : 1;
    });
    if (!active.length) return 0;
    var total = 1;
    for (var i = 1; i < active.length; i += 1) {
      var prev = new Date(active[i - 1].date);
      var current = new Date(active[i].date);
      var diff = Math.floor((prev.getTime() - current.getTime()) / 86400000);
      if (diff === 1) total += 1;
      else break;
    }
    return total;
  }

  function feedback(record, records) {
    var rate = record.completionRate || completionRate(record);
    var recent = records.slice().sort(function (a, b) {
      return a.date > b.date ? -1 : 1;
    }).slice(0, 3);
    var noExercise = recent.length === 3 && recent.every(function (item) {
      return item.exercise === "none" && !item.tasks.walk && !item.tasks.strength;
    });

    var rating = "今天整体还可以，但有项目没完成。";
    var tomorrowFocus = "明天优先完成喝水和快走。";
    var warning = "继续控制晚餐，保持节奏。";

    if (rate >= 85) {
      rating = "今天执行很好，继续保持。";
      tomorrowFocus = "明天重点保持晚餐不吃主食。";
      warning = "别因为今天做得好就放松夜宵和睡觉时间。";
    } else if (rate < 60) {
      rating = "今天执行偏弱，不要放弃。";
      tomorrowFocus = "明天只抓三件事：不喝奶茶、不吃夜宵、快走 30 分钟。";
      warning = "先把节奏找回来，比一次练太猛更重要。";
    }

    if (record.violations.milkTea) {
      rating = rate < 60 ? "今天执行偏弱，奶茶影响也比较大。" : "今天整体不错，但奶茶影响比较大。";
      tomorrowFocus = "奶茶是明天第一控制项，换成无糖茶或黑咖啡。";
    }
    if (record.violations.lateSnack) {
      warning = "夜宵比少运动更影响减脂，明晚晚餐蛋白质吃够。";
    }
    if (noExercise) {
      tomorrowFocus = "已经连续 3 天没运动，明天先快走 30 分钟恢复节奏。";
    }

    return {
      rating: rating,
      tomorrowFocus: tomorrowFocus,
      warning: warning,
      reminder: "坚持 90 天，不靠狠，靠每天不断。",
    };
  }

  var currentTab = "home";
  var state = normalizeState(loadState());

  function setSectionVisibility() {
    var onboarding = document.querySelector("[data-onboarding-root]");
    var appShell = document.querySelector("[data-app-shell]");
    var bottomNav = document.querySelector("[data-bottom-nav]");
    var isReady = !!(state.profile && state.profile.completed);

    if (onboarding) onboarding.style.display = isReady ? "none" : "";
    if (appShell) appShell.style.display = isReady ? "" : "none";
    if (bottomNav) bottomNav.style.display = isReady ? "" : "none";

    if (!isReady) {
      return;
    }

    var sections = document.querySelectorAll("[data-section]");
    for (var i = 0; i < sections.length; i += 1) {
      var key = sections[i].getAttribute("data-section");
      sections[i].style.display = key === currentTab ? "" : "none";
    }
    var navs = document.querySelectorAll("[data-nav]");
    for (var j = 0; j < navs.length; j += 1) {
      var active = navs[j].getAttribute("data-nav") === currentTab;
      navs[j].style.background = active ? "#1677ff" : "transparent";
      navs[j].style.color = active ? "#ffffff" : "#64748b";
    }
  }

  function renderMetrics() {
    var record = getTodayRecord(state);
    record.completionRate = completionRate(record);
    var currentWeight = latestWeight(state);
    var stats = {
      currentWeight: currentWeight + " kg",
      targetWeight: state.plan.targetWeight + " kg",
      distanceToGoal: (currentWeight - state.plan.targetWeight).toFixed(1) + " kg",
      todayCompletionRate: record.completionRate + "%",
      streakDays: streak(state) + " 天",
      remainingDays: Math.max(state.plan.days - dayIndex(state.plan.startDate, todayString()), 0) + " 天",
    };
    for (var key in stats) {
      var metric = document.querySelector('[data-metric="' + key + '"] p:last-child');
      if (metric) metric.textContent = stats[key];
    }
  }

  function renderTasks() {
    var record = getTodayRecord(state);
    var buttons = document.querySelectorAll("[data-task]");
    for (var i = 0; i < buttons.length; i += 1) {
      var task = buttons[i].getAttribute("data-task");
      var checked = !!record.tasks[task];
      buttons[i].style.borderColor = checked ? "#bbf7d0" : "#e2e8f0";
      buttons[i].style.background = checked ? "#ecfdf5" : "#ffffff";
      buttons[i].style.color = checked ? "#15803d" : "#334155";
      var mark = buttons[i].querySelector("span:last-child");
      if (mark) mark.textContent = checked ? "✅" : "◻️";
    }
  }

  function renderForms() {
    var record = getTodayRecord(state);
    var profileFields = document.querySelectorAll("[data-profile-field]");
    for (var h = 0; h < profileFields.length; h += 1) {
      var profileField = profileFields[h].getAttribute("data-profile-field");
      var profileValue = state.profile[profileField];
      profileFields[h].value = profileValue === null ? "" : String(profileValue);
    }

    var genderButtons = document.querySelectorAll("[data-gender]");
    for (var g = 0; g < genderButtons.length; g += 1) {
      var gender = genderButtons[g].getAttribute("data-gender");
      genderButtons[g].style.background = state.profile.gender === gender ? "#eff6ff" : "#ffffff";
      genderButtons[g].style.color = state.profile.gender === gender ? "#1d4ed8" : "#334155";
    }

    var fieldEls = document.querySelectorAll("[data-record-field]");
    for (var i = 0; i < fieldEls.length; i += 1) {
      var field = fieldEls[i].getAttribute("data-record-field");
      var value = record[field];
      if (fieldEls[i].tagName === "TEXTAREA") fieldEls[i].value = value || "";
      else fieldEls[i].value = value === null ? "" : String(value);
    }

    var moodButtons = document.querySelectorAll("[data-mood]");
    for (var j = 0; j < moodButtons.length; j += 1) {
      var mood = moodButtons[j].getAttribute("data-mood");
      moodButtons[j].style.background = record.mood === mood ? "#eff6ff" : "#ffffff";
      moodButtons[j].style.color = record.mood === mood ? "#1d4ed8" : "#334155";
    }

    var exerciseButtons = document.querySelectorAll("[data-exercise]");
    for (var k = 0; k < exerciseButtons.length; k += 1) {
      var exercise = exerciseButtons[k].getAttribute("data-exercise");
      exerciseButtons[k].style.background = record.exercise === exercise ? "#ecfdf5" : "#ffffff";
      exerciseButtons[k].style.color = record.exercise === exercise ? "#15803d" : "#334155";
    }

    var violations = document.querySelectorAll("[data-violation]");
    for (var m = 0; m < violations.length; m += 1) {
      var violation = violations[m].getAttribute("data-violation");
      violations[m].checked = !!record.violations[violation];
    }

    var planFields = document.querySelectorAll("[data-plan-field]");
    for (var n = 0; n < planFields.length; n += 1) {
      var planField = planFields[n].getAttribute("data-plan-field");
      planFields[n].value = state.plan[planField];
    }
  }

  function renderFeedback() {
    var result = feedback(getTodayRecord(state), state.records);
    var fields = ["rating", "tomorrowFocus", "warning", "reminder"];
    for (var i = 0; i < fields.length; i += 1) {
      var el = document.querySelector('[data-feedback="' + fields[i] + '"]');
      if (el) el.textContent = result[fields[i]];
    }
  }

  function renderAll() {
    normalizeState(state);
    syncHeader();
    renderMetrics();
    renderTasks();
    renderForms();
    renderFeedback();
    setSectionVisibility();
    saveState(state);
  }

  function syncHeader() {
    var title = document.querySelector("header h1");
    var subtitle = document.querySelector("header p:last-child");
    if (!title || !subtitle) return;

    if (state.profile && state.profile.completed) {
      title.textContent = "每天打开 30 秒，也算在变瘦";
      subtitle.textContent =
        "Day " + dayIndex(state.plan.startDate, todayString()) + " / " + state.plan.days + " · 关闭后数据仍保存在本机";
      return;
    }

    title.textContent = "开始你的 90 天";
    subtitle.textContent = "先填基础资料和目标，后面每天就能直接打卡。";
  }

  function bind() {
    document.addEventListener("click", function (event) {
      var submit = event.target.closest("[data-onboarding-submit]");
      if (submit) {
        if (
          state.profile.nickname.trim() &&
          state.profile.age !== null &&
          state.profile.heightCm !== null &&
          state.plan.startDate &&
          state.plan.startWeight &&
          state.plan.targetWeight
        ) {
          state.profile.completed = true;
          currentTab = "home";
        }
        renderAll();
        return;
      }

      var nav = event.target.closest("[data-nav]");
      if (nav) {
        currentTab = nav.getAttribute("data-nav");
        renderAll();
        return;
      }

      var taskButton = event.target.closest("[data-task]");
      if (taskButton) {
        var task = taskButton.getAttribute("data-task");
        var record = getTodayRecord(state);
        record.tasks[task] = !record.tasks[task];
        renderAll();
        return;
      }

      var moodButton = event.target.closest("[data-mood]");
      if (moodButton) {
        getTodayRecord(state).mood = moodButton.getAttribute("data-mood");
        renderAll();
        return;
      }

      var exerciseButton = event.target.closest("[data-exercise]");
      if (exerciseButton) {
        getTodayRecord(state).exercise = exerciseButton.getAttribute("data-exercise");
        renderAll();
        return;
      }

      var genderButton = event.target.closest("[data-gender]");
      if (genderButton) {
        state.profile.gender = genderButton.getAttribute("data-gender");
        renderAll();
      }
    }, true);

    document.addEventListener("change", function (event) {
      var target = event.target;
      var profileField = target.getAttribute("data-profile-field");
      if (profileField) {
        if (profileField === "nickname") state.profile.nickname = target.value;
        else state.profile[profileField] = target.value === "" ? null : Number(target.value);
        renderAll();
        return;
      }

      var recordField = target.getAttribute("data-record-field");
      if (recordField) {
        var record = getTodayRecord(state);
        if (recordField === "note") record.note = target.value;
        else record[recordField] = target.value === "" ? null : Number(target.value);
        renderAll();
        return;
      }

      var violation = target.getAttribute("data-violation");
      if (violation) {
        getTodayRecord(state).violations[violation] = !!target.checked;
        renderAll();
        return;
      }

      var planField = target.getAttribute("data-plan-field");
      if (planField) {
        state.plan[planField] = target.type === "date" || target.type === "time" ? target.value : Number(target.value);
        renderAll();
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bind();
      syncHeader();
      renderAll();
    });
  } else {
    bind();
    syncHeader();
    renderAll();
  }
})();
