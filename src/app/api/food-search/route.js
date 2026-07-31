import { NextResponse } from 'next/server';

// Proxy for USDA FoodData Central search — keeps the API key server-side.
// Returns foods flattened to the app's nutrient shape.

// FDC nutrient numbers → app keys (with units FDC reports them in)
const NUTRIENT_MAP = {
  1008: 'calories',   // kcal
  1003: 'protein',    // g
  1005: 'carbs',      // g
  1004: 'fat',        // g
  1079: 'fiber',      // g
  1093: 'sodium',     // mg
  2000: 'sugar',      // g
  1092: 'potassium',  // mg
  1087: 'calcium',    // mg
  1089: 'iron',       // mg
  1090: 'magnesium',  // mg
  1095: 'zinc',       // mg
  1106: 'vitA',       // mcg RAE
  1162: 'vitC',       // mg
  1114: 'vitD',       // mcg
  1178: 'vitB12',     // mcg
};

export async function GET(req) {
  const key = process.env.FDC_API_KEY;
  if (!key) return NextResponse.json({ foods: [] });

  const q = new URL(req.url).searchParams.get('q');
  if (!q || q.length < 2) return NextResponse.json({ foods: [] });

  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}` +
      `&query=${encodeURIComponent(q)}` +
      `&dataType=Foundation,SR%20Legacy,Branded&pageSize=8`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ foods: [] });
    const data = await res.json();

    const foods = (data.foods ?? []).map(f => {
      const out = {
        name: f.brandOwner ? `${f.description} (${f.brandOwner})` : f.description,
        source: 'USDA',
      };
      for (const n of f.foodNutrients ?? []) {
        const appKey = NUTRIENT_MAP[n.nutrientId];
        if (appKey && n.value != null) out[appKey] = Math.round(n.value * 10) / 10;
      }
      // FDC values are per 100g; note it in the name for generic foods
      if (!f.brandOwner) out.name += ' — per 100g';
      out.calories = Math.round(out.calories ?? 0);
      return out;
    }).filter(f => f.calories > 0);

    return NextResponse.json({ foods });
  } catch {
    return NextResponse.json({ foods: [] });
  }
}
