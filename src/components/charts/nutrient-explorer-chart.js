'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { getMicronutrientTargets, getDailyNutrientTotals, lastNDates, formatShortDate } from '@/lib/trends';

export default function NutrientExplorerChart({ days = 30, healthProfile }) {
  const [nutrientKey, setNutrientKey] = useState('fiber');
  const [data, setData] = useState([]);

  const nutrients = getMicronutrientTargets(healthProfile);
  const nutrient = nutrients.find(m => m.key === nutrientKey);

  useEffect(() => {
    const rows = getDailyNutrientTotals(lastNDates(days || 90), nutrientKey)
      .filter(d => d.value > 0)
      .map(d => ({ ...d, label: formatShortDate(d.date) }));
    setData(rows);
  }, [days, nutrientKey]);

  const avg = data.length
    ? Math.round((data.reduce((s, d) => s + d.value, 0) / data.length) * 10) / 10
    : null;

  const barColor = (v) => {
    if (nutrient.limit) return v > nutrient.rda ? '#ef4444' : '#10b981';
    return v >= nutrient.rda ? '#10b981' : '#f59e0b';
  };

  function ChartTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3 py-2 text-sm">
        <p className="font-semibold" style={{ color: barColor(p.value) }}>
          {p.value}{nutrient.unit} <span className="text-[var(--text-tertiary)]">/ {nutrient.rda}{nutrient.unit}</span>
        </p>
        <p className="text-[var(--text-secondary)]">{p.label}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] shrink-0">Nutrient Explorer</p>
        <select
          value={nutrientKey}
          onChange={e => setNutrientKey(e.target.value)}
          className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3 py-1.5 text-[var(--text-primary)] text-xs font-semibold focus:outline-none focus:border-emerald-500"
        >
          {nutrients.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] mb-3">
        {nutrient.limit ? 'Limit' : 'Target'}: {nutrient.rda}{nutrient.unit}/day
        {avg != null && <> · avg {avg}{nutrient.unit}</>}
      </p>

      {!data.length ? (
        <p className="text-[var(--text-tertiary)] text-sm text-center py-8">
          No {nutrient.label.toLowerCase()} data in range — log foods with this nutrient to see it here
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} minTickGap={30} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} width={40} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#27272a' }} />
            <ReferenceLine y={nutrient.rda} stroke={nutrient.limit ? '#ef4444' : '#71717a'} strokeDasharray="4 4" />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {data.map(d => (
                <Cell key={d.date} fill={barColor(d.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
