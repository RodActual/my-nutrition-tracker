'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { storage } from '@/lib/storage';

// initialData is either a log entry (flat fields, editing) or a scan result
// ({ product, isNewFromScan, id }) whose values live under product.nutriments.
function normalizeInitialData(initialData) {
  if (!initialData) return null;
  if (initialData.product) {
    const p = initialData.product;
    const n = p.nutriments ?? {};
    const pick = (stub) => n[`${stub}_serving`] ?? n[`${stub}_100g`] ?? '';
    return {
      isScan: true,
      name: p.product_name ?? p.name ?? '',
      calories: pick('energy-kcal') !== '' ? Math.round(Number(pick('energy-kcal'))) : '',
      protein: pick('proteins'),
      carbs: pick('carbohydrates'),
      fat: pick('fat'),
      fiber: pick('fiber'),
      sodium: pick('sodium'),
      sugar: pick('sugars'),
      potassium: pick('potassium'),
      calcium: pick('calcium'),
      iron: pick('iron'),
      magnesium: pick('magnesium'),
      zinc: pick('zinc'),
      vitA: pick('vitamin-a'),
      vitC: pick('vitamin-c'),
      vitD: pick('vitamin-d'),
      vitB12: pick('vitamin-b12'),
    };
  }
  return { ...initialData, fat: initialData.fats ?? initialData.fat ?? '', isScan: false };
}

const MICRO_FIELDS = [
  { key: 'potassium', label: 'Potassium mg' },
  { key: 'calcium', label: 'Calcium mg' },
  { key: 'iron', label: 'Iron mg' },
  { key: 'magnesium', label: 'Magnesium mg' },
  { key: 'zinc', label: 'Zinc mg' },
  { key: 'vitA', label: 'Vit A mcg' },
  { key: 'vitC', label: 'Vit C mg' },
  { key: 'vitD', label: 'Vit D mcg' },
  { key: 'vitB12', label: 'B12 mcg' },
];

export default function ManualEntry({ onAdd, initialData, onClose }) {
  const editingLog = normalizeInitialData(initialData);
  const [name, setName] = useState(editingLog?.name ?? '');
  const [calories, setCalories] = useState(editingLog?.calories ?? '');
  const [protein, setProtein] = useState(editingLog?.protein ?? '');
  const [carbs, setCarbs] = useState(editingLog?.carbs ?? '');
  const [fat, setFat] = useState(editingLog?.fat ?? '');
  const [fiber, setFiber] = useState(editingLog?.fiber ?? '');
  const [sodium, setSodium] = useState(editingLog?.sodium ?? '');
  const [sugar, setSugar] = useState(editingLog?.sugar ?? '');
  const [servings, setServings] = useState('1');
  const [micros, setMicros] = useState(() =>
    Object.fromEntries(MICRO_FIELDS.map(f => [f.key, editingLog?.[f.key] ?? '']))
  );
  const [showMicros, setShowMicros] = useState(false);
  const [results, setResults] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const term = name.trim();
    if (term.length <= 1) {
      setResults([]);
      return;
    }
    // History results are instant
    setResults(storage.searchProducts(term));

    // OpenFoodFacts text search, debounced; merged below history results
    if (term.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      // USDA (generic/whole foods, best micros) and OpenFoodFacts (branded) in parallel
      const usdaPromise = fetch(`/api/food-search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(r => (r.ok ? r.json() : { foods: [] }))
        .then(d => d.foods ?? [])
        .catch(() => []);
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,brands,nutriments`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const usda = await usdaPromise;
        const online = (data.products ?? [])
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
              sodium: pick('sodium') * 1000, // OFF sodium is grams → mg
              sugar: pick('sugars'),
              potassium: pick('potassium') * 1000, // OFF minerals are grams → mg
              calcium: pick('calcium') * 1000,
              iron: pick('iron') * 1000,
              magnesium: pick('magnesium') * 1000,
              zinc: pick('zinc') * 1000,
              vitA: pick('vitamin-a') * 1e6, // OFF vitamins are grams → mcg
              vitC: pick('vitamin-c') * 1000, // → mg
              vitD: pick('vitamin-d') * 1e6,
              vitB12: pick('vitamin-b12') * 1e6,
              source: 'Global',
            };
          })
          .filter(p => p.calories > 0);
        setResults(prev => {
          const history = prev.filter(r => r.source !== 'Global' && r.source !== 'USDA');
          const seen = new Set(history.map(h => (h.name || '').toLowerCase()));
          const merged = [...usda, ...online].filter(o => {
            const key = o.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return [...history, ...merged].slice(0, 10);
        });
      } catch { /* offline or aborted — history results remain */ }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [name]);

  const handleSelect = (item) => {
    setName(item.name ?? '');
    setCalories(item.calories ?? '');
    setProtein(item.protein ?? '');
    setCarbs(item.carbs ?? '');
    setFat(item.fats ?? item.fat ?? '');
    setFiber(item.fiber ?? '');
    setSodium(item.sodium ?? '');
    setSugar(item.sugar ?? '');
    setMicros(Object.fromEntries(MICRO_FIELDS.map(f => [f.key, item[f.key] ?? ''])));
    setResults([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const qty = Number(servings) > 0 ? Number(servings) : 1;
    const scale = (v) => Math.round((Number(v) || 0) * qty * 10) / 10;
    onAdd({
      name: qty !== 1 ? `${name} (×${qty})` : name,
      calories: Math.round((Number(calories) || 0) * qty),
      protein: scale(protein),
      carbs: scale(carbs),
      fat: scale(fat),
      fiber: scale(fiber),
      sodium: scale(sodium),
      sugar: scale(sugar),
      ...Object.fromEntries(MICRO_FIELDS.map(f => [f.key, scale(micros[f.key])])),
    });
    onClose();
  };

  const inputClass =
    'bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm w-full focus:outline-none focus:border-[var(--accent)]';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-[var(--surface)] rounded-t-3xl w-full max-w-lg p-6 pb-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {editingLog && !editingLog.isScan ? 'Edit Food' : 'Log Food'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + search */}
          <div className="relative" ref={searchRef}>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Food Name</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setResults([]); }}
                placeholder="Search or type food name..."
                className={`${inputClass} pl-9`}
              />
            </div>

            {results.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl overflow-hidden z-10">
                {results.map((item, i) => (
                  <li key={item.name ?? i}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full text-left bg-[var(--surface-2)] hover:bg-[var(--border-2)] px-4 py-2 text-sm text-[var(--text-primary)] cursor-pointer"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="ml-2 text-xs text-[var(--text-tertiary)] shrink-0">{item.calories} kcal</span>
                      <span className={`ml-2 text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                        item.source === 'Global' ? 'text-blue-400' : item.source === 'USDA' ? 'text-amber-400' : 'text-[var(--accent)]'
                      }`}>
                        {item.source === 'Global' ? 'Web' : item.source === 'USDA' ? 'USDA' : 'History'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Servings */}
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Servings</label>
            <div className="flex items-center gap-2">
              {[0.5, 1, 1.5, 2].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setServings(String(q))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    Number(servings) === q
                      ? 'bg-[var(--accent)] text-zinc-950 border-[var(--accent)]'
                      : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border-2)]'
                  }`}
                >
                  {q}
                </button>
              ))}
              <input
                type="number"
                min="0.1"
                step="0.25"
                inputMode="decimal"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className={`${inputClass} flex-1`}
              />
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Values below are per serving — totals multiply on save</p>
          </div>

          {/* Macro row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Calories</label>
              <input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Protein g</label>
              <input type="number" min="0" step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Carbs g</label>
              <input type="number" min="0" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Fat g</label>
              <input type="number" min="0" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} className={inputClass} placeholder="0" />
            </div>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Fiber g</label>
              <input type="number" min="0" step="0.1" value={fiber} onChange={(e) => setFiber(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Sodium mg</label>
              <input type="number" min="0" value={sodium} onChange={(e) => setSodium(e.target.value)} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Sugar g</label>
              <input type="number" min="0" step="0.1" value={sugar} onChange={(e) => setSugar(e.target.value)} className={inputClass} placeholder="0" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMicros(s => !s)}
            className="w-full text-left text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
          >
            {showMicros ? '▾' : '▸'} More nutrients {Object.values(micros).some(v => v !== '' && Number(v) > 0) ? '·' : '(optional)'}
          </button>

          {showMicros && (
            <div className="grid grid-cols-3 gap-3">
              {MICRO_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] text-[var(--text-secondary)] mb-1">{f.label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={micros[f.key]}
                    onChange={e => setMicros(m => ({ ...m, [f.key]: e.target.value }))}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 font-semibold rounded-2xl py-3 mt-4"
          >
            {editingLog && !editingLog.isScan ? 'Update' : 'Add Food'}
          </button>
        </form>
      </div>
    </div>
  );
}
