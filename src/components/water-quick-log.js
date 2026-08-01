'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassWater, Plus } from 'lucide-react';
import { storage } from '@/lib/storage';

export default function WaterQuickLog({ date, waterGoal }) {
  const [total, setTotal] = useState(0);

  const refresh = useCallback(() => {
    setTotal(storage.getWaterLogs(date).reduce((s, w) => s + (w.amount || 0), 0));
  }, [date]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = (oz) => {
    storage.addWaterLog({ amount: oz, date });
    refresh();
  };

  const goal = Number(waterGoal) || null;
  const pct = goal ? Math.min(100, Math.round((total / goal) * 100)) : null;

  return (
    <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-4 flex items-center gap-3">
      <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl shrink-0">
        <GlassWater size={18} className="text-sky-400" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-[var(--text-primary)]">
          {total}<span className="text-xs text-[var(--text-tertiary)] font-bold ml-0.5">oz</span>
          {goal && <span className="text-xs text-[var(--text-tertiary)] font-bold"> / {goal}</span>}
        </p>
        {pct != null && (
          <div className="h-1 bg-[var(--surface-2)] rounded-full overflow-hidden mt-1.5">
            <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {[8, 16].map(oz => (
        <button
          key={oz}
          type="button"
          onClick={() => add(oz)}
          className="shrink-0 flex items-center gap-0.5 bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] text-sky-400 text-xs font-bold rounded-xl px-3 py-2.5 active:scale-95 transition-all"
        >
          <Plus size={12} aria-hidden="true" />{oz}oz
        </button>
      ))}
    </div>
  );
}
