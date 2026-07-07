# Trends & Rich Graphs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rich graph suite (weight + prediction, energy balance, macros, activity, water) as the app's focal point, with weekly weigh-in reminders.

**Architecture:** All chart data derives client-side from localStorage via a new `src/lib/insights.js` calc library. The existing Insights tab in `dashboard.js` becomes the Trends surface; a compact weight chart becomes the Home-tab hero. Recharts renders everything.

**Tech Stack:** Next.js 16, React 19, Recharts, Tailwind v4, lucide-react.

**Verification:** No test framework in repo — each task verifies with `npm run build` (must pass with zero errors).

**Data facts (do not deviate):** food logs store `fats` (plural); Apple Health active-calorie entries are logs with `source: 'AppleHealth'` and negative `calories`; weights in `nt_weights` as `{weight, date}`; water `{amount, date}`; steps `nt_steps` object keyed by date. Dates are `YYYY-MM-DD` strings.

---

### Task 1: insights.js calc library + settings-modal reuse + fats export fix

**Files:**
- Create: `src/lib/insights.js`
- Modify: `src/components/settings-modal.js` (remove local math, import from insights)
- Modify: `src/lib/storage.js` (pushDayToServer: `l.fats || l.fat`)

- [ ] **Step 1: Create `src/lib/insights.js`**

```js
import { storage } from '@/lib/storage';

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

// Mifflin-St Jeor (male constant), weight lbs / height inches
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

export function toDateStr(d) { return d.toISOString().split('T')[0]; }

export function lastNDates(n) {
  const out = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d); dd.setDate(d.getDate() - i);
    out.push(toDateStr(dd));
  }
  return out;
}

// Per-day intake/active/balance for dates that have food logs.
// intake = sum of non-AppleHealth log calories; active = -(sum of AppleHealth calories)
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
      balance: hasFood && tdee != null ? intake - tdee - active : null,
      protein: food.reduce((s, l) => s + (l.protein || 0), 0),
      carbs: food.reduce((s, l) => s + (l.carbs || 0), 0),
      fats: food.reduce((s, l) => s + (l.fats || l.fat || 0), 0),
    };
  });
}

// Projection from latest weigh-in using mean balance of last 14 logged days.
// Returns { slopePerDay, points: [{date, predicted}], goalDate } or null if guards fail.
export function getProjection({ profile, daysOut = 60 }) {
  const tdee = calcTDEE(profile ?? {});
  const weighIns = storage.getWeightLogs();
  if (tdee == null || weighIns.length < 1) return null;
  const balances = getDailyBalances(lastNDates(30), tdee)
    .filter(b => b.hasFood && b.balance != null)
    .slice(-14);
  if (balances.length < 3) return null;
  const meanBalance = balances.reduce((s, b) => s + b.balance, 0) / balances.length;
  const slopePerDay = meanBalance / 3500; // lbs/day
  const last = weighIns[weighIns.length - 1];
  const goal = Number(profile.goalWeight) || null;
  const points = [];
  let goalDate = null;
  const start = new Date(last.date + 'T12:00:00');
  for (let i = 0; i <= daysOut; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
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
    return { ...p, ma: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null };
  });
}
```

- [ ] **Step 2: settings-modal.js — delete local `ACTIVITY_MULTIPLIERS` and `calculateTargets`, add `import { calculateTargets } from '@/lib/insights';`. The auto-calc button call becomes `calculateTargets({ age, weight, height, goalWeight, activityLevel })` (same shape — unchanged).**

- [ ] **Step 3: storage.js — in `pushDayToServer` change the fat reducer line to:**

```js
const fat = logs.reduce((s, l) => s + (l.fats || l.fat || 0), 0);
```

- [ ] **Step 4: Run `npm run build` — expect success.**
- [ ] **Step 5: Commit: `git commit -m "feat: insights calc library, shared TDEE math, fix fats export"`**

---

### Task 2: TimeRangeSelector + chart components

**Files:**
- Create: `src/components/time-range-selector.js`
- Create: `src/components/charts/weight-trend-chart.js`
- Create: `src/components/charts/energy-balance-chart.js`
- Create: `src/components/charts/macro-trend-chart.js`
- Create: `src/components/charts/activity-chart.js`
- Create: `src/components/charts/water-chart.js`

All charts: dark card `bg-zinc-900 rounded-3xl border border-zinc-800 p-5`, axis tick fill `#a1a1aa` size 11, grid `#3f3f46` dash `3 3`, tooltip like existing WeightChart. Empty state: centered `text-zinc-500 text-sm py-8` message.

- [ ] **Step 1: `time-range-selector.js`**

```js
'use client';
const RANGES = [
  { id: 7, label: '7D' }, { id: 30, label: '30D' }, { id: 90, label: '90D' }, { id: 0, label: 'All' },
];
export default function TimeRangeSelector({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
      {RANGES.map(r => (
        <button key={r.id} onClick={() => onChange(r.id)}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${value === r.id ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'}`}>
          {r.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `charts/weight-trend-chart.js`** — props `{ days, compact }`. Build data: weigh-ins in range (`days === 0` → all), each `{date, label, weight}`, apply `movingAverage(points,'weight')`; append projection points from `getProjection` (key `predicted`, weight null). ComposedChart: `Line weight` emerald solid w/ dots, `Line ma` zinc-500 thin, `Line predicted` emerald `strokeDasharray="5 5"` no dots, `ReferenceLine y=goalWeight` amber dashed when set. Compact: height 180, hide stat row, no grid. Full: height 260 + stat row above (current weight, Δ over range with sign, and `goalDate` → "On pace: {goal} lbs by {date}" / slope 0 or null → "Log more days to unlock predictions"). Empty → "No weight data yet".

- [ ] **Step 3: `charts/energy-balance-chart.js`** — props `{ days, profile }`. `tdee = calcTDEE(profile)`; if null render "Set up your profile to enable predictions" card. Data = `getDailyBalances(lastNDates(days || 90), tdee)` filtered `hasFood`. BarChart of `balance` with `<Cell>` fill: negative `#10b981`, positive `#f87171`; `ReferenceLine y=0` zinc. Stat above: `Avg {±N} kcal/day {deficit|surplus}`. Empty → "No logged days in range".

- [ ] **Step 4: `charts/macro-trend-chart.js`** — props `{ days, targets }`. Data from `getDailyBalances` (protein/carbs/fats), filtered `hasFood`. Stacked BarChart: protein `#10b981`, carbs `#60a5fa`, fats `#f59e0b`, radius on top bar. Legend row with per-range averages: `P avg Ng · C avg Ng · F avg Ng` colored. Empty → "No food logged in range".

- [ ] **Step 5: `charts/activity-chart.js`** — props `{ days }`. Data: for `lastNDates(days || 90)` → `{date, label, steps: storage.getSteps(date) ?? 0, active}` (active from `getDailyBalances`). Drop leading/trailing all-zero days (`filter(d => d.steps || d.active)`). ComposedChart dual axis: Bar steps `#3b82f6` opacity 0.7 (left), Line active `#10b981` (right). Empty → "No activity synced yet".

- [ ] **Step 6: `charts/water-chart.js`** — props `{ days, waterGoal }`. Data: water logs summed per date over range. BarChart `#38bdf8`, `ReferenceLine y=waterGoal` dashed when set. Empty → "No water logged in range".

- [ ] **Step 7: `npm run build` — success. Commit: `git commit -m "feat: trends chart components"`**

---

### Task 3: Dashboard integration + delete old WeightChart

**Files:**
- Modify: `src/components/dashboard.js`
- Delete: `src/components/weight-chart.js`

- [ ] **Step 1: dashboard.js changes**
  - Replace `import WeightChart from './weight-chart'` with imports of the five chart components + TimeRangeSelector.
  - Add state: `const [trendRange, setTrendRange] = useState(30);`
  - Home tab: insert compact hero **above** `<DailyProgress>`: `<button onClick={() => setCurrentTab('insights')} className="w-full text-left"><WeightTrendChart days={30} compact /></button>`
  - Insights tab content becomes:

```jsx
<div className="space-y-4 animate-in fade-in duration-300">
  <TimeRangeSelector value={trendRange} onChange={setTrendRange} />
  <WeightTrendChart days={trendRange} profile={userData?.profile} />
  <EnergyBalanceChart days={trendRange} profile={userData?.profile} />
  <MacroTrendChart days={trendRange} targets={userData?.targets} />
  <ActivityChart days={trendRange} />
  <WaterChart days={trendRange} waterGoal={userData?.profile?.waterGoalOz} />
  <WeeklyInsights dailyCalorieTarget={userData?.targets?.calories || 2000} />
</div>
```

  - Header title for insights tab: rename to `'Trends'`.
- [ ] **Step 2: Delete `src/components/weight-chart.js`; grep to confirm no remaining imports.**
- [ ] **Step 3: `npm run build` — success. Commit: `git commit -m "feat: trends tab with full chart suite + dashboard hero"`**

---

### Task 4: Weekly weigh-in banner

**Files:**
- Rewrite: `src/components/weight-reminder-banner.js`
- Modify: `src/components/dashboard.js` (props)

- [ ] **Step 1: Rewrite banner** — show when latest weight log ≥7 days old or none. Inline `<input type="number" step="0.1">` + Save (calls `storage.addWeightLog({weight, date: today})`, hides, calls `onSaved?.()`). Dismiss X stores today in localStorage `nt_weigh_reminder_dismissed`; hidden while dismissed date === today. Amber style as current.
- [ ] **Step 2: dashboard.js — render as `<WeightReminderBanner onSaved={loadData} />` (drop old props).**
- [ ] **Step 3: `npm run build` — success. Commit: `git commit -m "feat: weekly weigh-in reminder with inline entry"`**
