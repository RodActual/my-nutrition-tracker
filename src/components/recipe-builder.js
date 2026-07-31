'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { storage } from '@/lib/storage';
import { searchFoods, sumNutrients } from '@/lib/food-search';

export default function RecipeBuilder({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [ingredients, setIngredients] = useState([]);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const found = await searchFoods(term, { signal: controller.signal });
      setResults(found);
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term]);

  const addIngredient = (item) => {
    setIngredients(list => [...list, { ...item, _key: `${Date.now()}-${list.length}` }]);
    setTerm('');
    setResults([]);
    searchRef.current?.focus();
  };

  const removeIngredient = (key) => {
    setIngredients(list => list.filter(i => i._key !== key));
  };

  const totals = sumNutrients(ingredients);
  const n = Math.max(1, Number(servings) || 1);
  const perServing = Math.round(totals.calories / n);

  const save = () => {
    if (!name.trim()) { alert('Give the recipe a name.'); return; }
    if (!ingredients.length) { alert('Add at least one ingredient.'); return; }
    storage.addRecipe({
      name: name.trim(),
      servings: n,
      ingredients: ingredients.map(({ _key, source, ...rest }) => rest),
    });
    onSaved?.();
    onClose();
  };

  const inputClass =
    'bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm w-full focus:outline-none focus:border-emerald-500';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">New Recipe</h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Recipe name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Sunday chili" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Makes how many servings?</label>
            <input type="number" min="1" step="1" inputMode="numeric" value={servings} onChange={e => setServings(e.target.value)} className={inputClass} />
          </div>

          <div className="relative">
            <label className="block text-xs text-zinc-400 mb-1">Add ingredients</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder="Search foods..."
                className={`${inputClass} pl-9`}
              />
            </div>
            {results.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-10 max-h-56 overflow-y-auto">
                {results.map((item, i) => (
                  <li key={`${item.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() => addIngredient(item)}
                      className="w-full text-left bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm text-slate-200 flex items-baseline"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="ml-2 text-xs text-zinc-500 shrink-0">{item.calories} kcal</span>
                      <span className={`ml-2 text-[9px] font-bold uppercase shrink-0 ${
                        item.source === 'Global' ? 'text-blue-400' : item.source === 'USDA' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {item.source === 'Global' ? 'Web' : item.source}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {ingredients.length > 0 && (
            <div className="space-y-2">
              {ingredients.map(ing => (
                <div key={ing._key} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-100 truncate">{ing.name}</p>
                    <p className="text-xs text-zinc-500">{ing.calories} kcal · {Math.round(ing.protein || 0)}g protein</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing._key)}
                    aria-label={`Remove ${ing.name}`}
                    className="p-1 text-zinc-400 hover:text-rose-400 ml-2 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <p className="text-xs text-zinc-400 pt-1">
                Batch total: <span className="text-slate-200 font-semibold">{Math.round(totals.calories)} kcal</span>
                {' · '}Per serving: <span className="text-emerald-400 font-semibold">{perServing} kcal</span>
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={save}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-2xl py-3"
          >
            Save Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
