'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { storage } from '@/lib/storage';
import { getDailyBalances, lastNDates, formatShortDate } from '@/lib/trends';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm">
      <p className="text-blue-400 font-semibold">{p.steps.toLocaleString()} steps</p>
      <p className="text-emerald-400 font-semibold">{Math.round(p.active)} active kcal</p>
      <p className="text-zinc-400">{p.label}</p>
    </div>
  );
}

export default function ActivityChart({ days = 30 }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const dates = lastNDates(days || 90);
    const balances = getDailyBalances(dates, null);
    const rows = dates.map((date, i) => ({
      date,
      label: formatShortDate(date),
      steps: storage.getSteps(date) ?? 0,
      active: balances[i].active,
    })).filter(d => d.steps || d.active);
    setData(rows);
  }, [days]);

  if (!data.length) {
    return (
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
        <p className="text-sm font-semibold text-slate-100 mb-2">Steps & Activity</p>
        <p className="text-zinc-500 text-sm text-center py-8">No activity synced yet</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <p className="text-sm font-semibold text-slate-100 mb-3">Steps & Activity</p>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} minTickGap={30} />
          <YAxis yAxisId="steps" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={40} />
          <YAxis yAxisId="active" orientation="right" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={35} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#27272a' }} />
          <Bar yAxisId="steps" dataKey="steps" fill="#3b82f6" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          <Line yAxisId="active" type="monotone" dataKey="active" stroke="#10b981" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
