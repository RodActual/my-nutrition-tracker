'use client';

import { useState, useEffect } from 'react';
import { ChefHat, Plus, Minus, Trash2 } from 'lucide-react';
import { storage } from '@/lib/storage';
import { sumNutrients, NUTRIENT_KEYS } from '@/lib/food-search';

export default function RecipesCard({ onAdd = () => {}, onOpenBuilder }) {
  const [recipes, setRecipes] = useState([]);
  const [qty, setQty] = useState({}); // recipe id → servings to log

  const refresh = () => setRecipes(storage.getRecipes());
  useEffect(() => { refresh(); }, []);

  const logRecipe = (recipe) => {
    const servingsEaten = qty[recipe.id] ?? 1;
    const totals = sumNutrients(recipe.ingredients);
    const factor = servingsEaten / Math.max(1, recipe.servings);
    const entry = { name: `${recipe.name}${servingsEaten !== 1 ? ` (×${servingsEaten})` : ''}` };
    for (const k of NUTRIENT_KEYS) {
      entry[k] = Math.round((totals[k] || 0) * factor * 10) / 10;
    }
    entry.calories = Math.round(entry.calories);
    onAdd({ ...entry, timestamp: new Date().toISOString(), source: 'Recipe' });
  };

  const remove = (id, name) => {
    if (!window.confirm(`Delete recipe "${name}"?`)) return;
    storage.deleteRecipe(id);
    refresh();
  };

  return (
    <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChefHat size={14} className="text-[var(--accent)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Recipes</p>
        </div>
        <button
          type="button"
          onClick={onOpenBuilder}
          className="flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:text-[var(--accent-hover)]"
        >
          <Plus size={13} aria-hidden="true" /> New
        </button>
      </div>

      {!recipes.length ? (
        <p className="text-[var(--text-tertiary)] text-sm text-center py-4">
          Save your go-to meals once, log them in one tap
        </p>
      ) : (
        <div className="space-y-2">
          {recipes.map(recipe => {
            const perServing = Math.round(sumNutrients(recipe.ingredients).calories / Math.max(1, recipe.servings));
            const n = qty[recipe.id] ?? 1;
            return (
              <div key={recipe.id} className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3 py-2.5 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{recipe.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{perServing} kcal/serving · makes {recipe.servings}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQty(q => ({ ...q, [recipe.id]: Math.max(0.5, n - 0.5) }))}
                    aria-label="Fewer servings"
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] rounded-lg border border-[var(--border-2)]"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-bold text-[var(--text-primary)] w-7 text-center">{n}</span>
                  <button
                    type="button"
                    onClick={() => setQty(q => ({ ...q, [recipe.id]: n + 0.5 }))}
                    aria-label="More servings"
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] rounded-lg border border-[var(--border-2)]"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => logRecipe(recipe)}
                    className="ml-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 text-xs font-bold rounded-lg px-3 py-1.5 active:scale-95 transition-all"
                  >
                    Log
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(recipe.id, recipe.name)}
                    aria-label={`Delete ${recipe.name}`}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-rose-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
