'use client';

import { useState, useEffect } from 'react';
import { CalendarCheck } from 'lucide-react';
import { storage } from '@/lib/storage';
import { getDailyBalances, getBestTDEE, lastNDates, movingAverage } from '@/lib/trends';

export default function WeeklyReport({ profile }) {
  const [report, setReport] = useState(null);

  useEffect(() => {
    const best = getBestTDEE(profile);
    const days = getDailyBalances(lastNDates(7), best?.tdee ?? null).filter(b => b.hasFood);
    if (!days.length) { setReport(null); return; }

    const avg = (key) => Math.round(days.reduce((s, d) => s + (d[key] ?? 0), 0) / days.length);
    const avgBalance = best
      ? Math.round(days.reduce((s, d) => s + (d.balance ?? 0), 0) / days.length)
      : null;

    // Trend-weight change across the week (7-day MA endpoints)
    const weighIns = storage.getWeightLogs();
    const smoothed = movingAverage(weighIns.map(w => ({ weight: w.weight, date: w.date })), 'weight');
    const weekSet = new Set(lastNDates(7));
    const inWeek = smoothed.filter(p => weekSet.has(p.date));
    const trendDelta = inWeek.length >= 2
      ? Math.round((inWeek[inWeek.length - 1].ma - inWeek[0].ma) * 10) / 10
      : null;

    setReport({
      daysLogged: days.length,
      avgCalories: avg('intake'),
      avgProtein: avg('protein'),
      avgBalance,
      trendDelta,
    });
  }, [profile]);

  if (!report) return null;

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarCheck size={14} className="text-emerald-400" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-100">Last 7 Days</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Days logged" value={`${report.daysLogged}/7`} color="text-slate-100" />
        <Stat label="Avg calories" value={report.avgCalories.toLocaleString()} color="text-slate-100" />
        <Stat label="Avg protein" value={`${report.avgProtein}g`} color="text-blue-400" />
        {report.avgBalance != null && (
          <Stat
            label={report.avgBalance <= 0 ? 'Avg deficit' : 'Avg surplus'}
            value={`${Math.abs(report.avgBalance)} kcal`}
            color={report.avgBalance <= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        )}
        {report.trendDelta != null && (
          <Stat
            label="Trend weight"
            value={`${report.trendDelta > 0 ? '+' : ''}${report.trendDelta} lbs`}
            color={report.trendDelta <= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-lg font-black ${color}`}>{value}</p>
    </div>
  );
}
