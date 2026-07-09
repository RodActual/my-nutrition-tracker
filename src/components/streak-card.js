'use client';

import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { getStreakStats } from '@/lib/trends';

export default function StreakCard({ targets, refreshKey }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats(getStreakStats(targets));
  }, [targets, refreshKey]);

  if (!stats || (stats.streak === 0 && !stats.daysLogged)) return null;

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5 flex items-center gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <Flame size={22} className={stats.streak > 0 ? 'text-orange-400' : 'text-zinc-600'} aria-hidden="true" />
        <div>
          <p className="text-xl font-black text-slate-100">{stats.streak}</p>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Day streak</p>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 text-right">
        {stats.calorieHits != null && (
          <div>
            <p className="text-sm font-black text-emerald-400">{stats.calorieHits}<span className="text-zinc-500 font-bold">/7</span></p>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Calorie days</p>
          </div>
        )}
        {stats.proteinHits != null && (
          <div>
            <p className="text-sm font-black text-blue-400">{stats.proteinHits}<span className="text-zinc-500 font-bold">/7</span></p>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Protein days</p>
          </div>
        )}
      </div>
    </div>
  );
}
