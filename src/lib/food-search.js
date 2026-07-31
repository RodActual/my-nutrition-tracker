import { storage } from '@/lib/storage';

// Unified food search: History (instant) + USDA + OpenFoodFacts.
// Returns flat items: { name, calories, protein, carbs, fat, fiber, sodium,
// sugar, ...micros, source: 'History' | 'USDA' | 'Global' }.
export async function searchFoods(term, { signal } = {}) {
  const q = term.trim();
  if (q.length < 2) return [];

  const history = storage.searchProducts(q).map(p => ({ ...p, fat: p.fats ?? p.fat ?? 0 }));

  if (q.length < 3) return history;

  const usdaPromise = fetch(`/api/food-search?q=${encodeURIComponent(q)}`, { signal })
    .then(r => (r.ok ? r.json() : { foods: [] }))
    .then(d => d.foods ?? [])
    .catch(() => []);

  const offPromise = fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,brands,nutriments`,
    { signal }
  )
    .then(r => (r.ok ? r.json() : { products: [] }))
    .then(data => (data.products ?? [])
      .filter(p => p.product_name && p.nutriments)
      .map(p => {
        const n = p.nutriments;
        const pick = (stub) => Number(n[`${stub}_serving`] ?? n[`${stub}_100g`] ?? 0) || 0;
        return {
          name: p.brands ? `${p.product_name} (${p.brands.split(',')[0]})` : p.product_name,
          calories: Math.round(pick('energy-kcal')),
          protein: pick('proteins'),
          carbs: pick('carbohydrates'),
          fat: pick('fat'),
          fiber: pick('fiber'),
          sodium: pick('sodium') * 1000,
          sugar: pick('sugars'),
          potassium: pick('potassium') * 1000,
          calcium: pick('calcium') * 1000,
          iron: pick('iron') * 1000,
          magnesium: pick('magnesium') * 1000,
          zinc: pick('zinc') * 1000,
          vitA: pick('vitamin-a') * 1e6,
          vitC: pick('vitamin-c') * 1000,
          vitD: pick('vitamin-d') * 1e6,
          vitB12: pick('vitamin-b12') * 1e6,
          source: 'Global',
        };
      })
      .filter(p => p.calories > 0))
    .catch(() => []);

  const [usda, off] = await Promise.all([usdaPromise, offPromise]);

  const seen = new Set(history.map(h => (h.name || '').toLowerCase()));
  const merged = [...usda, ...off].filter(o => {
    const key = (o.name || '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...history, ...merged].slice(0, 10);
}

// Keys summed when combining ingredients into a recipe
export const NUTRIENT_KEYS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar',
  'potassium', 'calcium', 'iron', 'magnesium', 'zinc', 'vitA', 'vitC', 'vitD', 'vitB12',
];

export function sumNutrients(items) {
  const out = {};
  for (const k of NUTRIENT_KEYS) {
    out[k] = items.reduce((s, i) => s + (Number(i.fats && k === 'fat' ? i.fats : i[k]) || 0), 0);
  }
  return out;
}
