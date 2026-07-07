'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { calcTDEE, getDailyBalances, lastNDates, formatShortDate } from '@/lib/trends';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm">
      <p className={`font-semibold ${p.balance <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {p.balance > 0 ? '+' : ''}{p.balance} kcal
      </p>
      <p className="text-zinc-500 text-xs">In {p.intake} · Active {Math.round(p.active)}</p>
      <p className="text-zinc-400">{p.label}</p>
    </div>
  );
}

export default function EnergyBalanceChart({ days = 30, profile }) {
  const [data, setData] = useState([]);
  const [avg, setAvg] = useState(null);
  const tdee = calcTDEE(profile ?? {});

  useEffect(() => {
    if (tdee == null) return;
    const balances = getDailyBalances(lastNDates(days || 90), tdee)
      .filter(b => b.hasFood)
      .map(b => ({ ...b, label: formatShortDate(b.date) }));
    setData(balances);
    setAvg(balances.length
      ? Math.round(balances.reduce((s, b) => s + b.balance, 0) / balances.length)
      : null);
  }, [days, tdee]);

  if (tdee == null) {
    return (
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
        <p className="text-sm font-semibold text-slate-100 mb-2">Energy Balance</p>
        <p className="text-zinc-500 text-sm text-center py-8">Set up your profile to enable predictions</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
        <p className="text-sm font-semibold text-slate-100 mb-2">Energy Balance</p>
        <p className="text-zinc-500 text-sm text-center py-8">No logged days in range</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold text-slate-100">Energy Balance</p>
        {avg != null && (
          <p className={`text-xs font-bold ${avg <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            Avg {avg > 0 ? '+' : ''}{avg} kcal/day {avg <= 0 ? 'deficit' : 'surplus'}
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} minTickGap={30} />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} width={40} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#27272a' }} />
          <ReferenceLine y={0} stroke="#71717a" />
          <Bar dataKey="balance" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.date} fill={d.balance <= 0 ? '#10b981' : '#f87171'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
