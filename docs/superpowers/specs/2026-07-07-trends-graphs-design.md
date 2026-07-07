# Trends & Rich Graphs Design

**Date:** 2026-07-07
**Status:** Approved

## Goal

Make graphs the focal point of the nutrition tracker: a dedicated Trends page with a full chart suite, a hero weight chart on the dashboard, an energy-balance-based weight prediction, and weekly weigh-in reminders.

## Tech

- Recharts (already installed, dark theme) for all charts.
- All data derived client-side from existing localStorage keys: `nt_weights`, `nt_logs`, `nt_water`, `nt_steps`, `nt_profile`, `nt_targets`. No new storage or API routes.
- Theme: zinc-950 background, zinc-900 cards, emerald-500 primary, red-400 for surplus/negative.

## Structure

### New files
- `src/app/trends/page.js` — Trends route (client component).
- `src/lib/insights.js` — shared calculation library (TDEE, daily balances, projection).
- `src/components/charts/weight-trend-chart.js` — weight + prediction chart (accepts a `compact` prop for the dashboard hero).
- `src/components/charts/energy-balance-chart.js`
- `src/components/charts/macro-trend-chart.js`
- `src/components/charts/activity-chart.js`
- `src/components/charts/water-chart.js`
- `src/components/time-range-selector.js` — 7D / 30D / 90D / All pill selector.

### Modified files
- `src/components/dashboard.js` — hero weight chart at top (compact WeightTrendChart, ~200px) linking to `/trends`.
- `src/components/weight-reminder-banner.js` — weekly cadence + inline entry.
- `src/components/settings-modal.js` — import TDEE/target math from `src/lib/insights.js` instead of local copy.
- `src/components/weight-chart.js` — superseded by WeightTrendChart; deleted.

## Trends page

Sticky header: title + TimeRangeSelector (7D / 30D / 90D / All). Selected range drives every chart. Charts top to bottom:

1. **Weight & Prediction** (hero) — emerald line + dots for weigh-ins, 7-day moving average, dotted projection 60 days forward, horizontal goal-weight reference line. Stat row: current weight, change over range, predicted goal date ("On pace: 175.0 lbs by Oct 12") or shortfall message.
2. **Energy Balance** — daily bars of `intake − (TDEE + activeCalories)`. Deficit (negative) bars emerald, surplus red. Stat: average daily deficit/surplus over range.
3. **Macros** — stacked bars (protein/carbs/fat grams per day) with target reference lines; legend shows per-range averages.
4. **Steps & Activity** — steps as bars, active calories as an overlaid line (dual axis).
5. **Water** — daily oz bars vs goal reference line.

## Prediction math (`src/lib/insights.js`)

- `calcBMR(profile)` / `calcTDEE(profile)` — Mifflin-St Jeor (male constant, lbs/inches converted to kg/cm) × activity multiplier. Single source of truth; SettingsModal reuses it.
- `dailyBalance(date)` = food calories logged − TDEE − active calories synced for that date. Days with **no food logs are excluded**, never treated as 0-calorie days. Apple Health "Active Calories Burned" entries (negative-calorie logs with `source: 'AppleHealth'`) are the active-calorie source and are excluded from intake.
- Projection slope = mean daily balance over the last 14 days that have food logs ÷ 3500 kcal/lb. Line starts at the most recent weigh-in and extends 60 days, floored at goal weight.
- Guards: requires ≥3 logged days and ≥1 weigh-in; otherwise charts render actual data with a "Log more days to unlock predictions" note.

## Weekly weigh-in reminder

- Banner shows when the latest weight log is ≥7 days old (or none exists).
- Inline number input (1-decimal) + Save button directly in the banner; saving calls `storage.addWeightLog` (which rounds to 1 decimal and pushes to the server for Apple Health export).
- Dismiss button hides it until the next calendar day (dismissal date kept in localStorage `nt_weigh_reminder_dismissed`).

## Error handling / empty states

- Every chart handles an empty range with a friendly empty-state message instead of rendering a broken chart.
- Missing profile/targets: energy balance and prediction show "Set up your profile to enable predictions"; other charts still render raw data.
- All date math uses local-time YYYY-MM-DD strings consistent with the rest of the app.

## Out of scope

- Push notifications (in-app banner only).
- Lab results/insights (dropped earlier).
- Server-side chart data.
