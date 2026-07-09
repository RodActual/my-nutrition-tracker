# Competitor-Inspired Features Design

**Date:** 2026-07-09
**Status:** Approved in conversation (user: "Go ahead with your recommended order")

Implementation order:

1. **Frequent foods** — `getFrequentFoods(mealHour)` in `src/lib/trends.js` ranks non-AppleHealth logs by name frequency, preferring items usually logged in the current meal window (Breakfast <10h, Lunch <14h, Dinner <18h, else Snacks). New `src/components/frequent-foods.js` card on the Log tab above Quick Add: top 6, one tap logs the item with its usual macros.
2. **Copy meal / copy day** — `LogList` gains an optional `onCopyMeal(logs)` copy button per meal group, shown only when viewing a past day; copies those entries to today. On today's empty state, a "Copy yesterday" button duplicates yesterday's food logs.
3. **Streak & adherence card** — `getStreakStats()` in trends.js: consecutive-days-logged streak (ending today or yesterday) + last-7-days adherence (days within calorie target ±10% or under, and protein ≥ target). New `src/components/streak-card.js` on Home under DailyProgress.
4. **Trend-weight headline** — WeightTrendChart stat row leads with smoothed trend weight (last 7-day MA) and week-over-week trend delta; raw scale weight becomes secondary.
5. **Adaptive TDEE** — `getAdaptiveTDEE()` in trends.js: pick earliest and latest weigh-ins within the last 28 days spanning ≥14 days with ≥10 logged food days between; observed TDEE = meanIntake − meanActive − (ΔW × 3500 / spanDays). Falls back to formula TDEE when data is insufficient. Used by `getProjection` and EnergyBalanceChart (which labels which TDEE source is in use).

All data derived from localStorage; no new storage keys or API routes. Verification: `npm run build` per feature.
