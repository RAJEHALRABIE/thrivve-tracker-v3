
// تخزين محلي
const STORAGE_KEY = "thrivve-tracker-v4.2-state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // تجاهل
  }
}

// حالة افتراضية
function defaultState() {
  const now = new Date();
  const monday = getMondayOfWeek(now);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  return {
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
    settings: {
      minHours: 25,
      minTripsBase: 35,
      peakPercentRequired: 70,
      bonusPerTrip: 3,
      acceptRate: 93,
      cancelRate: 0
    },
    trips: [],
    activeTripStart: null
  };
}

let state = loadState() || defaultState();

// عناصر DOM
const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".bottom-nav .nav-item");

const headerAcceptRate = document.getElementById("header-accept-rate");
const headerCancelRate = document.getElementById("header-cancel-rate");
const currentWeekRange = document.getElementById("current-week-range");
const newWeekBtn = document.getElementById("new-week-btn");

const heroBonusAmount = document.getElementById("hero-bonus-amount");
const heroTripCount = document.getElementById("hero-trip-count");
const heroWorkHours = document.getElementById("hero-work-hours");
const heroTotalIncome = document.getElementById("hero-total-income");
const heroIncomeBoost = document.getElementById("hero-income-boost");
const heroIndicatorDot = document.getElementById("hero-indicator-dot");
const heroIndicatorText = document.getElementById("hero-indicator-text");

const metricTotalHours = document.getElementById("metric-total-hours");
const metricMinHours = document.getElementById("metric-min-hours");
const metricTotalTrips = document.getElementById("metric-total-trips");
const metricRequiredTrips = document.getElementById("metric-required-trips");
const metricPeakPercent = document.getElementById("metric-peak-percent");
const metricPeakRequired = document.getElementById("metric-peak-required");
const metricAcceptOfficial = document.getElementById("metric-accept-official");
const metricCancelOfficial = document.getElementById("metric-cancel-official");
const barHours = document.getElementById("bar-hours");
const barTrips = document.getElementById("bar-trips");
const barPeak = document.getElementById("bar-peak");
const barQuality = document.getElementById("bar-quality");
const statusPill = document.getElementById("status-pill");
const statusText = document.getElementById("status-text");
const qualityAlert = document.getElementById("quality-alert");
const qualityAlertText = document.getElementById("quality-alert-text");

const quickStatusCore = document.getElementById("quick-status-core");
const quickStatusPeak = document.getElementById("quick-status-peak");
const quickStatusQuality = document.getElementById("quick-status-quality");

const startTripBtn = document.getElementById("start-trip-btn");
const endTripBtn = document.getElementById("end-trip-btn");
const activeTripChip = document.getElementById("active-trip-chip");
const statusInfoBtn = document.getElementById("status-info-btn");

const tripsEmptyState = document.getElementById("trips-empty-state");
const tripsTableWrapper = document.getElementById("trips-table-wrapper");
const tripsTableBody = document.getElementById("trips-table-body");

const walletCashTotal = document.getElementById("wallet-cash-total");
const walletOnlineTotal = document.getElementById("wallet-online-total");
const walletTotalGross = document.getElementById("wallet-total-gross");

const inputMinHours = document.getElementById("input-min-hours");
const inputMinTrips = document.getElementById("input-min-trips");
const inputPeakPercent = document.getElementById("input-peak-percent");
const inputBonusPerTrip = document.getElementById("input-bonus-per-trip");
const inputAcceptRate = document.getElementById("input-accept-rate");
const inputCancelRate = document.getElementById("input-cancel-rate");
const settingsForm = document.getElementById("settings-form");

const previewTripCount = document.getElementById("preview-trip-count");
const previewWorkHours = document.getElementById("preview-work-hours");
const previewIncome = document.getElementById("preview-income");
const previewBonus = document.getElementById("preview-bonus");
const openReportBtn = document.getElementById("open-report-btn");

const exportStateBtn = document.getElementById("export-state-btn");
const importStateBtn = document.getElementById("import-state-btn");
const stateJsonArea = document.getElementById("state-json-area");

// المودال العام
const modalBackdrop = document.getElementById("modal-backdrop");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalActionsInfo = document.getElementById("modal-actions-info");
const modalActionsConfirm = document.getElementById("modal-actions-confirm");
const modalConfirmYes = document.getElementById("modal-confirm-yes");
const modalConfirmNo = document.getElementById("modal-confirm-no");

// Bottom sheet إنهاء الرحلة
const sheetBackdrop = document.getElementById("end-trip-sheet-backdrop");
const sheetTripInfo = document.getElementById("sheet-trip-info");
const sheetCloseBtn = document.getElementById("sheet-close-btn");
const payTypeButtons = document.querySelectorAll(".pay-type-btn");
const sheetFareInput = document.getElementById("sheet-fare-input");
const sheetCashGroup = document.getElementById("sheet-cash-group");
const sheetCashInput = document.getElementById("sheet-cash-input");
const sheetKeypad = document.getElementById("sheet-keypad");
const sheetSaveBtn = document.getElementById("sheet-save-btn");
const sheetCancelBtn = document.getElementById("sheet-cancel-btn");

// الأصوات (Web Audio API)
let audioCtx = null;
function ensureAudioContext() {
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

function playTone(type = "tap") {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  let freq = 440;
  let duration = 0.08;
  let volume = 0.08;

  if (type === "success") {
    freq = 760;
    duration = 0.14;
    volume = 0.1;
  } else if (type === "error") {
    freq = 220;
    duration = 0.2;
    volume = 0.14;
  }

  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// مواعيد الذروة (ثابتة – ميلادي فقط، لا حساب هجري)
function isPeakTime(date) {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday,...
  const h = date.getHours();
  // Sun-Wed (0,1,2,3): 06:00 - 19:00
  if (day >= 0 && day <= 3) {
    return h >= 6 && h < 19;
  }
  // Thu (4): 06:00 - 01:00 (ليوم الجمعة)
  if (day === 4) {
    return h >= 6 || h < 1;
  }
  // Fri & Sat (5,6): 18:00 - 01:00
  if (day === 5 || day === 6) {
    return h >= 18 || h < 1;
  }
  return false;
}

// التاريخ: بداية الأسبوع (الاثنين) ونهايته (الأحد)
function getMondayOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDateRangeISO(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts = { day: "2-digit", month: "2-digit", year: "numeric" };
  const startStr = start.toLocaleDateString("en-GB", opts);
  const endStr = end.toLocaleDateString("en-GB", opts);
  return `${startStr} - ${endStr}`;
}

function formatDateTimeShort(date) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
  const timeStr = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  return `${dateStr} • ${timeStr}`;
}

function formatTimeForTable(date) {
  const d = new Date(date);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function fmtNumber(num, digits = 2) {
  return Number(num || 0).toFixed(digits);
}

// حسابات أساسية
function computeTotals() {
  const trips = state.trips || [];
  let totalMinutes = 0;
  let totalFare = 0;
  let peakMinutes = 0;
  let peakTripsCount = 0;
  let cashTotal = 0;
  let onlineTotal = 0;

  for (const t of trips) {
    const dur = t.durationMinutes || 0;
    totalMinutes += dur;
    const fare = Number(t.fare || 0);
    totalFare += fare;

    if (t.isPeak) {
      peakMinutes += dur;
      peakTripsCount += 1;
    }

    const cash = Number(t.cashCollected || 0);
    cashTotal += cash;

    if (fare > cash) {
      onlineTotal += fare - cash;
    }
  }

  const totalHours = totalMinutes / 60;
  const tripCount = trips.length;
  const peakPercent = totalMinutes > 0 ? (peakMinutes / totalMinutes) * 100 : 0;
  const peakTripsPercent = tripCount > 0 ? (peakTripsCount / tripCount) * 100 : 0;

  return {
    totalMinutes,
    totalHours,
    totalFare,
    tripCount,
    peakMinutes,
    peakPercent,
    peakTripsCount,
    peakTripsPercent,
    cashTotal,
    onlineTotal
  };
}

function computeRequiredTrips() {
  const s = state.settings;
  const { totalHours } = computeTotals();
  const base = Number(s.minTripsBase || 0);
  const baseHours = Number(s.minHours || 0);
  if (totalHours <= baseHours) return base;

  const extraHours = totalHours - baseHours;
  const extraTrips = extraHours * 1.5;
  return base + Math.ceil(extraTrips);
}

function checkConditions() {
  const {
    totalHours,
    tripCount,
    peakPercent
  } = computeTotals();
  const s = state.settings;

  const requiredTrips = computeRequiredTrips();
  const hoursOk = totalHours >= Number(s.minHours || 0);
  const tripsOk = tripCount >= requiredTrips;
  const peakOk = peakPercent >= Number(s.peakPercentRequired || 0);
  const acceptOk = Number(s.acceptRate || 0) >= 65;
  const cancelOk = Number(s.cancelRate || 0) <= 10;

  return {
    hoursOk,
    tripsOk,
    peakOk,
    acceptOk,
    cancelOk,
    requiredTrips
  };
}

// عرض الحالة
function updateUI() {
  // رأس الصفحة
  currentWeekRange.textContent = `أسبوع الحافز: ${formatDateRangeISO(
    state.weekStart,
    state.weekEnd
  )}`;
  headerAcceptRate.textContent = `${fmtNumber(state.settings.acceptRate || 0, 0)}%`;
  headerCancelRate.textContent = `${fmtNumber(state.settings.cancelRate || 0, 1)}%`;

  // إعدادات في النموذج
  inputMinHours.value = state.settings.minHours;
  inputMinTrips.value = state.settings.minTripsBase;
  inputPeakPercent.value = state.settings.peakPercentRequired;
  inputBonusPerTrip.value = state.settings.bonusPerTrip;
  inputAcceptRate.value = state.settings.acceptRate;
  inputCancelRate.value = state.settings.cancelRate;

  // ملخص الأرقام
  const totals = computeTotals();
  const cond = checkConditions();

  const totalHours = totals.totalHours;
  const totalTrips = totals.tripCount;
  const totalFare = totals.totalFare;
  const bonusPerTrip = Number(state.settings.bonusPerTrip || 0);
  const expectedBonus = totalTrips * bonusPerTrip;
  const incomeBoostPercent = totalFare > 0 ? (expectedBonus / totalFare) * 100 : 0;

  heroTripCount.textContent = totalTrips;
  heroWorkHours.textContent = fmtNumber(totalHours, 2);
  heroTotalIncome.textContent = fmtNumber(totalFare, 2);
  heroBonusAmount.textContent = fmtNumber(expectedBonus, 2);
  heroIncomeBoost.textContent = fmtNumber(incomeBoostPercent, 1);

  // مؤشر الحافز
  const allCoreOk = cond.hoursOk && cond.tripsOk && cond.peakOk && cond.acceptOk && cond.cancelOk;
  if (allCoreOk) {
    heroIndicatorDot.classList.remove("indicator-off");
    heroIndicatorDot.classList.add("indicator-on");
    heroIndicatorText.textContent = "مبروك، يبدو أنك حققت جميع الشروط.";
  } else {
    heroIndicatorDot.classList.remove("indicator-on");
    heroIndicatorDot.classList.add("indicator-off");
    heroIndicatorText.textContent = "لم تتحقق جميع الشروط بعد.";
  }

  // الميتريكس
  metricTotalHours.textContent = fmtNumber(totalHours, 2);
  metricMinHours.textContent = state.settings.minHours;
  metricTotalTrips.textContent = totalTrips;
  metricRequiredTrips.textContent = cond.requiredTrips;
  metricPeakPercent.textContent = fmtNumber(totals.peakPercent, 1);
  metricPeakRequired.textContent = state.settings.peakPercentRequired;
  metricAcceptOfficial.textContent = fmtNumber(state.settings.acceptRate || 0, 0);
  metricCancelOfficial.textContent = fmtNumber(state.settings.cancelRate || 0, 1);

  // الأشرطة
  const hoursRatio =
    state.settings.minHours > 0 ? Math.min(1, totalHours / state.settings.minHours) : 0;
  barHours.style.width = `${hoursRatio * 100}%`;

  const tripsRatio =
    cond.requiredTrips > 0 ? Math.min(1, totalTrips / cond.requiredTrips) : 0;
  barTrips.style.width = `${tripsRatio * 100}%`;

  const peakRatio =
    state.settings.peakPercentRequired > 0
      ? Math.min(1, totals.peakPercent / state.settings.peakPercentRequired)
      : 0;
  barPeak.style.width = `${peakRatio * 100}%`;

  let qualityRatio = 1;
  if (state.settings.acceptRate < 65) {
    qualityRatio = state.settings.acceptRate / 65;
  } else if (state.settings.cancelRate > 10) {
    const over = state.settings.cancelRate - 10;
    qualityRatio = Math.max(0, 1 - over / 10);
  }
  barQuality.style.width = `${Math.max(0, Math.min(1, qualityRatio)) * 100}%`;

  // حالة النص العامة
  if (allCoreOk) {
    statusPill.classList.remove("status-danger");
    statusPill.classList.add("status-ok");
    statusText.textContent =
      "جميع شروط ثرايف (الساعات، الرحلات، الذروة، القبول، الإلغاء) محققة وفق البيانات المدخلة.";
  } else {
    statusPill.classList.remove("status-ok");
    statusPill.classList.add("status-danger");

    const missing = [];
    if (!cond.hoursOk) missing.push("ساعات العمل أقل من الحد المطلوب");
    if (!cond.tripsOk) missing.push("عدد الرحلات أقل من المطلوب (حسب الشرط التصاعدي)");
    if (!cond.peakOk) missing.push("نسبة وقت الذروة أقل من الحد المطلوب");
    if (!cond.acceptOk) missing.push("نسبة القبول أقل من 65%");
    if (!cond.cancelOk) missing.push("نسبة الإلغاء أعلى من 10%");

    statusText.textContent = missing.join(" • ");
  }

  // تنبيه الجودة
  const qualityMsgs = [];
  if (!cond.acceptOk) {
    qualityMsgs.push(
      `نسبة القبول الحالية (${fmtNumber(
        state.settings.acceptRate || 0,
        0
      )}%) أقل من 65% المطلوبة. حاول قبول قدر أكبر من الطلبات المناسبة.`
    );
  }
  if (!cond.cancelOk) {
    qualityMsgs.push(
      `نسبة الإلغاء الحالية (${fmtNumber(
        state.settings.cancelRate || 0,
        1
      )}%) أعلى من 10%. حاول تجنّب إلغاء الرحلات بعد قبولها.`
    );
  }
  if (qualityMsgs.length) {
    qualityAlert.classList.remove("hidden");
    qualityAlertText.textContent = qualityMsgs.join(" ");
  } else {
    qualityAlert.classList.add("hidden");
  }

  // القائمة السريعة
  function setQuick(el, ok, warn = false) {
    el.classList.remove("ok", "warn", "bad");
    if (ok) {
      el.classList.add("ok");
      el.textContent = "ممتاز";
    } else if (warn) {
      el.classList.add("warn");
      el.textContent = "بحاجة انتباه";
    } else {
      el.classList.add("bad");
      el.textContent = "غير متحقق";
    }
  }

  setQuick(quickStatusCore, cond.hoursOk && cond.tripsOk, cond.hoursOk || cond.tripsOk);
  setQuick(quickStatusPeak, cond.peakOk, totals.peakPercent > 0);
  setQuick(
    quickStatusQuality,
    cond.acceptOk && cond.cancelOk,
    cond.acceptOk || cond.cancelOk
  );

  // حالة الأزرار الخاصة بالرحلة النشطة
  if (state.activeTripStart) {
    startTripBtn.classList.add("disabled");
    startTripBtn.disabled = true;
    endTripBtn.classList.remove("disabled");
    endTripBtn.disabled = false;
    activeTripChip.classList.remove("hidden");
  } else {
    startTripBtn.classList.remove("disabled");
    startTripBtn.disabled = false;
    endTripBtn.classList.add("disabled");
    endTripBtn.disabled = true;
    activeTripChip.classList.add("hidden");
  }

  // جدول الرحلات
  if (!state.trips.length) {
    tripsEmptyState.classList.remove("hidden");
    tripsTableWrapper.classList.add("hidden");
  } else {
    tripsEmptyState.classList.add("hidden");
    tripsTableWrapper.classList.remove("hidden");
    tripsTableBody.innerHTML = "";
    state.trips.forEach((t, idx) => {
      const tr = document.createElement("tr");
      const payLabel =
        t.paymentType === "cash"
          ? "كاش"
          : t.paymentType === "card"
          ? "بطاقة"
          : t.paymentType === "mixed"
          ? "مختلط"
          : "-";
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${formatTimeForTable(t.start)}</td>
        <td>${formatTimeForTable(t.end)}</td>
        <td>${fmtNumber(t.durationMinutes / 60, 2)}</td>
        <td>${fmtNumber(t.fare, 2)}</td>
        <td>${payLabel}</td>
      `;
      tripsTableBody.appendChild(tr);
    });
  }

  // المحفظة
  walletCashTotal.textContent = fmtNumber(totals.cashTotal, 2);
  walletOnlineTotal.textContent = fmtNumber(totals.onlineTotal, 2);
  walletTotalGross.textContent = fmtNumber(totals.totalFare, 2);

  // التقرير السريع
  previewTripCount.textContent = totals.tripCount;
  previewWorkHours.textContent = fmtNumber(totals.totalHours, 2);
  previewIncome.textContent = fmtNumber(totals.totalFare, 2);
  previewBonus.textContent = fmtNumber(expectedBonus, 2);
}

// تنقل بين الشاشات
navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    screens.forEach((s) => s.classList.remove("active"));
    document.getElementById(targetId).classList.add("active");

    navItems.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    playTone("tap");
  });
});

// المودال: عرض معلومات فقط
function openInfoModal(title, message, icon = "ℹ️") {
  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalActionsInfo.classList.remove("hidden");
  modalActionsConfirm.classList.add("hidden");
  modalBackdrop.classList.remove("hidden");
  playTone("tap");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
}

// المودال: تأكيد
let confirmCallback = null;

function openConfirmModal(title, message, icon = "⚠️", onConfirm) {
  confirmCallback = onConfirm;
  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalActionsInfo.classList.add("hidden");
  modalActionsConfirm.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
  playTone("error");
}

modalCloseBtn.addEventListener("click", () => {
  closeModal();
});

modalConfirmNo.addEventListener("click", () => {
  confirmCallback = null;
  closeModal();
});

modalConfirmYes.addEventListener("click", () => {
  const cb = confirmCallback;
  confirmCallback = null;
  closeModal();
  if (typeof cb === "function") {
    cb();
  }
  playTone("success");
});

// زر "حالة الحافز الحالية"
statusInfoBtn.addEventListener("click", () => {
  const totals = computeTotals();
  const cond = checkConditions();

  let msg = "";
  msg += `• ساعات العمل التقريبية من مدة الرحلات: ${fmtNumber(
    totals.totalHours,
    2
  )} ساعة.\n`;
  msg += `• عدد الرحلات المسجلة: ${totals.tripCount}.\n`;
  msg += `• عدد الرحلات المطلوبة وفق الشرط التصاعدي: ${cond.requiredTrips}.\n`;
  msg += `• نسبة وقت الذروة (حسب مدة الرحلات): ${fmtNumber(
    totals.peakPercent,
    1
  )}%.\n`;
  msg += `• نسبة قبول مدخلة: ${fmtNumber(state.settings.acceptRate || 0, 0)}%.\n`;
  msg += `• نسبة إلغاء مدخلة: ${fmtNumber(state.settings.cancelRate || 0, 1)}%.\n\n`;

  const allCoreOk = cond.hoursOk && cond.tripsOk && cond.peakOk && cond.acceptOk && cond.cancelOk;
  msg += allCoreOk
    ? "✅ وفق هذه الأرقام، أنت مستوفٍ لجميع الشروط لو افترضنا أن بيانات ثرايف/أوبر مطابقة لمدخلاتك هنا."
    : "⚠️ هناك شروط غير مكتملة، راجع البطاقات في الداشبورد لمعرفة النقص.";

  openInfoModal("تفاصيل حالة الحافز الحالية", msg.replace(/\n/g, "\n"));
});


// تصدير/استيراد بيانات المتابع (لنقل البيانات بين نطاقين مختلفين)
if (exportStateBtn && stateJsonArea) {
  exportStateBtn.addEventListener("click", () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        openInfoModal("لا توجد بيانات", "لم يتم العثور على بيانات محفوظة في هذا المتصفح بعد.");
        return;
      }
      stateJsonArea.value = raw;
      stateJsonArea.focus();
      stateJsonArea.select?.();
      openInfoModal("تم تجهيز البيانات", "تم نسخ بيانات المتابع في المربع. انسخ النص بالكامل ثم الصقه في النسخة الجديدة من التطبيق ضمن خانة الاستيراد.");
    } catch (e) {
      openInfoModal("خطأ في التصدير", "حدث خطأ غير متوقع أثناء محاولة قراءة البيانات.", "⚠️");
    }
  });
}

if (importStateBtn && stateJsonArea) {
  importStateBtn.addEventListener("click", () => {
    try {
      const raw = stateJsonArea.value.trim();
      if (!raw) {
        openInfoModal("لا يوجد نص", "الرجاء لصق نص البيانات في المربع قبل الاستيراد.");
        return;
      }
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object" || !parsed.weekStart || !parsed.weekEnd) {
        openInfoModal("بيانات غير صالحة", "النص لا يبدو كبيانات تطبيق متابع الحافز. تأكد من نسخه بالكامل من النسخة القديمة.", "⚠️");
        return;
      }

      state = parsed;
      saveState(state);
      migratePeakFlagsOnce?.();
      updateUI();
      openInfoModal("تم الاستيراد بنجاح", "تم استيراد البيانات وتحديث الحالة. يمكنك الآن استخدام النسخة الجديدة من التطبيق مع نفس بياناتك.", "✅");
    } catch (e) {
      openInfoModal("تعذر قراءة البيانات", "حدث خطأ أثناء قراءة أو تحليل النص. تأكد من لصق النص بالكامل كما هو.", "⚠️");
    }
  });
}

// زر أسبوع جديد
newWeekBtn.addEventListener("click", () => {
  openConfirmModal(
    "بدء أسبوع حافز جديد",
    "سيتم مسح جميع الرحلات الحالية والبدء من جديد مع الاحتفاظ بنفس إعدادات الشروط. هل أنت متأكد؟",
    "⚠️",
    () => {
      const now = new Date();
      const monday = getMondayOfWeek(now);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      state.weekStart = monday.toISOString();
      state.weekEnd = sunday.toISOString();
      state.trips = [];
      state.activeTripStart = null;
      saveState(state);
      updateUI();
      playTone("success");
    }
  );
});

// نموذج الإعدادات
settingsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const minHours = Number(inputMinHours.value || 0);
  const minTrips = Number(inputMinTrips.value || 0);
  const peakPercent = Number(inputPeakPercent.value || 0);
  const bonusPerTrip = Number(inputBonusPerTrip.value || 0);
  const acceptRate = Number(inputAcceptRate.value || 0);
  const cancelRate = Number(inputCancelRate.value || 0);

  state.settings.minHours = minHours;
  state.settings.minTripsBase = minTrips;
  state.settings.peakPercentRequired = peakPercent;
  state.settings.bonusPerTrip = bonusPerTrip;
  state.settings.acceptRate = acceptRate;
  state.settings.cancelRate = cancelRate;

  saveState(state);
  updateUI();
  openInfoModal("تم حفظ الإعدادات", "تم تحديث شروط الحافز بناءً على القيم التي أدخلتها.", "✅");
  playTone("success");
});

// الرحلة النشطة
startTripBtn.addEventListener("click", () => {
  if (state.activeTripStart) return;
  state.activeTripStart = new Date().toISOString();
  saveState(state);
  updateUI();
  playTone("tap");
});

endTripBtn.addEventListener("click", () => {
  if (!state.activeTripStart) return;
  openEndTripSheet();
});

// Bottom Sheet منطق
let currentPayType = "cash";
let activeInputField = "fare"; // fare | cash

function openEndTripSheet() {
  const start = new Date(state.activeTripStart);
  sheetTripInfo.textContent = `بداية الرحلة: ${formatDateTimeShort(start)}`;
  sheetFareInput.value = "";
  sheetCashInput.value = "";
  setPayType("cash");
  setActiveInput("fare");
  sheetBackdrop.classList.remove("hidden");
  playTone("tap");
}

function closeEndTripSheet() {
  sheetBackdrop.classList.add("hidden");
}

function setPayType(type) {
  currentPayType = type;
  payTypeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.payType === type);
  });

  if (type === "card") {
    sheetCashGroup.style.display = "none";
  } else {
    sheetCashGroup.style.display = "flex";
  }

  // اختيار الحقل الافتراضي
  if (type === "mixed") {
    setActiveInput("cash");
  } else {
    setActiveInput("fare");
  }
}

function setActiveInput(field) {
  activeInputField = field;
  sheetFareInput.classList.toggle("active", field === "fare");
  sheetCashInput.classList.toggle("active", field === "cash");
}

payTypeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setPayType(btn.dataset.payType);
    playTone("tap");
  });
});

sheetFareInput.addEventListener("click", () => {
  if (currentPayType !== "card" && currentPayType !== "cash" && currentPayType !== "mixed") return;
  setActiveInput("fare");
  playTone("tap");
});

sheetCashInput.addEventListener("click", () => {
  if (currentPayType === "card") return;
  setActiveInput("cash");
  playTone("tap");
});

sheetKeypad.addEventListener("click", (e) => {
  const key = e.target.getAttribute("data-key");
  if (!key) return;
  playTone("tap");
  let inputEl = activeInputField === "fare" ? sheetFareInput : sheetCashInput;
  let val = inputEl.value || "";

  if (key === "back") {
    inputEl.value = val.slice(0, -1);
    return;
  }
  if (key === ".") {
    if (val.includes(".")) return;
    if (!val) {
      inputEl.value = "0.";
    } else {
      inputEl.value = val + ".";
    }
    return;
  }
  // رقم
  if (val === "0") {
    inputEl.value = key;
  } else {
    inputEl.value = val + key;
  }
});

sheetCancelBtn.addEventListener("click", () => {
  closeEndTripSheet();
});

sheetCloseBtn.addEventListener("click", () => {
  closeEndTripSheet();
});

// حفظ الرحلة من Bottom Sheet
sheetSaveBtn.addEventListener("click", () => {
  if (!state.activeTripStart) return;

  const start = new Date(state.activeTripStart);
  const end = new Date();
  let durationMinutes = (end - start) / 1000 / 60;
  if (!isFinite(durationMinutes) || durationMinutes <= 0) {
    durationMinutes = 1;
  }

  let fareVal = parseFloat(sheetFareInput.value.replace(",", "."));
  let cashVal = parseFloat(sheetCashInput.value.replace(",", "."));

  if (isNaN(fareVal)) fareVal = 0;
  if (isNaN(cashVal)) cashVal = 0;

  if (currentPayType === "card") {
    if (fareVal <= 0) {
      openInfoModal(
        "بيانات غير كافية",
        "في حالة الدفع بالبطاقة فقط، يجب إدخال قيمة الرحلة الإجمالية.",
        "⚠️"
      );
      playTone("error");
      return;
    }
  } else if (currentPayType === "cash") {
    if (fareVal <= 0 && cashVal > 0) {
      fareVal = cashVal;
    }
    if (fareVal <= 0 && cashVal <= 0) {
      openInfoModal(
        "بيانات غير كافية",
        "أدخل على الأقل قيمة واحدة: قيمة الرحلة أو الكاش المستلم.",
        "⚠️"
      );
      playTone("error");
      return;
    }
  } else if (currentPayType === "mixed") {
    if (fareVal <= 0 && cashVal <= 0) {
      openInfoModal(
        "بيانات غير كافية",
        "في حالة الدفع المختلط، أدخل على الأقل قيمة الكاش المستلم أو قيمة الرحلة.",
        "⚠️"
      );
      playTone("error");
      return;
    }
    if (fareVal <= 0 && cashVal > 0) {
      fareVal = cashVal;
    }
  }

  const isPeak = isPeakTime(start);

  const trip = {
    id: Date.now(),
    start: start.toISOString(),
    end: end.toISOString(),
    durationMinutes,
    fare: fareVal,
    paymentType: currentPayType,
    cashCollected: currentPayType === "card" ? 0 : cashVal,
    isPeak
  };

  state.trips.push(trip);
  state.activeTripStart = null;
  saveState(state);
  closeEndTripSheet();
  updateUI();
  playTone("success");
});

// فتح صفحة التقرير
openReportBtn.addEventListener("click", () => {
  const data = {
    state,
    totals: computeTotals(),
    conditions: checkConditions()
  };
  const payload = encodeURIComponent(JSON.stringify(data));
  const url = `report.html#data=${payload}`;
  window.open(url, "_blank");
});

// بداية التشغيل
updateUI();
