'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { storage } from '@/lib/storage';
import { getDailyBalances, lastNDates, formatShortDate } from '@/lib/trends';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3 py-2 text-sm">
      <p className="text-blue-400 font-semibold">{p.steps.toLocaleString()} steps</p>
      <p className="text-emerald-400 font-semibold">{Math.round(p.active)} active kcal</p>
      <p className="text-[var(--text-secondary)]">{p.label}</p>
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
      <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Steps & Activity</p>
        <p className="text-[var(--text-tertiary)] text-sm text-center py-8">No activity synced yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Steps & Activity</p>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} minTickGap={30} />
          <YAxis yAxisId="steps" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={40} />
          <YAxis yAxisId="active" orientation="right" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={35} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#27272a' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span style={{ color: '#a1a1aa' }}>{v}</span>} />
          <Bar yAxisId="steps" dataKey="steps" name="Steps" fill="#3b82f6" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          <Line yAxisId="active" type="monotone" dataKey="active" name="Active kcal" stroke="#10b981" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
