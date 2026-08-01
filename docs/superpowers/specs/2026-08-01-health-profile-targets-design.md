# Health-Need Target Presets Design

**Date:** 2026-08-01
**Status:** Approved

## Goal

Let auto-calculated macro/water targets and the micronutrient RDA bars adapt to a chosen health need (diabetic-friendly, heart-healthy, low-sodium, high-protein) instead of one-size-fits-all "normal" recommendations.

## Data model

New field on the profile object: `healthProfile` (string, default `'normal'`). Stored in the existing `nt_profile` localStorage key — no new storage key, no schema migration needed since it's optional and defaults safely.

Selectable values: `normal | diabetic | heart_healthy | low_sodium | high_protein`. Single-select only (no combining).

## UI

Settings modal, directly below the Activity Level dropdown: a new "Health Profile" `<select>` with the five options, plus a fixed one-line disclaimer beneath it:

> "General guideline-based presets, not medical advice — consult your doctor for personalized targets."

The Auto-calculate button already receives the full profile object; no new wiring needed beyond passing `healthProfile` through.

## Preset rules (`src/lib/trends.js`)

`calculateTargets(profile)` branches on `profile.healthProfile` after computing TDEE (unchanged BMR/TDEE math for all profiles):

- **normal** (current behavior): protein 0.9g/lb, fat 25% of calories, carbs fill remainder, calorie adjustment from goal-weight delta unchanged.
- **diabetic**: carbs capped at 35% of calories, protein 1.0g/lb, fat fills remainder (never below 20% of calories, floored). Fiber RDA raised to 45g, sugar limit tightened to 25g (via `getMicronutrientTargets`).
- **heart_healthy**: protein 0.8g/lb, fat 25% of calories, carbs fill remainder (same shape as normal). Sodium target 1500mg, fiber RDA raised to 40g.
- **low_sodium**: macros identical to normal; only sodium target changes to 1500mg.
- **high_protein**: protein 1.2g/lb, fat 25% of calories, carbs fill remainder. Sodium/fiber/sugar stay at normal defaults.

All presets floor carbs/fat at 0g the same way the current implementation does (`Math.max(carbsG, 0)`).

## Micronutrient RDA bars

New `getMicronutrientTargets(healthProfile)` in `trends.js` returns the `MICRONUTRIENTS` array with `sodium`, `fiber`, and `sugar` entries overridden per the table below; every other nutrient (potassium, calcium, iron, magnesium, zinc, vitamins) is identical across all profiles.

| Profile | Sodium limit | Fiber goal | Sugar limit |
|---|---|---|---|
| normal | 2300mg | 38g | 50g |
| diabetic | 2300mg | 45g | 25g |
| heart_healthy | 1500mg | 40g | 50g |
| low_sodium | 1500mg | 38g | 50g |
| high_protein | 2300mg | 38g | 50g |

Consumers of the static `MICRONUTRIENTS` constant (Home micronutrient card in `dashboard.js`, `NutrientExplorerChart`) switch to calling `getMicronutrientTargets(profile?.healthProfile)` instead, passing the current profile down as a prop where not already available.

## Water

Unchanged — water goal keeps the existing half-bodyweight-in-ounces + activity-level bump formula regardless of health profile. These presets target macro composition and sodium/fiber/sugar, not hydration.

## Out of scope

- Combining multiple profiles simultaneously.
- Any additional health profiles beyond the four listed (e.g. renal, low-FODMAP) — can be added later by extending the preset table.
- Changing the BMR/TDEE formula itself.
