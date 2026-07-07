'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getDailyBalances, lastNDates, formatShortDate } from '@/lib/trends';

const MACROS = [
  { key: 'protein', label: 'Protein', color: '#10b981' },
  { key: 'carbs', label: 'Carbs', color: '#60a5fa' },
  { key: 'fats', label: 'Fat', color: '#f59e0b' },
];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm space-y-0.5">
      <p className="text-emerald-400 font-semibold">P {Math.round(p.protein)}g</p>
      <p className="text-blue-400 font-semibold">C {Math.round(p.carbs)}g</p>
      <p className="text-amber-400 font-semibold">F {Math.round(p.fats)}g</p>
      <p className="text-zinc-400">{p.label}</p>
    </div>
  );
}

export default function MacroTrendChart({ days = 30, targets }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const rows = getDailyBalances(lastNDates(days || 90), null)
      .filter(b => b.hasFood)
      .map(b => ({ ...b, label: formatShortDate(b.date) }));
    setData(rows);
  }, [days]);

  if (!data.length) {
    return (
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
        <p className="text-sm font-semibold text-slate-100 mb-2">Macros</p>
        <p className="text-zinc-500 text-sm text-center py-8">No food logged in range</p>
      </div>
    );
  }

  const avgs = MACROS.map(m => ({
    ...m,
    avg: Math.round(data.reduce((s, d) => s + d[m.key], 0) / data.length),
    target: targets?.[m.key === 'fats' ? 'fat' : m.key] ?? null,
  }));

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <p className="text-sm font-semibold text-slate-100 mb-2">Macros</p>
      <div className="flex gap-4 mb-3">
        {avgs.map(m => (
          <p key={m.key} className="text-xs font-bold" style={{ color: m.color }}>
            {m.label} avg {m.avg}g{m.target ? <span className="text-zinc-500 font-normal"> / {m.target}g</span> : null}
          </p>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} minTickGap={30} />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} width={35} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#27272a' }} />
          <Bar dataKey="protein" stackId="m" fill="#10b981" />
          <Bar dataKey="carbs" stackId="m" fill="#60a5fa" />
          <Bar dataKey="fats" stackId="m" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
