# Goal-Rate-Based Calorie Adjustment Design

**Date:** 2026-08-01
**Status:** Approved

## Goal

Replace the fixed, opaque calorie-adjustment formula with an explicit weekly-rate selector, so the user controls how aggressively they cut or bulk, with warnings past commonly-recommended safe rates.

## Data model

New profile field: `goalRateLbsPerWeek` (number). Only meaningful when `goalWeight !== weight`. Defaults: `1.0` when losing, `0.5` when gaining. Stored on the existing `nt_profile` key — no migration needed, missing field just falls back to the default for the detected direction.

## Mode detection (reactive, not stored separately)

Derived live from `weight` vs `goalWeight` as the user types in Settings:
- `goalWeight === weight` (or `goalWeight` empty) → **maintain**
- `goalWeight < weight` → **lose**
- `goalWeight > weight` → **gain**

## UI (`settings-modal.js`)

A new field appears directly below Goal Weight:

- **Maintain**: static text "Maintaining current weight" — no rate selector rendered, no warning.
- **Lose**: label "Target pace" + four pill buttons: **0.5 · 1.0 · 1.5 · 2.0 lbs/week**. Selecting >1.5 (i.e. 2.0) shows red warning text: *"Losing more than 1.5 lbs/week is an aggressive rate that risks muscle loss and isn't recommended without medical supervision."*
- **Gain**: same layout, pills **0.25 · 0.5 · 0.75 · 1.0 lbs/week**. Selecting >0.5 (i.e. 0.75 or 1.0) shows amber warning text: *"Gaining faster than 0.5 lbs/week typically adds more fat than muscle."*

Warnings are informational, never block Save or Auto-calculate.

## Calorie adjustment formula (`src/lib/trends.js`, `calculateTargets`)

Replaces the existing `diff < 0 ? Math.max(diff * 11, -750) : Math.min(diff * 11, 500)` formula entirely:

```js
function getCalorieAdjustment(profile) {
  const w = Number(profile.weight);
  const gw = Number(profile.goalWeight) || w;
  if (gw === w) return 0;
  const losing = gw < w;
  const rate = Number(profile.goalRateLbsPerWeek) || (losing ? 1.0 : 0.5);
  const dailyDelta = (rate * 3500) / 7;
  return losing ? -dailyDelta : dailyDelta;
}
```

`calculateTargets` calls this instead of the old inline diff-based adjustment; everything downstream (macro split by health profile, water, micronutrient targets) is unchanged since they all key off the resulting `goalCalories`.

## Backward compatibility

Existing profiles saved before this change lack `goalRateLbsPerWeek`. The formula's fallback (`1.0` loss / `0.5` gain) means the next Auto-calculate recomputes using the new formula with sensible defaults — calorie targets may shift slightly from what a returning user previously saved, but only when they explicitly hit Auto-calculate again, not silently on load.

## Out of scope

- No hard cap/block on rate selection — warnings only.
- No change to macro ratios, water, or micronutrient RDA logic (health-profile presets from the prior feature are untouched).
- No historical tracking of rate changes over time.
