'use client';

import { useState, useEffect, useRef } from ‘react’;
import { db } from ‘@/lib/firebase’;
import { collection, query, where, getDocs, limit } from ‘firebase/firestore’;

const FOOD_DATABASE = {
“chicken breast”: { calories: 165, protein: 31, carbs: 0, fats: 3.6, pieceWeight: 174, iron: 1, sodium: 74, potassium: 256, fiber: 0, sugar: 0 },
“ground beef (80/20)”: { calories: 254, protein: 17, carbs: 0, fats: 20, pieceWeight: 113, iron: 1.9, sodium: 66, potassium: 270, fiber: 0, sugar: 0 },
“ground turkey”: { calories: 189, protein: 25, carbs: 0, fats: 10, pieceWeight: 113, iron: 1.4, sodium: 75, potassium: 260, fiber: 0, sugar: 0 },
“egg”: { calories: 155, protein: 13, carbs: 1.1, fats: 11, pieceWeight: 50, vitD: 82, calcium: 50, sodium: 124, iron: 1.2 },
“egg white”: { calories: 52, protein: 11, carbs: 0.7, fats: 0.2, pieceWeight: 33, potassium: 163, sodium: 166, calcium: 7 },
“salmon”: { calories: 208, protein: 20, carbs: 0, fats: 13, pieceWeight: 150, vitD: 526, potassium: 363, sodium: 59, magnesium: 27 },
“tilapia”: { calories: 128, protein: 26, carbs: 0, fats: 3, pieceWeight: 150, potassium: 380, sodium: 56, magnesium: 34 },
“bacon”: { calories: 541, protein: 37, carbs: 1.4, fats: 42, pieceWeight: 8, sodium: 1717, potassium: 565, iron: 1.2 },
“greek yogurt (plain)”: { calories: 59, protein: 10, carbs: 3.6, fats: 0.4, pieceWeight: 170, calcium: 110, potassium: 141, sodium: 36 },
“apple”: { calories: 52, protein: 0.3, carbs: 14, fats: 0.2, pieceWeight: 182, fiber: 2.4, sugar: 10, vitC: 4.6, potassium: 107 },
“banana”: { calories: 89, protein: 1.1, carbs: 23, fats: 0.3, pieceWeight: 118, potassium: 358, fiber: 2.6, sugar: 12, vitC: 8.7 },
“blueberries”: { calories: 57, protein: 0.7, carbs: 14, fats: 0.3, pieceWeight: 148, fiber: 2.4, vitC: 9.7 },
“strawberries”: { calories: 32, protein: 0.7, carbs: 7.7, fats: 0.3, pieceWeight: 12, vitC: 58.8, fiber: 2, potassium: 153 },
“avocado”: { calories: 160, protein: 2, carbs: 9, fats: 15, pieceWeight: 200, potassium: 485, fiber: 6.7, magnesium: 29 },
“orange”: { calories: 47, protein: 0.9, carbs: 12, fats: 0.1, pieceWeight: 131, vitC: 53.2, potassium: 181, fiber: 2.4 },
“broccoli”: { calories: 34, protein: 2.8, carbs: 7, fats: 0.4, pieceWeight: 91, vitC: 89.2, potassium: 316, fiber: 2.6 },
“spinach”: { calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, pieceWeight: 30, iron: 2.7, vitA: 469, calcium: 99, magnesium: 79 },
“potato”: { calories: 77, protein: 2, carbs: 17, fats: 0.1, pieceWeight: 213, potassium: 421, vitC: 19.7, fiber: 2.2 },
“sweet potato”: { calories: 86, protein: 1.6, carbs: 20, fats: 0.1, pieceWeight: 130, vitA: 709, potassium: 337, fiber: 3 },
“carrot”: { calories: 41, protein: 0.9, carbs: 10, fats: 0.2, pieceWeight: 61, vitA: 835, potassium: 320, fiber: 2.8 },
“white rice (cooked)”: { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, pieceWeight: 186, sodium: 1, potassium: 35, magnesium: 12 },
“brown rice (cooked)”: { calories: 111, protein: 2.6, carbs: 23, fats: 0.9, pieceWeight: 195, magnesium: 43, fiber: 1.8, potassium: 43 },
“oats (dry)”: { calories: 389, protein: 16.9, carbs: 66, fats: 6.9, pieceWeight: 40, fiber: 10.6, magnesium: 177, iron: 4.7 },
“bread (white)”: { calories: 265, protein: 9, carbs: 49, fats: 3.2, pieceWeight: 25, sodium: 491, calcium: 260 },
“bread (whole wheat)”: { calories: 247, protein: 13, carbs: 41, fats: 3.4, pieceWeight: 28, fiber: 7, magnesium: 82, iron: 2.4 },
“pasta (cooked)”: { calories: 158, protein: 5.8, carbs: 31, fats: 0.9, pieceWeight: 140, magnesium: 18, potassium: 44 },
“tortilla (flour)”: { calories: 297, protein: 8, carbs: 50, fats: 8, pieceWeight: 45, sodium: 482, calcium: 150 },
“peanut butter”: { calories: 588, protein: 25, carbs: 20, fats: 50, pieceWeight: 16, magnesium: 154, potassium: 649, fiber: 6, sodium: 429 },
“butter”: { calories: 717, protein: 0.9, carbs: 0.1, fats: 81, pieceWeight: 14, vitA: 684, sodium: 11 },
“olive oil”: { calories: 884, protein: 0, carbs: 0, fats: 100, pieceWeight: 14 },
“almonds”: { calories: 579, protein: 21, carbs: 22, fats: 50, pieceWeight: 1, magnesium: 270, calcium: 269, fiber: 12.5 },
“cheese (cheddar)”: { calories: 403, protein: 25, carbs: 1.3, fats: 33, pieceWeight: 28, calcium: 721, sodium: 621, vitA: 265 },
};

export default function ManualEntry({ onAdd, onClose, initialData }) {
// FIX #3: When initialData comes from a scanned/API product, nutrients are
// per 100g. Default to amount=100, unit=g so ratio=1 and values display correctly.
// Only use amount=1, unit=pc for edit paths that already have pre-resolved values.
const isApiSource = !!(initialData?.product?.nutriments);
const isEditPath = !!(initialData && !initialData.isNewFromScan && !initialData.product);

const [form, setForm] = useState({
name: initialData?.name || initialData?.product?.product_name || ‘’,
amount: isApiSource ? 100 : 1,
unit: isApiSource ? ‘g’ : ‘pc’
});

const [showMicros, setShowMicros] = useState(false);
const [suggestions, setSuggestions] = useState([]);
const [isSearching, setIsSearching] = useState(false);
const searchCache = useRef({});

// FIX #4: Track whether the name was pre-populated from initialData so the
// search useEffect skips firing on the initial render — avoiding two unnecessary
// API calls when a scan or edit already has all data loaded.
const isPrepopulated = useRef(!!(initialData?.name || initialData?.product?.product_name));

const [manualNutrients, setManualNutrients] = useState(() => {
if (initialData) {
const source = initialData.product ? initialData.product.nutriments : initialData;
return {
calories: source.calories || Math.round(source[‘energy-kcal_100g’] || source[‘energy-kcal_serving’] || 0),
protein: parseFloat(source.protein || source[‘proteins_100g’] || source[‘proteins_serving’] || 0),
carbs: parseFloat(source.carbs || source[‘carbohydrates_100g’] || source[‘carbohydrates_serving’] || 0),
fats: parseFloat(source.fats || source[‘fat_100g’] || source[‘fat_serving’] || 0),
fiber: parseFloat(source.fiber || source[‘fiber_100g’] || source[‘fiber_serving’] || 0),
sodium: parseFloat(source.sodium || source[‘sodium_100g’] || source[‘sodium_serving’] || 0),
potassium: parseFloat(source.potassium || source[‘potassium_100g’] || source[‘potassium_serving’] || 0),
sugar: parseFloat(source.sugar || source[‘sugars_100g’] || source[‘sugars_serving’] || 0),
iron: parseFloat(source.iron || source[‘iron_100g’] || source[‘iron_serving’] || 0),
calcium: parseFloat(source.calcium || source[‘calcium_100g’] || source[‘calcium_serving’] || 0),
magnesium: parseFloat(source.magnesium || source[‘magnesium_100g’] || source[‘magnesium_serving’] || 0),
zinc: parseFloat(source.zinc || source[‘zinc_100g’] || source[‘zinc_serving’] || 0),
vitA: parseFloat(source.vitA || source[‘vitamin-a_100g’] || source[‘vitamin-a_serving’] || 0),
vitC: parseFloat(source.vitC || source[‘vitamin-c_100g’] || source[‘vitamin-c_serving’] || 0),
vitD: parseFloat(source.vitD || source[‘vitamin-d_100g’] || source[‘vitamin-d_serving’] || 0),
vitB12: parseFloat(source.vitB12 || source[‘vitamin-b12_100g’] || source[‘vitamin-b12_serving’] || 0),
};
}
return null;
});

useEffect(() => {
const searchAll = async () => {
const term = form.name.toLowerCase().trim();

```
  if (isPrepopulated.current) {
    isPrepopulated.current = false;
    return;
  }

  if (term.length < 2) { setSuggestions([]); return; }

  // Serve from cache instantly — no spinner, no wait
  if (searchCache.current[term]) {
    setSuggestions(searchCache.current[term]);
    return;
  }

  setIsSearching(true);

  // ── Step 1: Show local FOOD_DATABASE matches immediately ──────────────
  // Filter the local staples list client-side — zero latency.
  const localMatches = Object.keys(FOOD_DATABASE)
    .filter(key => key.includes(term))
    .map(key => ({
      product_name: key.charAt(0).toUpperCase() + key.slice(1),
      brands: 'Local DB',
      nutriments: {
        'energy-kcal_100g': FOOD_DATABASE[key].calories,
        'proteins_100g': FOOD_DATABASE[key].protein,
        'carbohydrates_100g': FOOD_DATABASE[key].carbs,
        'fat_100g': FOOD_DATABASE[key].fats,
        'fiber_100g': FOOD_DATABASE[key].fiber || 0,
        'sodium_100g': FOOD_DATABASE[key].sodium || 0,
        'potassium_100g': FOOD_DATABASE[key].potassium || 0,
        'sugars_100g': FOOD_DATABASE[key].sugar || 0,
        'iron_100g': FOOD_DATABASE[key].iron || 0,
        'calcium_100g': FOOD_DATABASE[key].calcium || 0,
        'magnesium_100g': FOOD_DATABASE[key].magnesium || 0,
        'vitamin-a_100g': FOOD_DATABASE[key].vitA || 0,
        'vitamin-c_100g': FOOD_DATABASE[key].vitC || 0,
        'vitamin-d_100g': FOOD_DATABASE[key].vitD || 0,
        'vitamin-b12_100g': FOOD_DATABASE[key].vitB12 || 0,
      },
      source: 'Local',
      _pieceWeight: FOOD_DATABASE[key].pieceWeight,
    }));

  if (localMatches.length > 0) setSuggestions(localMatches);

  // ── Step 2: Firestore history — fast, usually <200ms ─────────────────
  let historyResults = [];
  try {
    const historyQuery = query(
      collection(db, "products"),
      where("product_name", ">=", term),
      where("product_name", "<=", term + '\uf8ff'),
      limit(5)
    );
    const historySnap = await getDocs(historyQuery);
    historyResults = historySnap.docs.map(doc => ({ ...doc.data(), source: 'History' }));

    if (historyResults.length > 0) {
      // Show history immediately, don't wait for the slow API
      const merged = mergeSuggestions(localMatches, historyResults, []);
      setSuggestions(merged);
    }
  } catch (err) {
    console.warn("History search failed:", err);
  }

  // ── Step 3: Open Food Facts v2 API — faster than legacy search.pl ────
  // Uses the dedicated search endpoint with fields projection to reduce
  // payload size and sort by popularity (unique_scans_n) for relevance.
  try {
    const fields = 'product_name,brands,nutriments';
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(term)}&fields=${fields}&page_size=15&sort_by=unique_scans_n`;
    const apiRes = await fetch(url).then(r => r.json());

    const apiResults = (apiRes.products || [])
      .filter(p => p.product_name && p.nutriments)
      .map(p => ({
        product_name: p.product_name,
        brands: p.brands || "Global DB",
        nutriments: p.nutriments,
        source: 'Global'
      }));

    const final = mergeSuggestions(localMatches, historyResults, apiResults);
    searchCache.current[term] = final;
    setSuggestions(final);
  } catch (err) {
    console.warn("API search failed:", err);
    // History + local results already shown — graceful degradation
  } finally {
    setIsSearching(false);
  }
};

// 500ms debounce — reduces unnecessary calls on fast typing
const timer = setTimeout(searchAll, 500);
return () => clearTimeout(timer);
```

}, [form.name]);

// Merge local, history, and API results — deduplicate by name, cap at 10
const mergeSuggestions = (local, history, api) => {
const seen = new Set();
const out = [];
for (const item of […local, …history, …api]) {
const key = item.product_name.toLowerCase().trim();
if (!seen.has(key)) {
seen.add(key);
out.push(item);
}
if (out.length >= 10) break;
}
return out;
};

const searchName = form.name.toLowerCase().trim();
const baseData = FOOD_DATABASE[searchName];
let effectiveGrams = Number(form.amount);
if (form.unit === ‘pc’ && baseData?.pieceWeight) {
effectiveGrams = form.amount * baseData.pieceWeight;
}
const ratio = effectiveGrams / 100;

const displayData = manualNutrients || (baseData ? {
// FIX #7: Use parseFloat on all FOOD_DATABASE derived values to ensure
// numbers are stored, not strings from .toFixed().
calories: Math.round(baseData.calories * ratio),
protein: parseFloat((baseData.protein * ratio).toFixed(1)),
carbs: parseFloat((baseData.carbs * ratio).toFixed(1)),
fats: parseFloat((baseData.fats * ratio).toFixed(1)),
fiber: parseFloat(((baseData.fiber || 0) * ratio).toFixed(1)),
sodium: parseFloat(((baseData.sodium || 0) * ratio).toFixed(1)),
potassium: parseFloat(((baseData.potassium || 0) * ratio).toFixed(1)),
sugar: parseFloat(((baseData.sugar || 0) * ratio).toFixed(1)),
iron: parseFloat(((baseData.iron || 0) * ratio).toFixed(2)),
calcium: parseFloat(((baseData.calcium || 0) * ratio).toFixed(1)),
magnesium: parseFloat(((baseData.magnesium || 0) * ratio).toFixed(1)),
zinc: parseFloat(((baseData.zinc || 0) * ratio).toFixed(2)),
vitA: parseFloat(((baseData.vitA || 0) * ratio).toFixed(1)),
vitC: parseFloat(((baseData.vitC || 0) * ratio).toFixed(1)),
vitD: parseFloat(((baseData.vitD || 0) * ratio).toFixed(1)),
vitB12: parseFloat(((baseData.vitB12 || 0) * ratio).toFixed(2)),
} : {
calories: ‘’, protein: ‘’, carbs: ‘’, fats: ‘’,
fiber: 0, sodium: 0, potassium: 0, sugar: 0, iron: 0, calcium: 0,
magnesium: 0, zinc: 0, vitA: 0, vitC: 0, vitD: 0, vitB12: 0
});

const handleSelectSuggestion = (prod) => {
const n = prod.nutriments;
setManualNutrients({
calories: Math.round(n[‘energy-kcal_100g’] || n[‘energy-kcal_serving’] || 0),
protein: parseFloat(n[‘proteins_100g’] || n[‘proteins_serving’] || 0),
carbs: parseFloat(n[‘carbohydrates_100g’] || n[‘carbohydrates_serving’] || 0),
fats: parseFloat(n[‘fat_100g’] || n[‘fat_serving’] || 0),
fiber: parseFloat(n[‘fiber_100g’] || 0),
sodium: parseFloat(n[‘sodium_100g’] || 0),
potassium: parseFloat(n[‘potassium_100g’] || 0),
sugar: parseFloat(n[‘sugars_100g’] || 0),
iron: parseFloat(n[‘iron_100g’] || 0),
calcium: parseFloat(n[‘calcium_100g’] || 0),
magnesium: parseFloat(n[‘magnesium_100g’] || 0),
zinc: parseFloat(n[‘zinc_100g’] || 0),
vitA: parseFloat(n[‘vitamin-a_100g’] || 0),
vitC: parseFloat(n[‘vitamin-c_100g’] || 0),
vitD: parseFloat(n[‘vitamin-d_100g’] || 0),
vitB12: parseFloat(n[‘vitamin-b12_100g’] || 0),
});
// Local DB items have a known piece weight — switch to per-serving units
if (prod.source === ‘Local’ && prod._pieceWeight) {
setForm(f => ({ …f, name: prod.product_name, amount: 1, unit: ‘pc’ }));
} else {
setForm(f => ({ …f, name: prod.product_name }));
}
setSuggestions([]);
};

const buildSubmitPayload = () => ({
…displayData,
product_name: form.name,
name: form.name,
brand: ‘’,
brands: ‘’,
});

return (
<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50 overflow-y-auto">
<div className="bg-white w-full max-w-md p-6 rounded-[2rem] shadow-2xl relative my-auto animate-in slide-in-from-bottom duration-300">
<div className="flex justify-between items-center mb-6">
<h2 className="font-black text-2xl text-black tracking-tight uppercase">
{initialData?.isNewFromScan ? ‘Confirm Scan’ : initialData ? ‘Edit Entry’ : ‘Quick Log’}
</h2>
<button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-900">✕</button>
</div>

```
    <form onSubmit={(e) => {
      e.preventDefault();
      onAdd(buildSubmitPayload(), initialData?.id);
    }} className="space-y-4">
      <div className="relative">
        <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1 ml-1">Food Name</label>
        <div className="relative">
          <input
            type="text"
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black outline-none focus:border-blue-500 pr-12"
            value={form.name}
            placeholder="Start typing..."
            onChange={e => {
              setForm({ ...form, name: e.target.value });
              setManualNutrients(null);
            }}
          />
          {isSearching && <div className="absolute right-4 top-4 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
        </div>

        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[100] overflow-hidden max-h-60 overflow-y-auto border-t-4 border-t-blue-500">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => handleSelectSuggestion(s)} className="w-full p-4 text-left hover:bg-blue-50 border-b border-slate-50 flex justify-between items-center transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-black text-sm capitalize">{s.product_name}</span>
                  <span className="text-[10px] text-slate-900 font-bold">{s.brands}</span>
                </div>
                <span className={`text-[8px] px-2 py-1 rounded-full font-black uppercase ${
                  s.source === 'History' ? 'bg-emerald-100 text-emerald-700' :
                  s.source === 'Local' ? 'bg-violet-100 text-violet-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {s.source || 'Global'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-[2]">
          <label className="block text-[10px] font-black text-slate-900 uppercase mb-1 ml-1">Quantity</label>
          <input type="number" step="0.1" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-black text-slate-900 uppercase mb-1 ml-1">Unit</label>
          <select className="w-full p-4 bg-slate-100 border-2 border-slate-100 rounded-2xl font-bold text-black" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
            <option value="pc">Serving</option>
            <option value="g">Grams</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-inner">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-50">
            <label className="block text-[9px] font-black text-blue-400 uppercase">Calories</label>
            <input type="number" className="w-full bg-transparent font-black text-xl text-blue-900 outline-none" value={Math.round(displayData.calories || 0)} onChange={e => setManualNutrients({ ...displayData, calories: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'protein', l: 'Protein', c: 'text-rose-500' },
            { k: 'carbs', l: 'Carbs', c: 'text-emerald-500' },
            { k: 'fats', l: 'Fats', c: 'text-amber-500' }
          ].map((m) => (
            <div key={m.k} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <label className={`block text-[9px] font-black uppercase ${m.c}`}>{m.l}</label>
              <input type="number" step="0.1" className="w-full bg-transparent font-bold text-black outline-none" value={displayData[m.k] || 0} onChange={e => setManualNutrients({ ...displayData, [m.k]: e.target.value })} />
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setShowMicros(!showMicros)} className="w-full mt-6 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-100/50 rounded-2xl hover:bg-blue-100 transition-all active:scale-95">
          {showMicros ? 'Hide' : 'Edit'} All Micronutrients
        </button>

        {showMicros && (
          <div className="grid grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {[
              { k: 'fiber', l: 'Fiber (g)' }, { k: 'sugar', l: 'Sugar (g)' },
              { k: 'sodium', l: 'Sodium (mg)' }, { k: 'potassium', l: 'Potassium (mg)' },
              { k: 'iron', l: 'Iron (mg)' }, { k: 'calcium', l: 'Calcium (mg)' },
              { k: 'magnesium', l: 'Magnesium (mg)' }, { k: 'zinc', l: 'Zinc (mg)' },
              { k: 'vitA', l: 'Vit A (IU)' }, { k: 'vitC', l: 'Vit C (mg)' },
              { k: 'vitD', l: 'Vit D (IU)' }, { k: 'vitB12', l: 'Vit B12 (mcg)' }
            ].map((m) => (
              <div key={m.k} className="bg-white p-2.5 rounded-xl border border-slate-200">
                <label className="block text-[8px] font-black text-slate-900 uppercase mb-0.5">{m.l}</label>
                <input type="number" step="0.01" className="w-full bg-transparent font-bold text-xs text-black outline-none" value={displayData[m.k] || 0} onChange={e => setManualNutrients({ ...displayData, [m.k]: e.target.value })} />
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-[2rem] shadow-xl active:scale-95 transition-all mt-4 uppercase tracking-widest text-sm">
        {initialData?.isNewFromScan ? 'Confirm and Log' : initialData ? 'Update Entry' : 'Log Entry'}
      </button>
    </form>
  </div>
</div>
```

);
}