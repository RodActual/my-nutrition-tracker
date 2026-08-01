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
    // Pass every nutrient the original entry carried (micros included)
    const { id, date, timestamp, logCount, source, ...nutrients } = item;
    onAdd({
      ...nutrients,
      fat: item.fats ?? item.fat ?? 0,
      timestamp: new Date().toISOString(),
      source: 'Frequent',
    });
  };

  return (
    <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <History size={14} className="text-[var(--accent)]" aria-hidden="true" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Your Usuals</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => handleTap(item)}
            className="w-full bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-all text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {item.calories ?? 0} kcal &bull; {Math.round(item.protein ?? 0)}g protein
              </p>
            </div>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] ml-2 shrink-0">×{item.logCount}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
