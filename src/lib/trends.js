import { storage } from '@/lib/storage';

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Mifflin-St Jeor (male constant), weight in lbs / height in inches
export function calcBMR({ age, weight, height }) {
  const w = Number(weight), h = Number(height), a = Number(age);
  if (!w || !h || !a) return null;
  return 10 * (w * 0.453592) + 6.25 * (h * 2.54) - 5 * a + 5;
}

export function calcTDEE(profile) {
  const bmr = calcBMR(profile ?? {});
  if (bmr == null) return null;
  return bmr * (ACTIVITY_MULTIPLIERS[profile.activityLevel] ?? 1.55);
}

export function calculateTargets(profile) {
  const tdee = calcTDEE(profile);
  if (tdee == null) return null;
  const w = Number(profile.weight);
  const gw = Number(profile.goalWeight) || w;
  const diff = gw - w;
  const adjustment = diff < 0 ? Math.max(diff * 11, -750) : Math.min(diff * 11, 500);
  const goalCalories = Math.round(tdee + adjustment);
  const proteinG = Math.round(w * 0.9);
  const fatG = Math.round((goalCalories * 0.25) / 9);
  const carbsG = Math.round((goalCalories - proteinG * 4 - fatG * 9) / 4);
  return { calories: goalCalories, protein: proteinG, carbs: Math.max(carbsG, 0), fat: fatG };
}

export function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

export function lastNDates(n) {
  const out = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d);
    dd.setDate(d.getDate() - i);
    out.push(toDateStr(dd));
  }
  return out;
}

export function formatShortDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Per-day intake/active/balance/macros.
// intake = non-AppleHealth log calories; active = -(AppleHealth calories, stored negative)
export function getDailyBalances(dates, tdee) {
  const all = storage.getLogs();
  const byDate = {};
  for (const l of all) {
    if (!l.date) continue;
    (byDate[l.date] ??= []).push(l);
  }
  return dates.map(date => {
    const logs = byDate[date] ?? [];
    const food = logs.filter(l => l.source !== 'AppleHealth');
    const intake = food.reduce((s, l) => s + (l.calories || 0), 0);
    const active = -logs.filter(l => l.source === 'AppleHealth')
      .reduce((s, l) => s + (l.calories || 0), 0);
    const hasFood = food.length > 0;
    return {
      date, intake, active, hasFood,
      balance: hasFood && tdee != null ? Math.round(intake - tdee - active) : null,
      protein: food.reduce((s, l) => s + (l.protein || 0), 0),
      carbs: food.reduce((s, l) => s + (l.carbs || 0), 0),
      fats: food.reduce((s, l) => s + (l.fats || l.fat || 0), 0),
    };
  });
}

export function getMealBucket(hour) {
  if (hour < 10) return 'Breakfast';
  if (hour < 14) return 'Lunch';
  if (hour < 18) return 'Dinner';
  return 'Snacks';
}

// Top foods by log count, preferring items usually eaten in the current meal window.
export function getFrequentFoods(limit = 6) {
  const nowBucket = getMealBucket(new Date().getHours());
  const counts = {};
  for (const l of storage.getLogs()) {
    if (l.source === 'AppleHealth' || !l.name || l.name === 'Unknown Item') continue;
    const key = l.name.toLowerCase().trim();
    if (!counts[key]) {
      counts[key] = { count: 0, bucketCount: 0, latest: l };
    }
    counts[key].count++;
    const hour = l.timestamp ? new Date(l.timestamp).getHours() : 12;
    if (getMealBucket(hour) === nowBucket) counts[key].bucketCount++;
    // keep the most recent entry as the macro template
    if ((l.timestamp || '') > (counts[key].latest.timestamp || '')) counts[key].latest = l;
  }
  return Object.values(counts)
    .filter(c => c.count >= 2)
    .sort((a, b) => (b.bucketCount - a.bucketCount) || (b.count - a.count))
    .slice(0, limit)
    .map(c => ({ ...c.latest, logCount: c.count }));
}

// Consecutive-days-logged streak + last-7-days target adherence.
export function getStreakStats(targets) {
  const logged = new Set(
    storage.getLogs().filter(l => l.source !== 'AppleHealth').map(l => l.date)
  );
  const today = toDateStr(new Date());

  let streak = 0;
  const cursor = new Date();
  // A streak survives an unlogged "today" (day isn't over yet)
  if (!logged.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (logged.has(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const week = getDailyBalances(lastNDates(7), null).filter(b => b.hasFood);
  const calTarget = Number(targets?.calories) || null;
  const proteinTarget = Number(targets?.protein) || null;
  const calorieHits = calTarget
    ? week.filter(b => b.intake <= calTarget * 1.1).length
    : null;
  const proteinHits = proteinTarget
    ? week.filter(b => b.protein >= proteinTarget).length
    : null;

  return { streak, daysLogged: week.length, calorieHits, proteinHits };
}

// Observed TDEE from real weight change + logged intake over the last ~28 days.
// Returns { tdee, spanDays, source: 'adaptive' } or null when data is insufficient.
export function getAdaptiveTDEE() {
  const weighIns = storage.getWeightLogs();
  const windowDates = new Set(lastNDates(28));
  const inWindow = weighIns.filter(w => windowDates.has(w.date));
  if (inWindow.length < 2) return null;
  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  const spanDays = Math.round(
    (new Date(last.date + 'T12:00:00') - new Date(first.date + 'T12:00:00')) / 86400000
  );
  if (spanDays < 14) return null;

  const spanDatesList = [];
  const d = new Date(first.date + 'T12:00:00');
  for (let i = 0; i <= spanDays; i++) {
    spanDatesList.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  const loggedDays = getDailyBalances(spanDatesList, null).filter(b => b.hasFood);
  if (loggedDays.length < 10) return null;

  const meanIntake = loggedDays.reduce((s, b) => s + b.intake, 0) / loggedDays.length;
  const meanActive = loggedDays.reduce((s, b) => s + b.active, 0) / loggedDays.length;
  const deltaW = last.weight - first.weight;
  const tdee = meanIntake - meanActive - (deltaW * 3500) / spanDays;
  if (!Number.isFinite(tdee) || tdee < 800 || tdee > 6000) return null;
  return { tdee: Math.round(tdee), spanDays, source: 'adaptive' };
}

// Best available TDEE: adaptive when the data supports it, else formula.
export function getBestTDEE(profile) {
  const adaptive = getAdaptiveTDEE();
  if (adaptive) return adaptive;
  const formula = calcTDEE(profile ?? {});
  return formula == null ? null : { tdee: Math.round(formula), source: 'formula' };
}

// Energy-balance projection from the latest weigh-in.
// Returns { slopePerDay, meanBalance, points: [{date, predicted}], goalDate } or null.
export function getProjection({ profile, daysOut = 60 }) {
  const best = getBestTDEE(profile);
  const tdee = best?.tdee ?? null;
  const weighIns = storage.getWeightLogs();
  if (tdee == null || weighIns.length < 1) return null;
  const balances = getDailyBalances(lastNDates(30), tdee)
    .filter(b => b.hasFood && b.balance != null)
    .slice(-14);
  if (balances.length < 3) return null;
  const meanBalance = balances.reduce((s, b) => s + b.balance, 0) / balances.length;
  const slopePerDay = meanBalance / 3500; // lbs per day
  const last = weighIns[weighIns.length - 1];
  const goal = Number(profile.goalWeight) || null;
  const points = [];
  let goalDate = null;
  const start = new Date(last.date + 'T12:00:00');
  for (let i = 0; i <= daysOut; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    let predicted = last.weight + slopePerDay * i;
    if (goal != null && ((slopePerDay < 0 && predicted <= goal) || (slopePerDay > 0 && predicted >= goal))) {
      predicted = goal;
      if (!goalDate) goalDate = toDateStr(d);
    }
    points.push({ date: toDateStr(d), predicted: Math.round(predicted * 10) / 10 });
  }
  return { slopePerDay, meanBalance: Math.round(meanBalance), points, goalDate };
}

export function movingAverage(points, key, window = 7) {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    const vals = slice.map(s => s[key]).filter(v => v != null);
    return {
      ...p,
      ma: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null,
    };
  });
}
