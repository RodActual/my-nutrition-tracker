'use client';

import { useState, useEffect } from 'react';
import { Flame, Footprints } from 'lucide-react';
import { storage } from '@/lib/storage';

export default function ActivitySummary({ date, refreshKey }) {
  const [active, setActive] = useState(0);
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    const logs = storage.getLogs(date);
    const burned = -logs
      .filter(l => l.source === 'AppleHealth')
      .reduce((s, l) => s + (l.calories || 0), 0);
    setActive(Math.max(0, Math.round(burned)));
    setSteps(storage.getSteps(date) ?? 0);
  }, [date, refreshKey]);

  if (!active && !steps) return null;

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5 flex items-center">
      <div className="flex-1 flex items-center gap-3">
        <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
          <Flame size={18} className="text-orange-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-black text-slate-100">{active.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Active kcal</p>
        </div>
      </div>
      <div className="w-px h-8 bg-zinc-800" />
      <div className="flex-1 flex items-center gap-3 justify-end">
        <div>
          <p className="text-lg font-black text-slate-100 text-right">{steps.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-right">Steps</p>
        </div>
        <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <Footprints size={18} className="text-blue-400" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
