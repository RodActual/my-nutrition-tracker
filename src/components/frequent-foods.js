'use client';

import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { getFrequentFoods } from '@/lib/trends';

export default function FrequentFoods({ onAdd = () => {} }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(getFrequentFoods(6));
  }, []);

  if (!items.length) return null;

  const handleTap = (item) => {
    onAdd({
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fats ?? item.fat ?? 0,
      fiber: item.fiber ?? 0,
      sodium: item.sodium ?? 0,
      sugar: item.sugar ?? 0,
      timestamp: new Date().toISOString(),
      source: 'Frequent',
    });
  };

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <History size={14} className="text-emerald-400" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-100">Your Usuals</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => handleTap(item)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-all text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100 truncate">{item.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {item.calories ?? 0} kcal &bull; {Math.round(item.protein ?? 0)}g protein
              </p>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 ml-2 shrink-0">×{item.logCount}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
