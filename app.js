
/* تخزين وإدارة الحالة */

const STORAGE_KEY = "thrivve-tracker-v4";

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0-6, 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day; // إلى الإثنين
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateRangeForWeek(start) {
  const startDate = new Date(start);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const opts = { day: "2-digit", month: "2-digit" };
  const fmt = new Intl.DateTimeFormat("ar-SA", opts);
  return `من ${fmt.format(startDate)} حتى ${fmt.format(endDate)} (حسب جهازك)`;
}

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createEmptyWeek(startDate) {
  return {
    weekStartISO: startDate.toISOString(),
    trips: [],
    settings: {
      minHours: 25,
      baseMinRides: 35,
      minPeakPercent: 70,
      bonusPerRide: 3,
      acceptRate: 93,
      cancelRate: 0,
      acceptThreshold: 65,
      cancelThreshold: 10
    },
    wallet: {
      cashInHand: 0,
      walletBalance: 0,
      cashOnlyTotal: 0,
      cardOnlyTotal: 0,
      mixedCashTotal: 0,
      mixedCardTotal: 0
    },
    ui: {
      lastActiveScreen: "home",
      hasShownWeekResetToast: false
    }
  };
}

/* حالة التطبيق في الذاكرة */
let state = null;
let currentTripStart = null;
let peakOverrideMode = "auto";

/* عناصر DOM */
const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".nav-item");
const weekRangeEl = document.getElementById("week-range");
const heroBonusAmountEl = document.getElementById("hero-bonus-amount");
const totalIncomeEl = document.getElementById("total-income");
const incomeIncreaseEl = document.getElementById("income-increase");
const totalRidesEl = document.getElementById("total-rides");
const totalHoursEl = document.getElementById("total-hours");
const hoursWorkedEl = document.getElementById("hours-worked");
const minHoursEl = document.getElementById("min-hours");
const ridesDoneEl = document.getElementById("rides-done");
const ridesRequiredEl = document.getElementById("rides-required");
const ridesEscalationEl = document.getElementById("rides-escalation");
const peakPercentEl = document.getElementById("peak-percent");
const minPeakEl = document.getElementById("min-peak");
const acceptRateEl = document.getElementById("accept-rate");
const cancelRateEl = document.getElementById("cancel-rate");
const rulesChecklistEl = document.getElementById("rules-checklist");
const cashInHandEl = document.getElementById("cash-in-hand");
const walletBalanceEl = document.getElementById("wallet-balance");
const walletHeroEl = document.getElementById("wallet-hero");

const cashOnlyTotalEl = document.getElementById("cash-only-total");
const cardOnlyTotalEl = document.getElementById("card-only-total");
const mixedCashTotalEl = document.getElementById("mixed-cash-total");
const mixedCardTotalEl = document.getElementById("mixed-card-total");

const ridesTbody = document.getElementById("rides-tbody");
const statusPill = document.getElementById("status-pill");
const statusLabel = document.getElementById("status-label");
const newWeekBtn = document.getElementById("new-week-btn");

const startTripBtn = document.getElementById("start-trip-btn");
const endTripBtn = document.getElementById("end-trip-btn");
const currentTripLabel = document.getElementById("current-trip-label");

const showReportBtn = document.getElementById("show-report-btn");
const exportJsonBtn = document.getElementById("export-json-btn");

const settingsForm = document.getElementById("settings-form");
const minHoursInput = document.getElementById("minHoursInput");
const baseRidesInput = document.getElementById("baseRidesInput");
const minPeakInput = document.getElementById("minPeakInput");
const bonusPerRideInput = document.getElementById("bonusPerRideInput");
const acceptRateInput = document.getElementById("acceptRateInput");
const cancelRateInput = document.getElementById("cancelRateInput");
const resetWeekBtn = document.getElementById("reset-week-btn");

const endTripModal = document.getElementById("end-trip-modal");
const fareInput = document.getElementById("fareInput");
const cashPartInput = document.getElementById("cashPartInput");
const payChips = document.querySelectorAll(".chip[data-pay]");
const peakChips = document.querySelectorAll(".chip[data-peak]");
const overridePeakCheckbox = document.getElementById("overridePeak");
const saveTripBtn = document.getElementById("save-trip-btn");
const cancelTripBtn = document.getElementById("cancel-trip-btn");

const reportScreen = document.querySelector('[data-screen="report"]');
const reportContentEl = document.getElementById("report-content");
const printReportBtn = document.getElementById("print-report-btn");

const toastEl = document.getElementById("toast");

const infoModal = document.getElementById("info-modal");
const infoModalTitle = document.getElementById("info-modal-title");
const infoModalText = document.getElementById("info-modal-text");
const infoCloseBtn = document.getElementById("info-close-btn");
const infoTriggers = document.querySelectorAll("[data-open-info]");

/* أدوات مساعدة */

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2600);
}

function changeScreen(target) {
  screens.forEach((s) => {
    s.classList.toggle("screen-active", s.dataset.screen === target);
  });
  navItems.forEach((btn) => {
    btn.classList.toggle("nav-active", btn.dataset.target === target);
  });
  state.ui.lastActiveScreen = target;
  saveState(state);
}

function formatTimeHM(date) {
  const d = new Date(date);
  const opts = { hour: "2-digit", minute: "2-digit", hour12: true };
  return new Intl.DateTimeFormat("ar-SA", opts).format(d);
}

function formatDateTimeShort(date) {
  const d = new Date(date);
  const opts = { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true };
  return new Intl.DateTimeFormat("ar-SA", opts).format(d);
}

function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function isWithinPeakAutomatic(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun
  const minutes = d.getHours() * 60 + d.getMinutes();

  function between(m, start, end) {
    if (end < start) {
      return m >= start || m < end;
    }
    return m >= start && m < end;
  }

  if (day >= 1 && day <= 3) {
    return between(minutes, 6 * 60, 19 * 60);
  }
  if (day === 4) {
    return between(minutes, 6 * 60, 25 * 60); // 1am next day
  }
  if (day === 5 || day === 6) {
    return between(minutes, 18 * 60, 25 * 60);
  }
  return false;
}

/* حساب الإحصائيات */

function computeStats() {
  const trips = state.trips || [];
  let totalIncome = 0;
  let totalSeconds = 0;
  let peakTrips = 0;

  // محفظة
  let cashOnlyTotal = 0;
  let cardOnlyTotal = 0;
  let mixedCashTotal = 0;
  let mixedCardTotal = 0;

  trips.forEach((t) => {
    totalIncome += t.amount || 0;
    totalSeconds += t.durationSeconds || 0;
    if (t.isPeak) peakTrips++;

    if (t.paymentType === "cash") {
      cashOnlyTotal += t.amount || 0;
    } else if (t.paymentType === "card") {
      cardOnlyTotal += t.amount || 0;
    } else if (t.paymentType === "mixed") {
      mixedCashTotal += t.cashPart || 0;
      mixedCardTotal += (t.amount || 0) - (t.cashPart || 0);
    }
  });

  const totalHours = totalSeconds / 3600;
  const totalRides = trips.length;
  const peakPercent = totalRides ? (peakTrips / totalRides) * 100 : 0;

  const settings = state.settings;
  const minHours = settings.minHours;
  const baseMinRides = settings.baseMinRides;
  const minPeakPercent = settings.minPeakPercent;

  const extraHours = Math.max(0, totalHours - 25);
  const escalatedRequired = Math.ceil(baseMinRides + extraHours * 1.5);
  const requiredRides = Math.max(baseMinRides, escalatedRequired);

  const estimatedBonus = totalRides >= requiredRides &&
    totalHours >= minHours &&
    peakPercent >= minPeakPercent &&
    settings.acceptRate >= settings.acceptThreshold &&
    settings.cancelRate <= settings.cancelThreshold
      ? totalRides * settings.bonusPerRide
      : totalRides * settings.bonusPerRide;

  // افتراض: الزيادة = (الحافز التقديري / الدخل الأساسي) * 100
  const incomeIncrease = totalIncome > 0 ? (estimatedBonus / totalIncome) * 100 : 0;

  // محفظة تقديرية
  const cashInHand = cashOnlyTotal + mixedCashTotal;
  const walletBalance = cardOnlyTotal + mixedCardTotal;

  state.wallet = {
    cashInHand: round2(cashInHand),
    walletBalance: round2(walletBalance),
    cashOnlyTotal: round2(cashOnlyTotal),
    cardOnlyTotal: round2(cardOnlyTotal),
    mixedCashTotal: round2(mixedCashTotal),
    mixedCardTotal: round2(mixedCardTotal)
  };

  return {
    totalIncome: round2(totalIncome),
    totalHours,
    totalRides,
    peakPercent,
    requiredRides,
    minHours,
    baseMinRides,
    extraHours,
    minPeakPercent,
    estimatedBonus: round2(estimatedBonus),
    incomeIncrease: round2(incomeIncrease)
  };
}

function updateDashboard() {
  const weekStart = new Date(state.weekStartISO);
  weekRangeEl.textContent = formatDateRangeForWeek(weekStart);

  const stats = computeStats();
  const trips = state.trips || [];
  const settings = state.settings;

  heroBonusAmountEl.textContent = `${stats.estimatedBonus.toFixed(2)} ر.س`;
  totalIncomeEl.textContent = stats.totalIncome.toFixed(2);
  totalRidesEl.textContent = stats.totalRides.toString();
  totalHoursEl.textContent = stats.totalHours.toFixed(2);
  hoursWorkedEl.textContent = stats.totalHours.toFixed(2);
  minHoursEl.textContent = stats.minHours.toString();
  ridesDoneEl.textContent = stats.totalRides.toString();
  ridesRequiredEl.textContent = stats.requiredRides.toString();
  peakPercentEl.textContent = stats.peakPercent.toFixed(1);
  minPeakEl.textContent = stats.minPeakPercent.toString();
  incomeIncreaseEl.textContent = stats.incomeIncrease.toFixed(1);

  acceptRateEl.textContent = settings.acceptRate.toString();
  cancelRateEl.textContent = settings.cancelRate.toString();

  cashInHandEl.textContent = state.wallet.cashInHand.toFixed(2);
  walletBalanceEl.textContent = state.wallet.walletBalance.toFixed(2);

  walletHeroEl.textContent = (state.wallet.cashInHand + state.wallet.walletBalance).toFixed(2) + " ر.س";

  cashOnlyTotalEl.textContent = state.wallet.cashOnlyTotal.toFixed(2);
  cardOnlyTotalEl.textContent = state.wallet.cardOnlyTotal.toFixed(2);
  mixedCashTotalEl.textContent = state.wallet.mixedCashTotal.toFixed(2);
  mixedCardTotalEl.textContent = state.wallet.mixedCardTotal.toFixed(2);

  if (stats.extraHours > 0) {
    ridesEscalationEl.textContent =
      `عملت تقريبًا ${stats.totalHours.toFixed(1)} ساعة، لذلك زادت الرحلات المطلوبة تصاعديًا إلى ${stats.requiredRides} رحلة تقريبًا.`;
  } else {
    ridesEscalationEl.textContent =
      "حتى ٢٥ ساعة، يكفي تحقيق عدد الرحلات الأساسي. بعد ذلك يزيد المطلوب تقريبًا ١٫٥ رحلة لكل ساعة إضافية.";
  }

  const conditions = [
    {
      ok: stats.totalHours >= stats.minHours,
      text: `الحد الأدنى للساعات: مطلوب ${stats.minHours} ساعة – محقق حاليًا ${stats.totalHours.toFixed(2)} ساعة.`
    },
    {
      ok: stats.totalRides >= stats.requiredRides,
      text: `الرحلات: مطلوب تقريبًا ${stats.requiredRides} رحلة – محقق حاليًا ${stats.totalRides}.`
    },
    {
      ok: stats.peakPercent >= stats.minPeakPercent,
      text: `نسبة رحلات الذروة: مطلوب ${stats.minPeakPercent}% – محقق حاليًا ${stats.peakPercent.toFixed(1)}%.`
    },
    {
      ok: settings.acceptRate >= settings.acceptThreshold,
      text: `نسبة القبول: مطلوب ≥ ${settings.acceptThreshold}% – حاليًا ${settings.acceptRate}%.`
    },
    {
      ok: settings.cancelRate <= settings.cancelThreshold,
      text: `نسبة الإلغاء: مطلوب ≤ ${settings.cancelThreshold}% – حاليًا ${settings.cancelRate}%.`
    }
  ];

  rulesChecklistEl.innerHTML = "";
  let allOk = true;
  let anyOk = false;
  conditions.forEach((c) => {
    const li = document.createElement("li");
    li.classList.add(c.ok ? "ok" : "fail");
    const icon = document.createElement("span");
    icon.classList.add("check-icon");
    icon.textContent = c.ok ? "✓" : "×";
    const text = document.createElement("span");
    text.textContent = c.text;
    li.appendChild(icon);
    li.appendChild(text);
    rulesChecklistEl.appendChild(li);
    if (!c.ok) allOk = false;
    if (c.ok) anyOk = true;
  });

  if (allOk && trips.length > 0) {
    statusPill.className = "status-pill status-ok";
    statusLabel.textContent = "بحسب بياناتك، يبدو أن جميع الشروط متحققة ✅ (تأكيد الشركة هو الحكم النهائي).";
  } else if (anyOk && trips.length > 0) {
    statusPill.className = "status-pill status-pending";
    statusLabel.textContent = "بعض الشروط تحققت، وما زال بإمكانك تحسين البقية.";
  } else {
    statusPill.className = "status-pill status-fail";
    statusLabel.textContent = "لم تتحقق الشروط حتى الآن، ابدأ بتسجيل رحلاتك أولاً.";
  }

  // جدول الرحلات
  ridesTbody.innerHTML = "";
  const sorted = [...trips].sort((a, b) => new Date(b.start) - new Date(a.start));
  sorted.forEach((t, idx) => {
    const tr = document.createElement("tr");
    const cells = [
      (sorted.length - idx).toString(),
      formatDateTimeShort(t.start),
      formatDateTimeShort(t.end),
      (t.durationSeconds / 60).toFixed(1),
      (t.amount || 0).toFixed(2),
      t.isPeak ? "✓" : "—",
      t.paymentType === "cash" ? "كاش" : t.paymentType === "card" ? "بطاقة" : "مختلط"
    ];
    cells.forEach((c) => {
      const td = document.createElement("td");
      td.textContent = c;
      tr.appendChild(td);
    });
    ridesTbody.appendChild(tr);
  });

  // تحديث نموذج الإعدادات
  minHoursInput.value = settings.minHours;
  baseRidesInput.value = settings.baseMinRides;
  minPeakInput.value = settings.minPeakPercent;
  bonusPerRideInput.value = settings.bonusPerRide;
  acceptRateInput.value = settings.acceptRate;
  cancelRateInput.value = settings.cancelRate;

  buildReport();
  saveState(state);
}

/* تقرير */

function buildReport() {
  const stats = computeStats();
  const trips = state.trips || [];
  const settings = state.settings;
  const weekStart = new Date(state.weekStartISO);

  const rangeText = formatDateRangeForWeek(weekStart);

  const lines = [];

  lines.push(`<div><strong>الأسبوع الحالي:</strong> ${rangeText}</div>`);
  lines.push(`<div class="report-section-title">ملخص عام</div>`);
  lines.push(`<ul class="report-list">
    <li>إجمالي الرحلات: ${stats.totalRides}</li>
    <li>إجمالي ساعات العمل (من مدة الرحلات): ${stats.totalHours.toFixed(2)} ساعة</li>
    <li>إجمالي الدخل الأساسي من الرحلات: ${stats.totalIncome.toFixed(2)} ر.س</li>
    <li>إجمالي الحافز (تقديري إذا تحققت الشروط): ${stats.estimatedBonus.toFixed(2)} ر.س</li>
    <li>نسبة الزيادة الفعلية على الدخل (تقديريًا): ${stats.incomeIncrease.toFixed(1)}%</li>
  </ul>`);

  lines.push(`<div class="report-section-title">الشروط الرسمية للحافز (حسب إدخالك)</div>`);
  lines.push(`<ul class="report-list">
    <li>الحد الأدنى للساعات: ${stats.minHours} ساعة</li>
    <li>الحد الأدنى لعدد الرحلات (أساسي): ${stats.baseMinRides} رحلة</li>
    <li>الحد الأدنى لنسبة رحلات الذروة: ${stats.minPeakPercent}%</li>
    <li>نسبة القبول المطلوبة: ≥ ${settings.acceptThreshold}% (حاليًا: ${settings.acceptRate}%)</li>
    <li>نسبة الإلغاء القصوى: ≤ ${settings.cancelThreshold}% (حاليًا: ${settings.cancelRate}%)</li>
  </ul>`);

  lines.push(`<div class="report-section-title">قرار الحافز (تقديري حسب بياناتك)</div>`);
  const conditionsMet =
    stats.totalHours >= stats.minHours &&
    stats.totalRides >= stats.requiredRides &&
    stats.peakPercent >= stats.minPeakPercent &&
    settings.acceptRate >= settings.acceptThreshold &&
    settings.cancelRate <= settings.cancelThreshold &&
    stats.totalRides > 0;

  if (conditionsMet) {
    lines.push(
      `<p>✅ بناءً على بياناتك المسجلة، يبدو أنك حققت جميع الشروط لهذا الأسبوع. القرار النهائي يعود للشركة وفق سياساتها، استخدم هذا التقرير كمرجع شخصي فقط.</p>`
    );
  } else {
    lines.push(
      `<p>✖ لم تتحقق جميع الشروط بعد وفق بياناتك. استخدم هذا التقرير لمعرفة أين تحتاج إلى تحسين قبل نهاية الأسبوع.</p>`
    );
  }

  if (trips.length > 0) {
    lines.push(`<div class="report-section-title">تفاصيل الرحلات</div>`);
    lines.push("<ul class='report-list'>");
    const sorted = [...trips].sort((a, b) => new Date(a.start) - new Date(b.start));
    sorted.forEach((t, idx) => {
      lines.push(
        `<li>#${idx + 1} – من ${formatDateTimeShort(t.start)} إلى ${formatDateTimeShort(
          t.end
        )} – مدة ${(t.durationSeconds / 60).toFixed(1)} د – قيمة ${(t.amount || 0).toFixed(
          2
        )} ر.س – دفع: ${
          t.paymentType === "cash" ? "كاش" : t.paymentType === "card" ? "بطاقة" : "مختلط"
        } – ذروة: ${t.isPeak ? "نعم" : "لا"}</li>`
      );
    });
    lines.push("</ul>");
  }

  reportContentEl.innerHTML = lines.join("");
}

/* تشغيل/إيقاف رحلة */

function startTrip() {
  if (currentTripStart) return;
  currentTripStart = new Date();
  startTripBtn.disabled = true;
  startTripBtn.classList.add("ghost-btn");
  startTripBtn.classList.remove("primary-btn");
  endTripBtn.disabled = false;
  currentTripLabel.textContent = `رحلة جارية منذ ${formatTimeHM(currentTripStart)} (تذكير: لا تنس إنهاءها بعد انتهاء الرحلة).`;
  showToast("تم بدء الرحلة. عند الانتهاء اضغط على زر إنهاء الرحلة.");
}

function openEndTripModal() {
  if (!currentTripStart) {
    showToast("لا توجد رحلة فعّالة حاليًا.");
    return;
  }
  endTripModal.classList.remove("hidden");
  fareInput.value = "";
  cashPartInput.value = "";
  selectPayChip("cash");
  selectPeakChip("auto");
  overridePeakCheckbox.checked = false;

  // تركيز على حقل القيمة لفتح لوحة الأرقام
  setTimeout(() => {
    fareInput.focus();
  }, 50);
}

function closeEndTripModal() {
  endTripModal.classList.add("hidden");
}

function selectPayChip(type) {
  payChips.forEach((c) => {
    c.classList.toggle("chip-selected", c.dataset.pay === type);
  });
}

function getSelectedPayType() {
  let type = "cash";
  payChips.forEach((c) => {
    if (c.classList.contains("chip-selected")) type = c.dataset.pay;
  });
  return type;
}

function selectPeakChip(mode) {
  peakOverrideMode = mode;
  peakChips.forEach((c) => {
    c.classList.toggle("chip-selected", c.dataset.peak === mode);
  });
}

function saveTripFromModal() {
  if (!currentTripStart) {
    showToast("لا توجد رحلة جارية.");
    closeEndTripModal();
    return;
  }
  const end = new Date();
  const durationSeconds = Math.max(60, Math.floor((end - currentTripStart) / 1000));

  const amount = parseFloat(fareInput.value || "0") || 0;
  const cashPart = parseFloat(cashPartInput.value || "0") || 0;
  const paymentType = getSelectedPayType();

  if (amount <= 0 && paymentType !== "cash") {
    showToast("يفضل إدخال قيمة الرحلة الإجمالية لأجل دقة الحساب.");
  }

  let isPeak = isWithinPeakAutomatic(currentTripStart);
  if (overridePeakCheckbox.checked) {
    if (peakOverrideMode === "force-peak") isPeak = true;
    if (peakOverrideMode === "force-off") isPeak = false;
  }

  const trip = {
    id: Date.now(),
    start: currentTripStart.toISOString(),
    end: end.toISOString(),
    durationSeconds,
    amount,
    paymentType,
    cashPart: paymentType === "mixed" ? cashPart : paymentType === "cash" ? amount : 0,
    isPeak
  };

  state.trips.push(trip);
  currentTripStart = null;
  startTripBtn.disabled = false;
  startTripBtn.classList.remove("ghost-btn");
  startTripBtn.classList.add("primary-btn");
  endTripBtn.disabled = true;
  currentTripLabel.textContent = "";

  closeEndTripModal();
  updateDashboard();
  showToast("تم حفظ الرحلة بنجاح.");
}

/* JSON تصدير */

function exportWeekJSON() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "thrivve-week.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* تهيئة */

function initState() {
  const today = new Date();
  const monday = getMonday(today);

  const loaded = loadState();
  if (!loaded) {
    state = createEmptyWeek(monday);
    saveState(state);
    return;
  }

  const savedWeekStart = new Date(loaded.weekStartISO);
  const mondayISO = monday.toISOString().slice(0, 10);
  const savedISO = savedWeekStart.toISOString().slice(0, 10);

  if (mondayISO !== savedISO) {
    // أسبوع جديد
    state = createEmptyWeek(monday);
    state.ui.hasShownWeekResetToast = true;
    showToast("تم بدء أسبوع جديد تلقائيًا حسب تاريخ جهازك.");
    saveState(state);
  } else {
    state = loaded;
  }
}

/* إعداد الأحداث */

function setupListeners() {
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      changeScreen(target);
    });
  });

  newWeekBtn.addEventListener("click", () => {
    const monday = getMonday(new Date());
    state = createEmptyWeek(monday);
    saveState(state);
    updateDashboard();
    showToast("بدأت أسبوع حافز جديد. تم تصفير بيانات الرحلات.");
  });

  startTripBtn.addEventListener("click", startTrip);
  endTripBtn.addEventListener("click", openEndTripModal);
  cancelTripBtn.addEventListener("click", () => {
    closeEndTripModal();
  });
  saveTripBtn.addEventListener("click", saveTripFromModal);

  payChips.forEach((chip) => {
    chip.addEventListener("click", () => selectPayChip(chip.dataset.pay));
  });

  peakChips.forEach((chip) => {
    chip.addEventListener("click", () => selectPeakChip(chip.dataset.peak));
  });

  showReportBtn.addEventListener("click", () => {
    changeScreen("report");
  });

  exportJsonBtn.addEventListener("click", exportWeekJSON);

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const s = state.settings;
    s.minHours = parseFloat(minHoursInput.value || "0") || 0;
    s.baseMinRides = parseInt(baseRidesInput.value || "0", 10) || 0;
    s.minPeakPercent = parseFloat(minPeakInput.value || "0") || 0;
    s.bonusPerRide = parseFloat(bonusPerRideInput.value || "0") || 0;
    s.acceptRate = parseFloat(acceptRateInput.value || "0") || 0;
    s.cancelRate = parseFloat(cancelRateInput.value || "0") || 0;
    saveState(state);
    updateDashboard();
    showToast("تم حفظ الإعدادات وتحديث الحسابات.");
  });

  resetWeekBtn.addEventListener("click", () => {
    if (!confirm("سيتم حذف جميع رحلات هذا الأسبوع نهائيًا وبدء أسبوع جديد. هل أنت متأكد؟")) return;
    const monday = getMonday(new Date());
    state = createEmptyWeek(monday);
    saveState(state);
    updateDashboard();
    showToast("تم تصفير بيانات هذا الأسبوع.");
  });

  printReportBtn.addEventListener("click", () => {
    window.print();
  });

  infoTriggers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.openInfo;
      if (key === "bonus-info") {
        infoModalTitle.textContent = "طريقة حساب الحافز";
        infoModalText.textContent =
          "الحافز التقديري يعتمد على عدد الرحلات المسجلة وقيمة الحافز لكل رحلة كما أدخلتها في الإعدادات. القرار النهائي دائمًا يكون من الشركة حسب بياناتها الداخلية.";
      }
      infoModal.classList.remove("hidden");
    });
  });

  infoCloseBtn.addEventListener("click", () => {
    infoModal.classList.add("hidden");
  });
  infoModal.addEventListener("click", (e) => {
    if (e.target === infoModal) infoModal.classList.add("hidden");
  });
}

/* تسجيل Service Worker من أجل التثبيت كتطبيق */

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(() => {
        // تجاهل الأخطاء
      });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initState();
  setupListeners();
  updateDashboard();
  changeScreen(state.ui.lastActiveScreen || "home");
  registerServiceWorker();
});
