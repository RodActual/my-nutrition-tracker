export function getNutritionInsights(food) {
  const {
    protein = 0, carbs = 0, fats = 0, fiber = 0,
    sodium = 0, sugar = 0, potassium = 0,
    vitC = 0, vitD = 0, calcium = 0, iron = 0, magnesium = 0,
    calories = 0,
  } = food;

  const warnings = [];
  const positives = [];

  // ── Warnings ────────────────────────────────────────────────────────────────

  if (fats > 15 && fiber < 2)
    warnings.push({ type: 'warn', icon: '🫀', text: 'High fat with little fiber — may negatively affect cholesterol' });

  if (sugar > 12)
    warnings.push({ type: 'warn', icon: '🔥', text: 'High sugar — a common driver of chronic inflammation' });

  if (sodium > 700)
    warnings.push({ type: 'warn', icon: '🧂', text: 'Very high sodium — linked to inflammation and elevated blood pressure' });
  else if (sodium > 400)
    warnings.push({ type: 'warn', icon: '🧂', text: 'High sodium — may raise blood pressure over time' });

  if (carbs > 50 && fiber < 2)
    warnings.push({ type: 'warn', icon: '🌾', text: 'High refined carbs — may cause blood sugar spikes' });

  if (calories > 500 && protein < 5 && fiber < 2)
    warnings.push({ type: 'warn', icon: '⚡', text: 'Calorie-dense with minimal nutrients' });

  // ── Positives ────────────────────────────────────────────────────────────────

  if (protein > 25)
    positives.push({ type: 'good', icon: '💪', text: 'Excellent protein source — great for muscle repair' });
  else if (protein > 15)
    positives.push({ type: 'good', icon: '💪', text: 'Good source of protein' });

  if (fiber > 5)
    positives.push({ type: 'good', icon: '🌿', text: 'High in fiber — supports digestion and heart health' });
  else if (fiber > 3)
    positives.push({ type: 'good', icon: '🌿', text: 'Good fiber content — supports digestive health' });

  if (vitC > 30)
    positives.push({ type: 'good', icon: '🍊', text: 'Rich in Vitamin C — supports immune function' });

  if (potassium > 400)
    positives.push({ type: 'good', icon: '🫀', text: 'Good potassium source — supports heart health' });

  if (calcium > 200)
    positives.push({ type: 'good', icon: '🦴', text: 'Good source of calcium — supports bone density' });

  if (vitD > 100)
    positives.push({ type: 'good', icon: '☀️', text: 'Good Vitamin D source — supports bone and immune health' });

  if (iron > 2.5)
    positives.push({ type: 'good', icon: '🩸', text: 'Good iron source — supports energy and red blood cells' });

  if (magnesium > 50)
    positives.push({ type: 'good', icon: '✨', text: 'Good magnesium source — supports muscle and nerve function' });

  // Warnings first, then positives. Cap at 3.
  return [...warnings, ...positives].slice(0, 3);
}
