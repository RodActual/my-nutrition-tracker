'use client';

import { Coffee, Egg, Dumbbell, Banana, Wheat } from 'lucide-react';

const ICON_MAP = { Coffee, Egg, Dumbbell, Banana, Wheat };

const QUICK_ITEMS = [
  {
    icon: 'Coffee',
    label: 'Black Coffee',
    calories: 5,
    protein: 0.3,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 5,
    sugar: 0,
  },
  {
    icon: 'Egg',
    label: 'Large Egg',
    calories: 70,
    protein: 6,
    carbs: 0.5,
    fat: 5,
    fiber: 0,
    sodium: 65,
    sugar: 0.5,
  },
  {
    icon: 'Dumbbell',
    label: 'Protein Shake',
    calories: 120,
    protein: 25,
    carbs: 5,
    fat: 2,
    fiber: 1,
    sodium: 150,
    sugar: 2,
  },
  {
    icon: 'Banana',
    label: 'Banana',
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    fiber: 3.1,
    sodium: 1,
    sugar: 14,
  },
  {
    icon: 'Wheat',
    label: 'Toast (1 slice)',
    calories: 80,
    protein: 3,
    carbs: 15,
    fat: 1,
    fiber: 1,
    sodium: 130,
    sugar: 1,
  },
];

export default function QuickLog({ onAdd = () => {} }) {
  const handleTap = (item) => {
    onAdd({
      name: item.label,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sodium: item.sodium,
      sugar: item.sugar,
      timestamp: Date.now(),
      source: 'Quick',
    });
  };

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <p className="text-sm font-semibold text-slate-100 mb-4">Quick Add</p>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleTap(item)}
              className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-2xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors"
            >
              {Icon && <Icon size={20} className="text-emerald-400" aria-hidden="true" />}
              <span className="text-xs text-zinc-300 text-center leading-tight">{item.label}</span>
              <span className="text-xs text-zinc-500">{item.calories} kcal</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
